package com.uzproc.backend.service.purchaseplan;

import com.uzproc.backend.entity.Company;
import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.contract.ContractStatus;
import com.uzproc.backend.entity.contract.CustomerOrganization;
import com.uzproc.backend.entity.purchaseplan.PurchasePlanItem;
import com.uzproc.backend.entity.purchaseplan.PurchasePlanItemStatus;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.dto.purchaseplan.PurchasePlanItemDto;
import com.uzproc.backend.repository.contract.ContractRepository;
import com.uzproc.backend.repository.purchaseplan.PurchasePlanItemRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
import com.uzproc.backend.service.user.CurrentUserService;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.BiConsumer;
import java.util.stream.Collectors;

/**
 * Генерация драфта плана закупок из действующих договоров.
 *
 * Отбираются договоры и связанные с заявкой на закупку доп. соглашения (без спецификаций и прочих форм
 * документов) организации-заказчика Uzum Market в статусе «Подписан», срок действия которых заканчивается
 * начиная с октября года, предшествующего году планирования, либо в течение самого года планирования.
 * Для года планирования 2027 это диапазон 01.10.2026 — 31.12.2027.
 * Осенние договоры включены потому, что перезакупка по ним приходится уже на год планирования.
 * ДС нужны потому, что продлевают срок договора, а связь ДС с основным договором в данных отсутствует:
 * без ДС договор, продлённый на год планирования, отсекается по своей исходной дате окончания.
 * ДС, продлевающее уже отобранный договор (та же заявка и тот же поставщик), в драфт не попадает — иначе дубль.
 *
 * Аналитика позиции драфта заполняется из договора и (при наличии) из связанной заявки на закупку.
 * По договорам с признаком «Исключён из планирования» новые позиции не создаются.
 *
 * Позиции драфта не удаляются: очистка их скрывает, а повторное формирование возвращает позицию
 * по тому же договору с тем же id (вместе с историей изменений и комментариями). Поля возвращённой позиции
 * заполняются заново из договора, кроме изменённых вручную — ручные правки (по истории изменений) сохраняются.
 * Позиция, исключённая «глазиком», тоже возвращается — исключённой.
 */
