# План исправления узких мест БД — UzProc

> Основано на [db-performance-audit.md](./db-performance-audit.md). Порядок волн — от самого дешёвого/безопасного к дорогому.
> Легенда effort: **S** ≤ пары часов · **M** ≤ дня · **L** — несколько дней/рефакторинг.
> Каждая задача: **что → где → как → проверка**. Отмечайте `[x]` по мере выполнения.

## Как измерять эффект (обязательный baseline перед стартом)
1. Включить `datasource-proxy` или временно `p6spy`, либо на dev использовать существующий SQL-лог — **посчитать число SQL на ключевые эндпойнты** до/после:
   - `GET /api/purchase-requests?size=100`
   - `GET /api/purchases?size=50` и метаданные (`size=10000`)
   - `GET /api/contracts?size=50`
   - `GET /api/overview/purchase-plan-months`, `/overview/kpi/savings`, `/overview/ek`
2. Снять `EXPLAIN (ANALYZE, BUFFERS)` на **prod-объёме** для запросов, под которые планируются индексы.
3. Метрика приёмки для листингов: **число SQL не зависит от `size`** (константа, не линия).

---

## Волна 0 — Глобальный конфиг ✅ ВЫПОЛНЕНО (2026-07-02)

- [x] **0.1. Отключить SQL-лог в prod** — убран хардкод из `logback-spring.xml`; уровни вынесены в yml: `application.yml` → `com.uzproc:INFO`, `org.hibernate.SQL:WARN`, `org.hibernate.orm.jdbc.bind:"OFF"`, `format_sql/use_sql_comments: ${...:false}`; `application-local.yml` → DEBUG/TRACE + `format_sql:true` для dev.
  *Проверено:* локально (профиль local) SQL-лог DEBUG активен; prod-профиль (application.yml) даёт WARN/OFF.

- [x] **0.2. `spring.jpa.open-in-view: false`** — `application.yml`.
  *Проверено:* smoke-тест listing/detail/overview (purchase-requests, purchases, contracts, deliveries, purchase-plan-items, procurements, overview/ek|savings|sla|contract-approvals-dashboard, детали) → **0 необработанных `LazyInitializationException`, 0 ответов 500 из-за lazy**. (LazyInit в логах — только штатные DEBUG из Excel-импортёров, обрабатываются по дизайну.)

- [x] **0.3. `hibernate.default_batch_fetch_size: 100`** — `application.yml`. Добавлен `@BatchSize(size=100)`: `Delivery.payments`, `Contract.suppliers`, сущность `Payment`.

- [x] **0.4. Hikari `leak-detection-threshold: 20000`** — `application.yml`. Пул не трогали.

- [x] **0.5. `statement_timeout=30000`** — `application.yml` → `hikari.data-source-properties.options`. Стартап прошёл без ошибок.

> Следующий шаг: замерить число SQL и время ответа на ключевых эндпойнтах в prod-профиле и зафиксировать дельту (baseline vs после).

---

## Волна 1 — Дешёвые точечные N+1/дубли ✅ ЧАСТИЧНО ВЫПОЛНЕНО (2026-07-02)

- [x] **1.1a. Дедуп `findDistinctStatus()`×2** — `PurchaseRequestService.java:1791` — один запрос в переменную `distinctStatuses`, переиспользован для `statuses`/`statusGroups`. ✓ проверено (`/unique-values` 200).
- [ ] **1.1b. Native purchaser-query ×2** — `PurchasePlanItemService.java:159-198`. ОТЛОЖЕНО (нужен аккуратный рефакторинг map-plumbing; native-запросы не покрываются batch-fetch — вернуться в связке с 3.x по плану закупок).

- [x] **1.2a. `SpecificationFeedback.invitation`** → `@EntityGraph({"invitation"})` на `findAllByOrderByUpdatedAtDesc`. ✓ (dashboard 200).
- [~] **1.2b/1.2d. `PurchasePlanVersion.cfo` / `PurchasePlanItem.cfo`** — ОТЛОЖЕНО осознанно: `default_batch_fetch_size:100` (Волна 0) уже батчит per-row `cfo` в `IN(...)`, доп. выигрыш от `@EntityGraph` мал; вернуться при рефакторинге `toDto` (Волна 3/4).

- [x] **1.3a. Центр отправки (`CfoLeader`)** — новый `findAllWithUser()` (JOIN FETCH) + `Map<cfoNameLower, CfoLeader>` до цикла (`SpecificationSendingService.java`). ✓ (9/9 ЦФО резолвят руководителя+email).
- [x] **1.3b. `CsiFeedbackService`** — `UserRepository.findByEmailIn` + `buildRecipientNameMap`, перегрузка `toDto(feedback, nameByEmail)`; применено в `findAll` и `findByPurchaseRequestId`. ✓ (41/50 строк резолвят имя).
- [x] **1.3c. Excel-план fuzzy-match** — `UserRepository.searchByFuzzyName(q, PageRequest)` (LIKE + LIMIT 1 в SQL) вместо `users.findAll()` в JVM на каждую строку. ✓ компилируется.
- [ ] **1.3d. `findUserByPurchaserName`** (`PurchasePlanItemService.java:2045-2099`) — ОТЛОЖЕНО (аналогичная замена на `searchByFuzzyName`/Map; сделать вместе с 1.1b).

