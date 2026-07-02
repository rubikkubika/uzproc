# Аудит узких мест БД — UzProc

> Дата: 2026-07-02. Метод: многоагентный аудит (рубрика лучших практик → параллельный аудит 9 модулей + 3 кросс-срезов → адверсариальная верификация каждой находки по коду → синтез).
> Результат верификации: **55 подтверждённых находок** — 0 critical, **14 High, 26 Medium, 15 Low**.

## 1. Резюме
Критических проблем нет, но есть **системный паттерн**: тяжёлые чтения (дашборды `OverviewService`, статистики, сводки) грузят целые таблицы и агрегируют/фильтруют по году в Java вместо SQL `GROUP BY`, а листинги (`toDto` заявок/закупок/договоров/поставок) дают **N+1** из-за LAZY-связей и per-row подзапросов. Всё это усилено двумя глобальными факторами: **SQL-логирование в prod на DEBUG/TRACE** (`logback-spring.xml`, переопределяет `application.yml`) и **`open-in-view=true`**, из-за которого соединение из пула (**всего 10**) держится весь рендер. Самый дешёвый максимальный выигрыш — «Волна 0» (правки конфига). Опасные под нагрузкой — `updateAllStatuses` (полный `findAll` + `findById`/`REQUIRES_NEW` в цикле) и синхронизация закупщиков **внутри read-запроса** плана.

## 2. Быстрые победы (высокий эффект / низкий effort)

| Находка | Файл | Эффект | Effort |
|---|---|---|---|
| Prod SQL-логи DEBUG/TRACE → профиль WARN/OFF | `logback-spring.xml:49-50` | −сотни/тысячи лог-строк на запрос, I/O, риск утечки email/ИНН | S |
| `open-in-view: false` | `application.yml` | соединение освобождается на границе транзакции | S |
| `default_batch_fetch_size: 100` + `@BatchSize` | `application.yml`, entities | глобально схлопывает N+1 в `IN(...)` без переписывания `toDto` | S |
| `leak-detection-threshold: 20000` | `application.yml:10-15` | диагностика утечек соединений, zero-risk | S |
| `@EntityGraph`/JOIN FETCH: `SpecificationFeedback.invitation`, `CfoLeader.user`, `PurchasePlanItem.cfo` | соотв. сервисы | −N запросов на листинг | S |
| `CsiFeedback` → `findByEmailIn` (batch) | `CsiFeedbackService.java:495-507` | убирает N SELECT users | S |
| Дедуп `findDistinctStatus()`×2, native purchaser-query×2 | `PurchaseRequestService:1791`, `PurchasePlanItemService:159-198` | −лишние запросы/вызов | S |
| Фронт: карточка договора — `Promise.all` | `contract/[id]/page.tsx:140-188` | −~300 мс | S |
| Фронт: убрать `?size=10000` ради справочников | `usePurchasesData.ts:31-69` | −10000+ SELECT на маунт | M |

## 3. Находки по критичности

### HIGH

**H0. N+1 в `PurchaseRequestService.toDto` — ~8 SQL на КАЖДУЮ заявку (главный источник деградации листинга)**
`n+1 · PurchaseRequestService.java:734-975 (из findAll→toDto:135-140) · effort L`
`GET /api/purchase-requests` при `size=100` → ~800-1200+ SQL: на каждую строку `approvalRepository.findByIdPurchaseRequest` (790), `purchaseApprovalRepository.findByPurchaseRequestId` (802), `purchaseRepository.findByPurchaseRequestId` (838), `contractRepository.findByPurchaseRequestId` (852), вложенный `contractRepository.findByInnerId` по каждому договору каждой закупки (861), contractApprovals, CSI-агрегаты, `existsByPurchaseRequestId` (968). → батч-пайплайн на уровне страницы: собрать все id один раз, по одному `*In`-запросу на связь → `Map`, строить DTO из карт без запросов в цикле.