@Service
public class PurchasePlanDraftService {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanDraftService.class);

    /** Форма документа, соответствующая договору (исключает ДС, спецификации, приложения и т.д.) */
    private static final String DOCUMENT_FORM_CONTRACT = "Договор";

    /** Форма документа доп. соглашения: в драфт попадает, только если связано с заявкой на закупку */
    private static final String DOCUMENT_FORM_ADDITIONAL_AGREEMENT = "Дополнительное соглашение";

    /**
     * ЦФО, исключаемые из драфта: коммерческие подразделения (Commerce 1Р, 3Р, SR, FMCG,
     * Fashion, Electronics), фотостудия и B2B планируют закупки отдельно.
     * Сравнение — по вхождению подстроки в наименование ЦФО без учёта регистра.
     */
    private static final List<String> EXCLUDED_CFO_NAME_PARTS = List.of("commerce", "photostudio", "b2b");

    /** За сколько дней до окончания текущего договора подаётся заявка на закупку (стартовая раскладка Ганта) */
    private static final int DEFAULT_REQUEST_LEAD_DAYS = 90;

    /**
     * Месяц года, предшествующего году планирования, с которого начинается окно отбора договоров.
     * Октябрь: договоры, истекающие осенью, перезакупаются уже в году планирования.
     */
    private static final int DRAFT_WINDOW_START_MONTH = 10;

    /** Сложность по умолчанию, если её не удалось взять из связанной заявки на закупку */
    private static final String DEFAULT_COMPLEXITY = "2";

    /**
     * Поля позиции, редактируемые вручную: имя поля в истории изменений → перенос значения между позициями
     * (from → to). Значения, записанные вместе с полем (кто и когда отметил, исключил), переносятся вместе с ним.
     * При добавлении нового ручного поля в PurchasePlanItemService его нужно добавить и сюда.
     */
    private static final Map<String, BiConsumer<PurchasePlanItem, PurchasePlanItem>> MANUAL_FIELDS = Map.ofEntries(
            Map.entry("requestDate", (from, to) -> to.setRequestDate(from.getRequestDate())),
            Map.entry("newContractDate", (from, to) -> to.setNewContractDate(from.getNewContractDate())),
            Map.entry("contractEndDate", (from, to) -> to.setContractEndDate(from.getContractEndDate())),
            Map.entry("status", (from, to) -> {
                to.setStatus(from.getStatus());
                to.setExcludedFromPlanningAt(from.getExcludedFromPlanningAt());
                to.setExcludedFromPlanningBy(from.getExcludedFromPlanningBy());
            }),
            Map.entry("holding", (from, to) -> to.setHolding(from.getHolding())),
            Map.entry("comment", (from, to) -> to.setComment(from.getComment())),
            Map.entry("company", (from, to) -> to.setCompany(from.getCompany())),
            Map.entry("purchaserCompany", (from, to) -> to.setPurchaserCompany(from.getPurchaserCompany())),
            Map.entry("purchaseRequestId", (from, to) -> to.setPurchaseRequestId(from.getPurchaseRequestId())),
            Map.entry("purchaser", (from, to) -> to.setPurchaser(from.getPurchaser())),
            Map.entry("budgetAmount", (from, to) -> to.setBudgetAmount(from.getBudgetAmount())),
            Map.entry("complexity", (from, to) -> to.setComplexity(from.getComplexity())),
            Map.entry("purchaseSubject", (from, to) -> to.setPurchaseSubject(from.getPurchaseSubject())),
            Map.entry("cfo", (from, to) -> to.setCfo(from.getCfo())),
            Map.entry("purchaserChecked", (from, to) -> {
                to.setPurchaserChecked(from.getPurchaserChecked());
                to.setPurchaserCheckedAt(from.getPurchaserCheckedAt());
                to.setPurchaserCheckedBy(from.getPurchaserCheckedBy());
            })
    );

    private final ContractRepository contractRepository;
    private final PurchasePlanItemRepository purchasePlanItemRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final ProcurementLeadTimeService procurementLeadTimeService;
    private final PurchasePlanItemService purchasePlanItemService;
    private final PurchasePlanItemChangeService purchasePlanItemChangeService;
    private final CurrentUserService currentUserService;

    public PurchasePlanDraftService(
            ContractRepository contractRepository,
            PurchasePlanItemRepository purchasePlanItemRepository,
            PurchaseRequestRepository purchaseRequestRepository,
            ProcurementLeadTimeService procurementLeadTimeService,
            PurchasePlanItemService purchasePlanItemService,
            PurchasePlanItemChangeService purchasePlanItemChangeService,
            CurrentUserService currentUserService) {
        this.contractRepository = contractRepository;
        this.purchasePlanItemRepository = purchasePlanItemRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.procurementLeadTimeService = procurementLeadTimeService;
        this.purchasePlanItemService = purchasePlanItemService;
        this.purchasePlanItemChangeService = purchasePlanItemChangeService;
        this.currentUserService = currentUserService;
    }

    /**
     * Формирует драфт плана закупок на указанный год из действующих договоров.
     * Позиции, уже созданные из того же договора, повторно не создаются — ручные правки не теряются.
     * Позиция, скрытая очисткой драфта, возвращается с тем же id и заполняется заново.
     *
     * @return сводка: сколько договоров отобрано, сколько позиций создано (включая возвращённые) и сколько пропущено
     */
    @Transactional
    public Map<String, Object> generateDraft(Integer year) {
        int planYear = year != null ? year : LocalDate.now().getYear() + 1;

        LocalDateTime from = LocalDate.of(planYear - 1, DRAFT_WINDOW_START_MONTH, 1).atStartOfDay();
        LocalDateTime to = LocalDate.of(planYear + 1, 1, 1).atStartOfDay();

        List<Contract> contracts = removeAmendmentsOfSelectedContracts(
                contractRepository.findAll(buildContractSpecification(from, to)));
        logger.info("Draft generation for year {}: selected {} contracts (end date {} .. {})",
                planYear, contracts.size(), from.toLocalDate(), to.toLocalDate().minusDays(1));

        // Позиции драфта этого года по договору-источнику, включая скрытые очисткой: не плодим дубли
        // и возвращаем позицию с тем же id
        Map<Long, PurchasePlanItem> existingBySourceContract = new HashMap<>();
        for (PurchasePlanItem item : purchasePlanItemRepository.findDraftItemsByYear(planYear)) {
            if (item.getSourceContractId() != null) {
                existingBySourceContract.putIfAbsent(item.getSourceContractId(), item);
            }
        }

        Map<Long, PurchaseRequest> purchaseRequestMap = loadPurchaseRequests(contracts);

        // Какие поля скрытых очисткой позиций менялись вручную — при возврате они не перезаписываются
        Map<Long, Set<String>> manualFieldsByItem = purchasePlanItemChangeService.getChangedFieldsByItemIds(
                existingBySourceContract.values().stream()
                        .filter(item -> Boolean.TRUE.equals(item.getDraftCleared()))
                        .map(PurchasePlanItem::getId)
                        .collect(Collectors.toList()));

        int created = 0;
        int restored = 0;
        int skipped = 0;
        List<PurchasePlanItem> toSave = new ArrayList<>();

        for (Contract contract : contracts) {
            if (contract.getId() == null) {
                skipped++;
                continue;
            }
            PurchasePlanItem existing = existingBySourceContract.get(contract.getId());
            if (existing != null && !Boolean.TRUE.equals(existing.getDraftCleared())) {
                skipped++;
                continue;
            }
            boolean excludedFromPlanning = Boolean.TRUE.equals(contract.getExcludedFromPlanning());
            if (existing == null && excludedFromPlanning) {
                // По договору, исключённому из планирования, новая позиция не создаётся
                skipped++;
                continue;
            }
            PurchaseRequest request = contract.getPurchaseRequestId() != null
                    ? purchaseRequestMap.get(contract.getPurchaseRequestId())
                    : null;
            if (existing != null) {
                // Позиция скрыта очисткой драфта — возвращаем её с тем же id и заполняем заново из договора,
                // сохраняя ручные правки
                Set<String> manualFields = manualFieldsByItem.getOrDefault(existing.getId(), Set.of());
                PurchasePlanItem manualValues = copyManualFields(existing, new PurchasePlanItem(), manualFields);
                resetForRegeneration(existing);
                fillDraftItem(existing, contract, request, planYear);
                copyManualFields(manualValues, existing, manualFields);
                recalculateNewContractDateIfNeeded(existing, manualFields);
                if (excludedFromPlanning) {
                    // Договор исключён «глазиком» — позиция возвращается исключённой
                    existing.setStatus(PurchasePlanItemStatus.NOT_ACTUAL);
                }
                toSave.add(existing);
                restored++;
            } else {
                toSave.add(buildDraftItem(contract, request, planYear));
                created++;
            }
        }

        if (!toSave.isEmpty()) {
            purchasePlanItemRepository.saveAll(toSave);
        }

        logger.info("Draft generation for year {}: created {}, restored {} (same id), skipped {} (already in draft)",
                planYear, created, restored, skipped);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("year", planYear);
        result.put("contractsSelected", contracts.size());
        result.put("created", created + restored);
        result.put("restored", restored);
        result.put("skipped", skipped);
        return result;
    }

    /**
     * Очищает драфт за указанный год: позиции скрываются, но не удаляются — при повторном формировании
     * позиция по тому же договору вернётся с тем же id (история изменений и комментарии сохраняются).
     *
     * @return количество скрытых позиций
     */
    @Transactional
    public int clearDraft(Integer year) {
        int planYear = year != null ? year : LocalDate.now().getYear() + 1;
        List<PurchasePlanItem> items = purchasePlanItemRepository.findDraftItemsByYear(planYear).stream()
                .filter(item -> !Boolean.TRUE.equals(item.getDraftCleared()))
                .collect(Collectors.toList());
        items.forEach(item -> item.setDraftCleared(Boolean.TRUE));
        purchasePlanItemRepository.saveAll(items);
        logger.info("Draft for year {} cleared: {} items hidden (rows are kept to preserve ids)", planYear, items.size());
        return items.size();
    }

    /**
     * «Глазик» у позиции драфта: исключает позицию из планирования (статус «Исключена») и помечает договор-источник
     * признаком «Исключён из планирования» — в новые драфты он не попадёт. Повторное нажатие возвращает позицию
     * в план и снимает признак с договора.
     *
     * @return обновлённая позиция или null, если позиция не найдена
     * @throws IllegalStateException если позиция не относится к драфту
     */
    @Transactional
    public PurchasePlanItemDto setExcludedFromPlanning(Long itemId, boolean excluded) {
        PurchasePlanItem item = purchasePlanItemRepository.findById(itemId).orElse(null);
        if (item == null) {
            return null;
        }
        if (!Boolean.TRUE.equals(item.getIsDraft())) {
            throw new IllegalStateException("Исключить из планирования можно только позицию драфта плана закупок");
        }
        if (item.getSourceContractId() != null) {
            contractRepository.findById(item.getSourceContractId()).ifPresent(contract -> {
                contract.setExcludedFromPlanning(excluded);
                contractRepository.save(contract);
            });
        }
        // Кто и когда нажал «глазик»; сама смена статуса попадает в историю изменений с автором
        item.setExcludedFromPlanningAt(LocalDateTime.now());
        item.setExcludedFromPlanningBy(currentUserService.getCurrentUser().orElse(null));
        logger.info("Draft plan item {} {} planning (source contract {})",
                itemId, excluded ? "excluded from" : "returned to", item.getSourceContractId());
        return purchasePlanItemService.updateStatus(itemId,
                excluded ? PurchasePlanItemStatus.NOT_ACTUAL : PurchasePlanItemStatus.ACTUAL);
    }

    /**
     * Галочка «Проверено закупщиком» у позиции драфта: ставят и снимают только закупщики и администраторы.
     * Кто и когда нажал, хранится в позиции (последнее нажатие) и в истории изменений (все нажатия).
     *
     * @return обновлённая позиция или null, если позиция не найдена
     * @throws AccessDeniedException если текущий пользователь не закупщик и не администратор
     * @throws IllegalStateException если позиция не относится к драфту
     */
    @Transactional
    public PurchasePlanItemDto setPurchaserChecked(Long itemId, boolean checked) {
        PurchasePlanItem item = purchasePlanItemRepository.findById(itemId).orElse(null);
        if (item == null) {
            return null;
        }
        if (!Boolean.TRUE.equals(item.getIsDraft())) {
            throw new IllegalStateException("Отметить «Проверено закупщиком» можно только позицию драфта плана закупок");
        }
        User user = currentUserService.getCurrentUser()
                .filter(CurrentUserService::isPurchaserOrAdmin)
                .orElseThrow(() -> new AccessDeniedException(
                        "Отметить «Проверено закупщиком» могут только закупщики и администраторы"));

        boolean wasChecked = Boolean.TRUE.equals(item.getPurchaserChecked());
        if (wasChecked != checked) {
            purchasePlanItemChangeService.logChange(item.getId(), item.getGuid(), "purchaserChecked",
                    wasChecked ? "Да" : "Нет", checked ? "Да" : "Нет");
            item.setPurchaserChecked(checked);
            item.setPurchaserCheckedAt(LocalDateTime.now());
            item.setPurchaserCheckedBy(user);
            purchasePlanItemRepository.save(item);
            logger.info("Draft plan item {} purchaser check {} by user {}", itemId, checked ? "set" : "removed", user.getId());
        }
        return purchasePlanItemService.findById(itemId);
    }

    /**
     * Спецификация отбора договоров-источников драфта.
     */
    private Specification<Contract> buildContractSpecification(LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) -> {
            root.fetch("suppliers", jakarta.persistence.criteria.JoinType.LEFT);
            query.distinct(true);

            List<Predicate> predicates = new ArrayList<>();
            // Договоры и связанные с заявкой ДС: без спецификаций, приложений, счетов и прочих форм
            predicates.add(cb.or(
                    cb.equal(root.get("documentForm"), DOCUMENT_FORM_CONTRACT),
                    cb.and(
                            cb.equal(root.get("documentForm"), DOCUMENT_FORM_ADDITIONAL_AGREEMENT),
                            cb.isNotNull(root.get("purchaseRequestId"))
                    )
            ));
            // Только Uzum Market
            predicates.add(cb.equal(root.get("customerOrganization"), CustomerOrganization.UZUM_MARKET));
            // Только действующие (подписанные) договоры
            predicates.add(cb.equal(root.get("status"), ContractStatus.SIGNED));
            // Договоры, исключённые из планирования («глазик»), не отсекаются здесь: по ним не создаются новые
            // позиции, но скрытая очисткой позиция возвращается исключённой (см. generateDraft)
            // Срок окончания попадает в интервал планирования
            predicates.add(cb.greaterThanOrEqualTo(root.get("plannedDeliveryEndDate"), from));
            predicates.add(cb.lessThan(root.get("plannedDeliveryEndDate"), to));
            // Исключаем ЦФО коммерции, фотостудии и B2B
            jakarta.persistence.criteria.Join<Object, Object> cfoJoin =
                    root.join("cfo", jakarta.persistence.criteria.JoinType.LEFT);
            for (String excludedPart : EXCLUDED_CFO_NAME_PARTS) {
                predicates.add(cb.or(
                        cb.isNull(cfoJoin.get("name")),
                        cb.notLike(cb.lower(cfoJoin.get("name")), "%" + excludedPart + "%")
                ));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /**
     * Убирает ДС, продлевающие уже отобранный договор: связи ДС с основным договором в данных нет,
     * поэтому один и тот же договор распознаётся по совпадению заявки на закупку и поставщика.
     * ДС по той же заявке с другим поставщиком (например, разделение объёма между поставщиками) остаётся.
     */
    private List<Contract> removeAmendmentsOfSelectedContracts(List<Contract> contracts) {
        Set<String> contractKeys = new HashSet<>();
        for (Contract contract : contracts) {
            if (DOCUMENT_FORM_CONTRACT.equals(contract.getDocumentForm()) && contract.getPurchaseRequestId() != null) {
                for (Supplier supplier : suppliersOf(contract)) {
                    contractKeys.add(contract.getPurchaseRequestId() + ":" + supplier.getId());
                }
            }
        }
        List<Contract> result = new ArrayList<>();
        int removed = 0;
        for (Contract contract : contracts) {
            boolean duplicatesContract = DOCUMENT_FORM_ADDITIONAL_AGREEMENT.equals(contract.getDocumentForm())
                    && suppliersOf(contract).stream()
                            .anyMatch(s -> contractKeys.contains(contract.getPurchaseRequestId() + ":" + s.getId()));
            if (duplicatesContract) {
                removed++;
            } else {
                result.add(contract);
            }
        }
        if (removed > 0) {
            logger.info("Draft generation: skipped {} additional agreements of already selected contracts", removed);
        }
        return result;
    }

    private static Set<Supplier> suppliersOf(Contract contract) {
        return contract.getSuppliers() != null ? contract.getSuppliers() : Set.of();
    }

    /**
     * Загружает заявки на закупку, связанные с отобранными договорами (одним запросом).
     */
    private Map<Long, PurchaseRequest> loadPurchaseRequests(List<Contract> contracts) {
        List<Long> requestIds = contracts.stream()
                .map(Contract::getPurchaseRequestId)
                .filter(id -> id != null)
                .distinct()
                .collect(Collectors.toList());
        if (requestIds.isEmpty()) {
            return new HashMap<>();
        }
        Specification<PurchaseRequest> spec = (root, query, cb) -> root.get("idPurchaseRequest").in(requestIds);
        return purchaseRequestRepository.findAll(spec).stream()
                .filter(pr -> pr.getIdPurchaseRequest() != null)
                .collect(Collectors.toMap(PurchaseRequest::getIdPurchaseRequest, pr -> pr, (a, b) -> a));
    }

    /**
     * Собирает новую позицию драфта из договора и связанной заявки.
     */
    private PurchasePlanItem buildDraftItem(Contract contract, PurchaseRequest request, int planYear) {
        PurchasePlanItem item = new PurchasePlanItem();
        fillDraftItem(item, contract, request, planYear);
        return item;
    }

    /**
     * Переносит из одной позиции в другую значения полей, изменённых вручную.
     *
     * @return позиция, в которую перенесены значения
     */
    private static PurchasePlanItem copyManualFields(PurchasePlanItem from, PurchasePlanItem to, Set<String> manualFields) {
        for (String field : manualFields) {
            BiConsumer<PurchasePlanItem, PurchasePlanItem> copier = MANUAL_FIELDS.get(field);
            if (copier != null) {
                copier.accept(from, to);
            }
        }
        return to;
    }

    /**
     * Дата завершения закупки зависит от даты заявки и сложности: если руками меняли их, но не саму дату завершения,
     * пересчитывает её от сохранённых значений той же формулой, что при ручном изменении.
     */
    private void recalculateNewContractDateIfNeeded(PurchasePlanItem item, Set<String> manualFields) {
        boolean dependsOnManualValues = manualFields.contains("requestDate") || manualFields.contains("complexity");
        if (manualFields.contains("newContractDate") || !dependsOnManualValues || item.getRequestDate() == null) {
            return;
        }
        LocalDate newContractDate = procurementLeadTimeService.calculateNewContractDate(item.getRequestDate(), item.getComplexity());
        item.setNewContractDate(newContractDate != null ? newContractDate : item.getRequestDate());
    }

    /**
     * Сбрасывает у позиции, скрытой очисткой драфта, поля, которые формирование не заполняет
     * или заполняет не всегда, — чтобы возвращённая позиция была такой же, как новая.
     * Изменённые вручную поля после заполнения восстанавливаются (см. copyManualFields).
     */
    private void resetForRegeneration(PurchasePlanItem item) {
        item.setDraftCleared(Boolean.FALSE);
        item.setPurchaser(null);
        item.setPurchaseRequestId(null);
        item.setHolding(null);
        item.setState(null);
        item.setAutoRenewal(null);
        item.setCurrentContractBalance(null);
        item.setRequestDate(null);
        item.setNewContractDate(null);
        item.setCategory(null);
        item.setProduct(null);
        item.setIsStrategicProduct(null);
        // Отметку «Проверено закупщиком» ставят только вручную: если её ставили, она восстановится как ручная правка
        item.setPurchaserChecked(Boolean.FALSE);
        item.setPurchaserCheckedAt(null);
        item.setPurchaserCheckedBy(null);
        item.setExcludedFromPlanningAt(null);
        item.setExcludedFromPlanningBy(null);
    }

    /**
     * Заполняет позицию драфта из договора и связанной заявки.
     */
    private void fillDraftItem(PurchasePlanItem item, Contract contract, PurchaseRequest request, int planYear) {
        item.setIsDraft(Boolean.TRUE);
        item.setSourceContractId(contract.getId());
        item.setYear(planYear);
        item.setCompany(Company.UZUM_MARKET);
        item.setPurchaserCompany(Company.UZUM_MARKET);
        item.setCfo(contract.getCfo());
        item.setStatus(PurchasePlanItemStatus.ACTUAL);
        item.setHasContract(Boolean.TRUE);

        // Наименование действующего договора — отдельная колонка «Текущий договор»
        String contractName = firstNonBlank(contract.getTitle(), contract.getName());
        item.setCurrentContractName(trimToLength(contractName, 500));

        // Предмет закупки: наименование связанной заявки; если заявки нет — предмет договора (колонка «Содержание»),
        // а если и его нет — наименование договора
        String requestName = request != null
                ? firstNonBlank(request.getName(), firstNonBlank(request.getTitle(), request.getPurchaseRequestSubject()))
                : null;
        String subject = isNotBlank(requestName) ? requestName : firstNonBlank(contract.getSubject(), contractName);
        item.setPurchaseSubject(trimToLength(subject, 500));

        // Суммы: бюджет новой закупки принимаем равным сумме действующего договора
        item.setBudgetAmount(contract.getBudgetAmount());
        item.setCurrentAmount(contract.getBudgetAmount());
        item.setCurrentContractAmount(contract.getBudgetAmount());

        // Даты действующего договора
        LocalDate currentEnd = contract.getPlannedDeliveryEndDate() != null
                ? contract.getPlannedDeliveryEndDate().toLocalDate()
                : null;
        item.setCurrentContractEndDate(currentEnd);
        item.setContractEndDate(currentEnd);

        // Сложность: из связанной заявки, а без заявки — средний уровень (закупщик уточнит вручную).
        // Определяется до расчёта дат, потому что от неё зависит длительность процедуры закупки
        String complexity = request != null ? trimToLength(request.getComplexity(), 255) : null;
        if (!isNotBlank(complexity)) {
            complexity = DEFAULT_COMPLEXITY;
        }
        item.setComplexity(complexity);

        // Стартовая раскладка Ганта: заявка подаётся за DEFAULT_REQUEST_LEAD_DAYS дней до окончания
        // текущего договора, но не раньше января года планирования; завершение закупки считается
        // от даты заявки и сложности — той же формулой, что и при ручном изменении даты в плане
        if (currentEnd != null) {
            LocalDate planYearStart = LocalDate.of(planYear, 1, 1);
            LocalDate requestDate = currentEnd.plusDays(1).minusDays(DEFAULT_REQUEST_LEAD_DAYS);
            if (requestDate.isBefore(planYearStart)) {
                requestDate = planYearStart;
            }
            item.setRequestDate(requestDate);

            LocalDate newContractDate = procurementLeadTimeService.calculateNewContractDate(requestDate, complexity);
            // Сложность в драфте заполняется всегда, но подстрахуемся от неизвестного значения
            item.setNewContractDate(newContractDate != null ? newContractDate : requestDate);
        }

        // Контрагент действующего договора
        Set<Supplier> suppliers = contract.getSuppliers() != null ? contract.getSuppliers() : new HashSet<>();
        String currentKa = suppliers.stream()
                .map(Supplier::getName)
                .filter(PurchasePlanDraftService::isNotBlank)
                .map(String::trim)
                .distinct()
                .collect(Collectors.joining(", "));
        item.setCurrentKa(trimToLength(isNotBlank(currentKa) ? currentKa : null, 255));

        // Аналитика из заявки на закупку (сложность выставлена выше — от неё зависят даты)
        if (request != null) {
            item.setCategory(trimToLength(request.getExpenseItem(), 255));
            item.setProduct(trimToLength(request.getCostType(), 500));
            item.setIsStrategicProduct(request.getIsStrategicProduct());
        }
        if (item.getIsStrategicProduct() == null) {
            item.setIsStrategicProduct(contract.getIsStrategicProduct());
        }
        // Закупщик в драфте не заполняется — назначается вручную

        item.setComment(buildComment(contract));
    }

    /**
     * Комментарий-источник: вид и номер документа и валюта (суммы в не-сумовых договорах не пересчитываются).
     */
    private String buildComment(Contract contract) {
        StringBuilder sb = new StringBuilder(DOCUMENT_FORM_ADDITIONAL_AGREEMENT.equals(contract.getDocumentForm())
                ? "Сформировано из доп. соглашения"
                : "Сформировано из договора");
        if (isNotBlank(contract.getInnerId())) {
            sb.append(" № ").append(contract.getInnerId().trim());
        }
        if (isNotBlank(contract.getCurrency()) && !"СУМ".equalsIgnoreCase(contract.getCurrency().trim())) {
            sb.append(". Валюта договора: ").append(contract.getCurrency().trim())
              .append(" (сумма указана без пересчёта в UZS)");
        }
        return sb.toString();
    }

    private static boolean isNotBlank(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private static String firstNonBlank(String first, String second) {
        return isNotBlank(first) ? first.trim() : (isNotBlank(second) ? second.trim() : null);
    }

    private static String trimToLength(String value, int maxLength) {
        if (!isNotBlank(value)) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    }
}