- [x] **1.4. Индексная миграция** — `V146__Perf_indexes_for_filters_and_aggregates.sql`: 5 индексов на реально непокрытые колонки (`idx_pr_requires_status`, `idx_pr_creation_date`, `idx_pr_approvals_stage_assignment_sla` [partial], `idx_arrivals_incoming_lookup`, `idx_ppi_request_date`). Применена Flyway на старте, все созданы. Дубли/маргинальные (functional purchaser, covering-индексы) пропущены — по `EXPLAIN` на prod. ⚠️ проверить `EXPLAIN` на prod-объёме + прогон Excel-импорта.

- [x] **1.5. Фронтенд — карточка договора** `contract/[id]/page.tsx` — 3 зависимых fetch → `Promise.allSettled`. ✓ типы чистые. (`AbortController` — опционально, не добавлял.)

---

## Волна 2 — Агрегация в SQL вместо памяти (S–M) — ⏳ В ПРОЦЕССЕ (2026-07-02)

> Метод верификации: снять baseline ответа → изменить → сравнить. Для агрегатов, зависящих от **статуса** (мутирует при стартовом ре-импорте), сравнивать инварианты набора строк (кол-во + сумма), а не полное равенство между перезапусками.

- [x] **2.1a. `PurchaseService.getMonthlyStats`** (`:488-565`) → 2 агрегата `countByMonthForPeriod` / `countByMonthForPeriodAndStatus` (`GROUP BY EXTRACT(MONTH…)`). ✓ **сверено идентично** за 2024/2025/2026.
- [x] **2.1b. `PurchasePlanItemService.getMonthlyStats`/`getMonthlyDistribution`** → проекция только `requestDate` через `findRequestDates(spec)` (Criteria) вместо гидрации полных сущностей; Java-бакетинг без изменений. ✓ **байт-идентично** за 2024/2025/2026 (оба эндпойнта).

- [x] **2.2a. `getAvailableYears`** (`:1837`) → `findDistinctCreationYears[RequiringPurchase]()` (DISTINCT в SQL). ✓ сверено идентично.
- [x] **2.2b. `get*StatsByPurchaser`** (`:1632-1685`) → фильтры (год + requiresPurchase + непустой purchaser) проброшены в SQL через `statsByPurchaserSpec`; Java-агрегация без изменений. ✓ набор строк идентичен (`total`+`totalAmount` совпали; `active`-дрейф — мутация статусов на старте, не код).
- [x] **2.2c. `getYearlyStats`** (`:1830`) → 3× `GROUP BY` по году (`countPending/Purchases/OrdersByCreationYear`) вместо `findAll()` всей таблицы. ✓ годы и итог по годам идентичны (бакеты — дрейф статусов).

- [x] **2.3a. Договоры tab-counts** — новый `GET /api/contracts/tab-counts` (`ContractService.getTabCounts`: 5× `count(buildSpecification)` без обогащения дат) вместо 5×`/contracts?size=1`; фронт (`useContractTabCounts.ts`) переведён на один вызов. ✓ **счётчики сверены идентично** (без фильтров и `year=2026`).
- [~] **2.3b. Заявки tab-counts** — ОТЛОЖЕНО: это 4 COUNT-запроса (не загрузка строк); их стоимость снята индексами из 1.4 (`idx_pr_requires_status`, `idx_pr_approvals_stage_assignment_sla`). Полный GROUP BY-CASE рискован (буферы отличаются доп. предикатом `excludeFromInWork`) и низко-ценен после индексов.

- [ ] **2.4. Overview savings/KPI/EK → WHERE + проекции** (`OverviewService`) — НЕ СДЕЛАНО. ⚠️ Самый correctness-sensitive блок (конвертация валют, сложные фильтры) — делать отдельным проходом с golden-сравнением по инвариантам (суммы/кол-во), т.к. полное равенство между перезапусками ломает дрейф данных.

---

## Волна 3 — N+1 в листингах и «запись во время чтения» (M, 3–6 дней; тестировать тщательно)

- [ ] **3.1. Убрать синхронизацию закупщиков из read-листинга** `PurchasePlanItemService.java:205-273`
  Убрать `syncPurchasersInBatch` из `findAll` (266-273); закупщика для DTO считать в памяти из `purchaseRequestPurchaserMap`. Авторитетную синхронизацию — на write-path (при изменении закупщика заявки) или в scheduled/async-джоб.
  *Проверка:* `GET` листинга плана не порождает `UPDATE`/`REQUIRES_NEW`.

