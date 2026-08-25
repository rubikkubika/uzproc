package com.uzproc.backend.service.purchaseplan;

import com.uzproc.backend.entity.Company;
import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.contract.ContractStatus;
import com.uzproc.backend.entity.contract.CustomerOrganization;
import com.uzproc.backend.entity.purchaseplan.PurchasePlanItem;
import com.uzproc.backend.entity.purchaseplan.PurchasePlanItemStatus;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.repository.contract.ContractRepository;
import com.uzproc.backend.repository.purchaseplan.PurchasePlanItemRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.jpa.domain.Specification;
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
import java.util.stream.Collectors;

/**
 * Генерация драфта плана закупок из действующих договоров.
 *
 * Отбираются договоры (без ДС, спецификаций и прочих форм документов) организации-заказчика
 * Uzum Market в статусе «Подписан», срок действия которых заканчивается в декабре года,
 * предшествующего году планирования, либо в течение самого года планирования.
 * Для года планирования 2027 это диапазон 01.12.2026 — 31.12.2027.
 *
 * Аналитика позиции драфта заполняется из договора и (при наличии) из связанной заявки на закупку.
 */
@Service
public class PurchasePlanDraftService {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanDraftService.class);

    /** Форма документа, соответствующая договору (исключает ДС, спецификации, приложения и т.д.) */
    private static final String DOCUMENT_FORM_CONTRACT = "Договор";

    /**
     * ЦФО, исключаемые из драфта: коммерческие подразделения (Commerce 1Р, 3Р, SR, FMCG,
     * Fashion, Electronics), фотостудия и B2B планируют закупки отдельно.
     * Сравнение — по вхождению подстроки в наименование ЦФО без учёта регистра.
     */
    private static final List<String> EXCLUDED_CFO_NAME_PARTS = List.of("commerce", "photostudio", "b2b");

    /** Сколько дней до даты нового договора создаётся заявка на закупку (стартовая раскладка Ганта) */
    private static final int DEFAULT_REQUEST_LEAD_DAYS = 90;

    private final ContractRepository contractRepository;
    private final PurchasePlanItemRepository purchasePlanItemRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;

    public PurchasePlanDraftService(
            ContractRepository contractRepository,
            PurchasePlanItemRepository purchasePlanItemRepository,
            PurchaseRequestRepository purchaseRequestRepository) {
        this.contractRepository = contractRepository;
        this.purchasePlanItemRepository = purchasePlanItemRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
    }

    /**
     * Формирует драфт плана закупок на указанный год из действующих договоров.
     * Позиции, уже созданные из того же договора, повторно не создаются — ручные правки не теряются.
     *
     * @return сводка: сколько договоров отобрано, сколько позиций создано и сколько пропущено
     */
    @Transactional
    public Map<String, Object> generateDraft(Integer year) {
        int planYear = year != null ? year : LocalDate.now().getYear() + 1;

        LocalDateTime from = LocalDate.of(planYear - 1, 12, 1).atStartOfDay();
        LocalDateTime to = LocalDate.of(planYear + 1, 1, 1).atStartOfDay();

        List<Contract> contracts = contractRepository.findAll(buildContractSpecification(from, to));
        logger.info("Draft generation for year {}: selected {} contracts (end date {} .. {})",
                planYear, contracts.size(), from.toLocalDate(), to.toLocalDate().minusDays(1));

        // Уже существующие позиции драфта этого года — чтобы не плодить дубли
        Set<Long> existingSourceContractIds = purchasePlanItemRepository.findDraftItemsByYear(planYear).stream()
                .map(PurchasePlanItem::getSourceContractId)
                .filter(id -> id != null)
                .collect(Collectors.toSet());

        Map<Long, PurchaseRequest> purchaseRequestMap = loadPurchaseRequests(contracts);

        int created = 0;
        int skipped = 0;
        List<PurchasePlanItem> toSave = new ArrayList<>();

        for (Contract contract : contracts) {
            if (contract.getId() == null || existingSourceContractIds.contains(contract.getId())) {
                skipped++;
                continue;
            }
            PurchaseRequest request = contract.getPurchaseRequestId() != null
                    ? purchaseRequestMap.get(contract.getPurchaseRequestId())
                    : null;
            toSave.add(buildDraftItem(contract, request, planYear));
            created++;
        }

        if (!toSave.isEmpty()) {
            purchasePlanItemRepository.saveAll(toSave);
        }

        logger.info("Draft generation for year {}: created {}, skipped {} (already in draft)", planYear, created, skipped);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("year", planYear);
        result.put("contractsSelected", contracts.size());
        result.put("created", created);
        result.put("skipped", skipped);
        return result;
    }

    /**
     * Удаляет позиции драфта за указанный год (для полной перегенерации).
     *
     * @return количество удалённых позиций
     */
    @Transactional
    public int clearDraft(Integer year) {
        int planYear = year != null ? year : LocalDate.now().getYear() + 1;
        List<PurchasePlanItem> items = purchasePlanItemRepository.findDraftItemsByYear(planYear);
        purchasePlanItemRepository.deleteAll(items);
        logger.info("Draft for year {} cleared: {} items removed", planYear, items.size());
        return items.size();
    }

    /**
     * Спецификация отбора договоров-источников драфта.
     */
    private Specification<Contract> buildContractSpecification(LocalDateTime from, LocalDateTime to) {
        return (root, query, cb) -> {
            root.fetch("suppliers", jakarta.persistence.criteria.JoinType.LEFT);
            query.distinct(true);

            List<Predicate> predicates = new ArrayList<>();
            // Только договоры: без ДС, спецификаций, приложений, счетов и прочих форм
            predicates.add(cb.equal(root.get("documentForm"), DOCUMENT_FORM_CONTRACT));
            // Только Uzum Market
            predicates.add(cb.equal(root.get("customerOrganization"), CustomerOrganization.UZUM_MARKET));
            // Только действующие (подписанные) договоры
            predicates.add(cb.equal(root.get("status"), ContractStatus.SIGNED));
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
     * Собирает позицию драфта из договора и связанной заявки.
     */
    private PurchasePlanItem buildDraftItem(Contract contract, PurchaseRequest request, int planYear) {
        PurchasePlanItem item = new PurchasePlanItem();
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

        // Предмет закупки: наименование связанной заявки, а если заявки нет — наименование договора
        String requestName = request != null
                ? firstNonBlank(request.getName(), firstNonBlank(request.getTitle(), request.getPurchaseRequestSubject()))
                : null;
        String subject = isNotBlank(requestName) ? requestName : contractName;
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

        // Стартовая раскладка Ганта: новый договор — со следующего дня после окончания текущего,
        // заявка — за DEFAULT_REQUEST_LEAD_DAYS дней до него, но не раньше января года планирования
        if (currentEnd != null) {
            LocalDate newContractDate = currentEnd.plusDays(1);
            LocalDate planYearStart = LocalDate.of(planYear, 1, 1);
            LocalDate requestDate = newContractDate.minusDays(DEFAULT_REQUEST_LEAD_DAYS);
            if (requestDate.isBefore(planYearStart)) {
                requestDate = planYearStart;
            }
            // Договор не может быть заключён раньше заявки на закупку
            if (newContractDate.isBefore(requestDate)) {
                newContractDate = requestDate;
            }
            item.setRequestDate(requestDate);
            item.setNewContractDate(newContractDate);
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

        // Аналитика из заявки на закупку
        if (request != null) {
            item.setComplexity(trimToLength(request.getComplexity(), 255));
            item.setCategory(trimToLength(request.getExpenseItem(), 255));
            item.setProduct(trimToLength(request.getCostType(), 500));
            item.setIsStrategicProduct(request.getIsStrategicProduct());
        }
        if (item.getIsStrategicProduct() == null) {
            item.setIsStrategicProduct(contract.getIsStrategicProduct());
        }
        // Закупщик в драфте не заполняется — назначается вручную

        item.setComment(buildComment(contract));
        return item;
    }

    /**
     * Комментарий-источник: номер договора и валюта (суммы в не-сумовых договорах не пересчитываются).
     */
    private String buildComment(Contract contract) {
        StringBuilder sb = new StringBuilder("Сформировано из договора");
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