**H0b. Тяжёлый полный DTO вместо проекции на листинге заявок**
`projection · PurchaseRequestService.java:734-975 · effort L`
`toDto` наполняет вложенные `ContractDto`, `purchaseIds`, CSI-агрегаты, `hasLinkedPlanItem` на КАЖДУЮ строку. → разделить `PurchaseRequestListDto` (скаляры + предвычисленные SLA/даты батч-агрегатами) и тяжёлую карточку `/{id}`. Рассмотреть JPQL `new DTO(...)` / интерфейсные проекции.

**H0c. `buildMonthBlock` вызывает `findAll().map(toDto)` — N+1 × до 2000 строк × число месяцев**
`n+1 · OverviewService.java:811-835, 876-883 · effort M`
`/overview/purchase-plan-months`: на каждый месяц `findAll(0, min(count,2000)).map(toDto)` (~8 SQL/строку). За год — десятки тысяч SQL/запрос. → `purchaseRequestService.findEntities(...)` + скаляры с сущности; агрегаты `requestsByCfo/sumByCfo` — одним `GROUP BY cfo`; убрать отдельный count (брать `total` из `Page`).

**H1. N+1 при листинге договоров — parentContract + suppliers per-row**
`n+1 · backend/.../contract/ContractService.java (findAll/toDto)`
Резолвить distinct-родителей одним `findAllById` по странице; коллекцию `suppliers` — `@BatchSize` или второй батч-запрос по id страницы.

**H2. N+1 в `PurchaseService.toDto` — SELECT согласований на каждую закупку**
`n+1 · PurchaseService.java:170-178, 74-81`
`purchases.map(this::toDto)` → `findByPurchaseRequestId` + max в памяти на строку + LAZY `purchaseRequest` per-row. При `size=50` ~101 запрос; фронт грузит `size=10000` → 10000+ SELECT. → листинг с `@EntityGraph({"purchaseRequest","cfo"})`; `approvalDate` — один bulk `GROUP BY`.

**H3. N+1 на коллекции `payments` при листинге доставок**
`n+1 · DeliveryService.java:137-155, 831-838`
`toDtoCore` читает LAZY `getPayments()` на каждую строку. → `@BatchSize(100)` на `Delivery.payments` (не добавлять в `@EntityGraph` — иначе in-memory pagination), симметрично на `Payment`.

**H4. `updateAllStatuses` (contracts): полный `findAll` + 2×`findById`/итерация + `REQUIRES_NEW`**
`n+1 · ContractStatusUpdateService.java:172-228`
`1 + 2K findById + K UPDATE`, K транзакций на пул 10. → чистый `computeStatus(state)` в памяти, сравнение `oldStatus` без `findById`, bulk-UPDATE пачками без `REQUIRES_NEW`.

**H5. Листинг плана закупок пишет в БД на каждый read-запрос**
`connection-tx · PurchasePlanItemService.java:205-273`
`readOnly findAll` вызывает `syncPurchasersInBatch` → per-item `syncPurchaserInNewTransaction` (SELECT+UPDATE+logChange). → убрать синк из `findAll` (считать закупщика в памяти для DTO), перенести на write-path/джоб.

**H6. `getKpiSavingsData`/`getSavingsPurchaseDetails`: все COMPLETED + фильтр года/месяца в памяти**
`in-memory-filtering · OverviewService.java:1638,1670-1677,1930,1961-1969`
Стоимость не зависит от узости фильтра. → закупщика в WHERE (`cb.equal`), год/месяц по дате комиссии — EXISTS-подзапрос к `purchase_approvals`, суммы — SQL-агрегат.

**H7. `getEkChartData`: до 50 000 заявок в память для агрегации по ЦФО**
`in-memory-filtering · OverviewService.java:942,965-1035`
`pageSize=50_000` + `addAll` всех страниц + группировка в Java; за 50k молча обрежет. → `SELECT cfoName, currency, COUNT(*), SUM(budget) ... GROUP BY cfo, currency`.

**H8. Фронтенд грузит весь датасет закупок (`size=10000`) ради справочников**
`missing-pagination · usePurchasesData.ts:31-69`
→ лёгкие `GET /api/purchases/purchasers` и `/api/purchases/years` (примитивы), убрать `size=10000`.