- [ ] **3.2. `PurchaseService.toDto` + `ContractService.toDto` → `@EntityGraph` + батч**
  - `PurchaseService.java:170-178` → листинг с `@EntityGraph({"purchaseRequest","cfo"})`; `approvalDate` — один `SELECT purchaseRequestId, MAX(completionDate) … GROUP BY`.
  - `ContractService.java:109,893-963` → `@EntityGraph({"cfo","purchaseRequest","preparedBy"})`; `parentContract` — distinct `findAllById` по странице → `Map` + `toDtoShallow`; `suppliers` — `@BatchSize`/батч.

- [ ] **3.3. `updateAllStatuses` — bulk вместо `REQUIRES_NEW`/re-fetch**
  - `ContractStatusUpdateService.java:172-228` → чистый `computeStatus(state)`, сравнение в памяти, bulk-UPDATE пачками 50-100 (`flush/clear`), без `REQUIRES_NEW`.
  - `PurchaseStatusUpdateService.java:156-195` → по distinct `purchaseRequestId`, `findByPurchaseRequestIdIn` пачками 500, статус в памяти, `@Modifying UPDATE`; убрать re-fetch 174.
  - `PurchaseRequestStatusUpdateService.java:507-538,175-238` → `updateStatus` вернуть кол-во изменённых (убрать re-fetch 521-522); 5 native COUNT → один `GROUP BY status`; purchases грузить один раз.
  *Проверка:* пересчёт всех статусов = O(1) транзакций + пачки UPDATE, число SQL не линейно по числу сущностей.

- [ ] **3.4. Лёгкие endpoint-ы вместо фронтового `size=10000`** `usePurchasesData.ts:31-69`
  Добавить `GET /api/purchases/purchasers` (реюз `findDistinctPurchaser()`) и `GET /api/purchases/years` (`SELECT DISTINCT EXTRACT(YEAR…)`), убрать `?size=10000`.

- [ ] **3.5. Прочие N+1 (M)**
  - `InvoiceService.java:35-95` → batch arrival по ключам `(number,date)` → `Map`.
  - После устранения N+1 — рассмотреть `maximum-pool-size` 15-20 (с учётом `max_connections`/pgbouncer).

---

## Волна 4 — Крупные рефакторинги (L, по мере ресурса)

- [ ] **4.1. `PurchaseRequestService.toDto` (H0/H0b)** `:734-975`
  Батч-пайплайн: собрать все id страницы, по одному `*In`-запросу на связь (`findByIdPurchaseRequestIn`, `findByPurchaseRequestIdIn`), убрать вложенный `findByInnerId`. Разделить `PurchaseRequestListDto` (скаляры + SLA батч-агрегатами) и тяжёлую карточку `/{id}`.

- [ ] **4.2. `OverviewService.buildMonthBlock` (H0c)** `:811-835`
  Переписать per-CFO цикл на `findEntities(...)` (не `findAll().map(toDto)`), скаляры с сущности; `requestsByCfo/sumByCfo` — `GROUP BY cfo`; `total` из `Page`. Аналогично `getVersionItems` — `findByVersionIdAndRequestDateBetween` + индекс `(version_id, request_date)`.

- [ ] **4.3. Payment Excel-импорт** `PaymentExcelLoadService.java:101-218,456-644`
  `PaymentBatchSaver` (паттерн `ArrivalBatchSaver`: `REQUIRES_NEW`, 500 строк, `flush/clear`); убрать file-wide `@Transactional`; предзагрузка CFO/users в `Map`; сменить id-генерацию Payment IDENTITY → SEQUENCE (pooled) для реального JDBC-батча; persisted+indexed `normalized_title` на contracts (populate + backfill-миграция) вместо regex-full-scan.

- [ ] **4.4. `ContractService` дашборды длительности (L1)** `:510-740`
  Пред-агрегат `contract_approvals` в один CTE (`MIN/MAX FILTER`) + `LEFT JOIN`; вынести дублирующуюся конструкцию в один параметризуемый запрос.

---

## Правила безопасного внедрения
- **По одной волне за PR/деплой**, с замером до/после — чтобы отнести регресс к конкретной правке.
- `open-in-view: false` и индексы — самые «неожиданные»: первый вскрывает LazyInit, вторые могут замедлить bulk-import → отдельный прогон Excel-загрузок.
- Не поднимать пул Hikari до устранения N+1 — иначе просто маскируется проблема.
- Excel-импорт и `updateAllStatuses` — прогонять на реальном объёме (staging с prod-бэкапом).
- После каждой волны: `mvn test`, ручная проверка затронутых страниц, замер SQL-каунтеров.