**H9. SQL-логирование включено в prod (кластер из 8 находок)**
`logging · logback-spring.xml:49-50`
`org.hibernate.SQL=DEBUG` + `BasicBinder=TRACE` безусловно, переопределяет `application.yml`; на N+1-путях сотни-тысячи строк + риск утечки email/ИНН. *(show-sql в prod уже false через docker-compose.)* → обернуть в `<springProfile>`, prod → WARN/OFF; `BasicBinder` (dead в Hibernate 6) → `org.hibernate.orm.jdbc.bind`.

### MEDIUM
- **M1. План: LAZY cfo/purchaser через side-запросы** `PurchasePlanItemService.java:115-198,321-330` → `@EntityGraph({"cfo"})`.
- **M2. `getMonthlyDistribution/getMonthlyStats` (план): весь датасет ради гистограммы** `:1759-1848` → `GROUP BY EXTRACT(...)`.
- **M3. `getMonthlyStats` (purchases): 2 полных `findAll` (вкл. jsonb) ради 24 чисел** `PurchaseService.java:507-559` → 2 агрегата `GROUP BY`.
- **M4. tab-counts заявок: 4 COUNT с approval-подзапросом** `PurchaseRequestService.java:281-361` → один `GROUP BY bucket`.
- **M5. `getCompletedPurchaserSummary`: все COMPLETED за всю историю + full approvals/feedbacks** `:457-643` → сперва prIds года native-агрегатом, затем батч.
- **M6. `getSavingsData`: дважды грузит все COMPLETED + 2 пересекающихся `IN`** `OverviewService.java:1384-1472` → один `findAll` + один `findByPurchaseRequestIdIn`; год в SQL.
- **M7. `updateAllStatuses` (requests): re-fetch + 5 native COUNT на заявку** `PurchaseRequestStatusUpdateService.java:507-538,175-238` → вернуть кол-во изменённых, 5 COUNT → один `GROUP BY`.
- **M8. `updateAllStatuses` (purchases): N+1 + `REQUIRES_NEW` на закупку** `PurchaseStatusUpdateService.java:156-195` → по distinct prId, `findByPurchaseRequestIdIn`, bulk-UPDATE.
- **M9. `getYearlyStats/getAvailableYears/*StatsByPurchaser`: `findAll()` всей таблицы** `:1632-1889` → агрегатные JPQL.
- **M10. `findUserByPurchaserName`: `users.findAll()` на каждый unmatched item** `PurchasePlanItemService.java:2045-2099` → `Map` один раз/запрос, лучше `@Cacheable`.
- **M11. `getVersionItems`: все позиции версии + фильтр месяца в памяти** `:160-183` → `findByVersionIdAndRequestDateBetween` + индекс `(version_id, request_date)`.
- **M12. Payment Excel-импорт: file-wide транзакция + per-row lookup + IDENTITY блокирует батч** `PaymentExcelLoadService.java:101-218` → `PaymentBatchSaver` (`REQUIRES_NEW`, 500, flush/clear), SEQUENCE-id.
- **M13. Excel-план: `users.findAll()` на каждую строку** `PurchasePlanExcelLoadService.java:587-602` → `Map` один раз.
- **M14. Payment: `findFirstByNormalizedTitle` regex-full-scan per-row** `:247-259,456-644` → persisted+indexed `normalized_title`.
- **M15. N+1 справочник рук. ЦФО в цикле (Центр отправки)** `SpecificationSendingService.java:143-186` → `JOIN FETCH l.user` + `Map`.
- **M16. N+1 `InvoiceService.findByContractId` → arrival на каждый счёт** `:35-95` → batch по ключам `(number,date)`.
- **M17. `parentContract` через `findById` на каждую спецификацию** `ContractService.java:919-929` → батч + `toDtoShallow`.
- **M18. HikariCP=10 при OSIV** `application.yml:10-15` → `open-in-view:false`, `leak-detection`, пул 15-20 только после N+1.
- **M19. N+1 `SpecificationFeedbackService.getDashboard()`** `:38-69` → `@EntityGraph({"invitation"})`.
- **M20. N+1 `CsiFeedbackService.toDto` (`findFirstByEmail`)** `:495-507` → `findByEmailIn`.
- **M21. `open-in-view` не выключен** `application.yml:17-33` → `false` (проверить `ResponseEntity<?>` на LazyInit).

### LOW
- **L1. `getApprovalsDashboard`/`getApprovalDurationByMonth`: 2 коррелированных подзапроса на договор** `ContractService.java:510-740` → пред-агрегат CTE + `LEFT JOIN`.
- **L2. Version items без пагинации + cfo N+1** `PurchasePlanVersionService.java:160-183` → `@EntityGraph({"cfo"})`.
- **L3. Дубли в одном HTTP-вызове:** native purchaser-query ×2 (`PurchasePlanItemService:159-198`), `findDistinctStatus()` ×2 (`PurchaseRequestService:1791-1799`).
- **L4. Фронт: 5×`/contracts?size=1` ради `totalElements`** `useContractTabCounts.ts` → эндпойнт `/tab-counts` (`COUNT FILTER`).
- **L5. Фронт: waterfall 4 fetch на карточке договора** `contract/[id]/page.tsx:140-188` → `Promise.allSettled` + `AbortController`.

## 4. Индексы к добавлению
> Только после `EXPLAIN (ANALYZE, BUFFERS)` на prod-объёме: на таблицах < ~10k строк планировщик оставит Seq Scan, а индексы замедляют Excel-bulk-import. `status` — не добавлять без проверки селективности.

```sql
CREATE INDEX IF NOT EXISTS idx_pr_requires_status ON purchase_requests (requires_purchase, status);
CREATE INDEX IF NOT EXISTS idx_pr_creation_date   ON purchase_requests (purchase_request_creation_date);
CREATE INDEX IF NOT EXISTS idx_pr_purchaser_lower ON purchase_requests (lower(purchaser) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_pr_approvals_stage_assignment_sla
    ON purchase_request_approvals (stage, assignment_date) WHERE counted_in_sla = true;
CREATE INDEX IF NOT EXISTS idx_pr_approvals_cover
    ON purchase_request_approvals (id_purchase_request, stage, assignment_date, completion_date) WHERE counted_in_sla = true;
CREATE INDEX IF NOT EXISTS idx_arrivals_incoming_lookup ON arrivals (incoming_number, incoming_date);
CREATE INDEX IF NOT EXISTS idx_ppi_request_date ON purchase_plan_items (request_date);
CREATE INDEX IF NOT EXISTS idx_contract_approvals_contract_dates ON contract_approvals (contract_id, assignment_date, completion_date);
```

## 5. Глобальный конфиг
- **Логи (`logback-spring.xml:49-50`):** обернуть `org.hibernate.SQL`/binder в `<springProfile>`, prod → WARN/OFF; в `application.yml` — `format_sql:false`, `use_sql_comments:false`, `com.uzproc:INFO`.
- **`spring.jpa.open-in-view: false`** (проверить `ResponseEntity<?>`-эндпойнты на LazyInit).
- **`hibernate.default_batch_fetch_size: 100`** + `@BatchSize(100)` на `Delivery.payments`, `Payment`, `Contract.suppliers`.
- **Hikari:** `leak-detection-threshold: 20000`; пул 15-20 только после устранения N+1.
- **`statement_timeout=30000`** как страховка от повисших full-scan.

## 6. Фронтенд
- Карточка договора: 4 последовательных fetch → `Promise.allSettled` + `AbortController`.
- `usePurchasesData`: убрать `size=10000` → лёгкие endpoint-ы справочников.
- `useContractTabCounts`: 5 запросов → один `/api/contracts/tab-counts`; стабилизировать deps хука.
- Debounce: явных нарушений нет; стандарт из CLAUDE.md соблюдать для новых таблиц.

## 7. Методологические оговорки
- Индексы добавлять **только** после `EXPLAIN (ANALYZE, BUFFERS)` на prod-объёме данных.
- `open-in-view: false` может вскрыть `LazyInitializationException` — прогнать локально по всем эндпойнтам, собирающим DTO из LAZY-связей.
- Оценки объёмов ориентировочны; приоритет внутри волн — по паре «эффект/effort».

См. пошаговый план внедрения: [db-performance-fix-plan.md](./db-performance-fix-plan.md).
