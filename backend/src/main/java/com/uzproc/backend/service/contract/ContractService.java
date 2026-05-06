package com.uzproc.backend.service.contract;

import com.uzproc.backend.dto.contract.ContractDto;
import com.uzproc.backend.dto.contract.ContractSummaryItemDto;
import com.uzproc.backend.dto.supplier.SupplierDto;
import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.contract.ContractStatus;
import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.entity.purchase.PurchaseApproval;
import com.uzproc.backend.repository.contract.ContractRepository;
import com.uzproc.backend.repository.purchase.PurchaseApprovalRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.Collections;

@Service
@Transactional(readOnly = true)
public class ContractService {

    private static final Logger logger = LoggerFactory.getLogger(ContractService.class);
    
    @PersistenceContext
    private EntityManager entityManager;
    
    private final ContractRepository contractRepository;
    private final PurchaseApprovalRepository purchaseApprovalRepository;

    public ContractService(ContractRepository contractRepository,
                           PurchaseApprovalRepository purchaseApprovalRepository) {
        this.contractRepository = contractRepository;
        this.purchaseApprovalRepository = purchaseApprovalRepository;
    }

    public Page<ContractDto> findAll(
            int page,
            int size,
            Integer year,
            String sortBy,
            String sortDir,
            String innerId,
            List<String> cfo,
            String name,
            String documentForm,
            String costType,
            String contractType,
            Long currentUserId,
            Boolean inWorkTab,
            Boolean signedTab,
            Boolean hiddenTab,
            String purchaseRequestInnerId,
            Boolean isTypicalForm,
            Boolean notCoordinatedTab,
            String customerOrganization,
            String preparedByName,
            String status,
            String supplier) {

        logger.info("=== FILTER REQUEST ===");
        logger.info("Filter parameters - year: {}, innerId: '{}', cfo: {}, name: '{}', documentForm: '{}', costType: '{}', contractType: '{}', currentUserId: {}, inWorkTab: {}, signedTab: {}, hiddenTab: {}, notCoordinatedTab: {}, purchaseRequestInnerId: '{}', isTypicalForm: {}, customerOrganization: {}, preparedByName: '{}', status: '{}', supplier: '{}'",
                year, innerId, cfo, name, documentForm, costType, contractType, currentUserId, inWorkTab, signedTab, hiddenTab, notCoordinatedTab, purchaseRequestInnerId, isTypicalForm, customerOrganization, preparedByName, status, supplier);

        Specification<Contract> spec = buildSpecification(
                year, innerId, cfo, name, documentForm, costType, contractType, currentUserId, inWorkTab, signedTab, hiddenTab, purchaseRequestInnerId, isTypicalForm, notCoordinatedTab, customerOrganization, preparedByName, status, supplier);
        
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<Contract> contracts = contractRepository.findAll(spec, pageable);

        logger.info("Query result - Found {} contracts on page {} (size {}), total elements: {}",
                contracts.getContent().size(), page, size, contracts.getTotalElements());
        logger.info("=== END FILTER REQUEST ===\n");

        // Batch-расчёт purchaseCompletionDate для всех PR ID на странице
        List<Long> prIds = contracts.getContent().stream()
                .map(Contract::getPurchaseRequestId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .collect(java.util.stream.Collectors.toList());
        Map<Long, LocalDateTime> completionDates = batchCalculatePurchaseCompletionDates(prIds);

        // Конвертируем entity в DTO
        Page<ContractDto> dtoPage = contracts.map(c -> {
            ContractDto dto = toDto(c);
            if (c.getPurchaseRequestId() != null) {
                dto.setPurchaseCompletionDate(completionDates.get(c.getPurchaseRequestId()));
            }
            return dto;
        });

        return dtoPage;
    }

    public ContractDto findById(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElse(null);
        if (contract == null) {
            return null;
        }
        return toDto(contract);
    }

    public ContractDto findByInnerId(String innerId) {
        java.util.Optional<Contract> contract = contractRepository.findByInnerId(innerId);
        if (contract.isPresent()) {
            return toDto(contract.get());
        }
        return null;
    }

    public List<ContractDto> findByParentContractId(Long parentContractId) {
        List<Contract> contracts = contractRepository.findByParentContractId(parentContractId);
        return contracts.stream()
                .map(this::toDto)
                .collect(java.util.stream.Collectors.toList());
    }

    public List<ContractDto> findByPurchaseRequestId(Long purchaseRequestId) {
        List<Contract> contracts = contractRepository.findByPurchaseRequestId(purchaseRequestId);
        return contracts.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Обновить флаг и комментарий исключения договора из расчёта статуса заявки.
     * @param id id договора
     * @param excludedFromStatusCalculation исключить из расчёта (true) или учитывать (false)
     * @param exclusionComment комментарий к исключению (может быть null)
     * @return обновлённый DTO или null, если договор не найден
     */
    @Transactional(readOnly = false)
    public ContractDto updateExclusion(Long id, Boolean excludedFromStatusCalculation, String exclusionComment) {
        Contract contract = contractRepository.findById(id).orElse(null);
        if (contract == null) {
            return null;
        }
        contract.setExcludedFromStatusCalculation(Boolean.TRUE.equals(excludedFromStatusCalculation) ? true : false);
        contract.setExclusionComment(exclusionComment != null && !exclusionComment.trim().isEmpty() ? exclusionComment.trim() : null);
        contract = contractRepository.save(contract);
        return toDto(contract);
    }

    /**
     * Обновить флаг исключения договора из вкладки "В работе" на странице договоров.
     * @param id id договора
     * @param excludeFromInWork исключить из "В работе" (true) или показывать (false)
     * @return обновлённый DTO или null, если договор не найден
     */
    @Transactional(readOnly = false)
    public ContractDto updateExcludeFromInWork(Long id, Boolean excludeFromInWork) {
        Contract contract = contractRepository.findById(id).orElse(null);
        if (contract == null) {
            return null;
        }
        contract.setExcludeFromInWork(Boolean.TRUE.equals(excludeFromInWork));
        contract = contractRepository.save(contract);
        return toDto(contract);
    }

    /**
     * Сводка по исполнителям-договорникам: кол-во договоров из вкладки «В работе» с разбивкой по формам документа.
     */
    public List<ContractSummaryItemDto> getInWorkSummary() {
        String sql =
            "SELECT TRIM(CONCAT(COALESCE(u.surname,''), ' ', COALESCE(u.name,''))) AS prepared_by_name, " +
            "COALESCE(c.document_form, '') AS document_form, " +
            "COUNT(*) AS contract_count " +
            "FROM contracts c " +
            "INNER JOIN users u ON c.prepared_by_id = u.id " +
            "WHERE u.is_contractor = true " +
            "  AND (c.status IS NULL OR (c.status <> 'SIGNED' AND c.status <> 'NOT_COORDINATED')) " +
            "  AND (c.exclude_from_in_work IS NULL OR c.exclude_from_in_work = false) " +
            "GROUP BY u.id, u.surname, u.name, c.document_form " +
            "ORDER BY u.surname, u.name, c.document_form";

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();

        Map<String, ContractSummaryItemDto> byName = new java.util.LinkedHashMap<>();
        for (Object[] row : rows) {
            String name = row[0] != null ? row[0].toString().trim() : "";
            if (name.isEmpty()) name = "Не назначен";
            String documentForm = row[1] != null ? row[1].toString().trim() : "";
            long count = ((Number) row[2]).longValue();

            ContractSummaryItemDto dto = byName.computeIfAbsent(name, n -> new ContractSummaryItemDto(n, 0));
            dto.setCount(dto.getCount() + count);
            if (!documentForm.isEmpty()) {
                dto.getCountByDocumentForm().merge(documentForm, count, Long::sum);
            }
        }

        List<ContractSummaryItemDto> result = new ArrayList<>(byName.values());
        result.sort((a, b) -> Long.compare(b.getCount(), a.getCount()));
        return result;
    }

    /**
     * Уникальные формы документа среди договоров из вкладки «В работе».
     */
    public List<String> getInWorkDocumentForms() {
        String sql =
            "SELECT DISTINCT c.document_form " +
            "FROM contracts c " +
            "INNER JOIN users u ON c.prepared_by_id = u.id " +
            "WHERE u.is_contractor = true " +
            "  AND (c.status IS NULL OR (c.status <> 'SIGNED' AND c.status <> 'NOT_COORDINATED')) " +
            "  AND (c.exclude_from_in_work IS NULL OR c.exclude_from_in_work = false) " +
            "  AND c.document_form IS NOT NULL AND c.document_form <> '' " +
            "ORDER BY c.document_form";

        @SuppressWarnings("unchecked")
        List<Object> rows = entityManager.createNativeQuery(sql).getResultList();
        return rows.stream()
            .filter(r -> r != null)
            .map(Object::toString)
            .collect(java.util.stream.Collectors.toList());
    }

    public List<ContractSummaryItemDto> getSignedSummary(int year) {
        String sql =
            "SELECT TRIM(CONCAT(COALESCE(u.surname,''), ' ', COALESCE(u.name,''))) AS prepared_by_name, " +
            "COALESCE(c.document_form, '') AS document_form, " +
            "COUNT(*) AS contract_count " +
            "FROM contracts c " +
            "INNER JOIN users u ON c.prepared_by_id = u.id " +
            "WHERE u.is_contractor = true " +
            "  AND c.status = 'SIGNED' " +
            "  AND EXTRACT(YEAR FROM c.contract_creation_date) = :year " +
            "GROUP BY u.id, u.surname, u.name, c.document_form " +
            "ORDER BY u.surname, u.name, c.document_form";

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql)
            .setParameter("year", year)
            .getResultList();

        Map<String, ContractSummaryItemDto> byName = new java.util.LinkedHashMap<>();
        for (Object[] row : rows) {
            String name = row[0] != null ? row[0].toString().trim() : "";
            if (name.isEmpty()) name = "Не назначен";
            String documentForm = row[1] != null ? row[1].toString().trim() : "";
            long count = ((Number) row[2]).longValue();

            ContractSummaryItemDto dto = byName.computeIfAbsent(name, n -> new ContractSummaryItemDto(n, 0));
            dto.setCount(dto.getCount() + count);
            if (!documentForm.isEmpty()) {
                dto.getCountByDocumentForm().merge(documentForm, count, Long::sum);
            }
        }

        List<ContractSummaryItemDto> result = new ArrayList<>(byName.values());
        result.sort((a, b) -> Long.compare(b.getCount(), a.getCount()));
        return result;
    }

    public List<String> getSignedDocumentForms(int year) {
        String sql =
            "SELECT DISTINCT c.document_form " +
            "FROM contracts c " +
            "INNER JOIN users u ON c.prepared_by_id = u.id " +
            "WHERE u.is_contractor = true " +
            "  AND c.status = 'SIGNED' " +
            "  AND EXTRACT(YEAR FROM c.contract_creation_date) = :year " +
            "  AND c.document_form IS NOT NULL AND c.document_form <> '' " +
            "ORDER BY c.document_form";

        @SuppressWarnings("unchecked")
        List<Object> rows = entityManager.createNativeQuery(sql)
            .setParameter("year", year)
            .getResultList();
        return rows.stream()
            .filter(r -> r != null)
            .map(Object::toString)
            .collect(java.util.stream.Collectors.toList());
    }

    /**
     * Получить список уникальных годов из дат создания договоров
     * @return список годов в порядке убывания
     */
    public List<Integer> getDistinctYears() {
        return contractRepository.findDistinctYears();
    }

    /**
     * Получить все спецификации с плановой датой поставки для календаря плана поставок
     * @return список спецификаций с плановой датой поставки
     */
    public List<ContractDto> getSpecificationsForDeliveryPlan() {
        Specification<Contract> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            // Фильтр: только спецификации
            predicates.add(cb.equal(root.get("documentForm"), "Спецификация"));
            // Фильтр: должна быть плановая дата начала поставки
            predicates.add(cb.isNotNull(root.get("plannedDeliveryStartDate")));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        
        List<Contract> contracts = contractRepository.findAll(spec);
        logger.info("Found {} specifications with planned delivery date", contracts.size());
        
        return contracts.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Получить все спецификации со статусом null, связанные с заявками на закупку
     * @return список спецификаций с их состояниями
     */
    public List<Map<String, Object>> getSpecificationsWithNullStatus() {
        Query query = entityManager.createNativeQuery(
            "SELECT c.id, c.inner_id, c.purchase_request_id, c.state, c.contract_creation_date, " +
            "pr.id_purchase_request, pr.name as purchase_request_name " +
            "FROM contracts c " +
            "LEFT JOIN purchase_requests pr ON c.purchase_request_id = pr.id_purchase_request " +
            "WHERE c.document_form = 'Спецификация' " +
            "AND c.purchase_request_id IS NOT NULL " +
            "AND c.status IS NULL " +
            "ORDER BY c.purchase_request_id, c.inner_id"
        );
        
        @SuppressWarnings("unchecked")
        List<Object[]> results = query.getResultList();
        
        List<Map<String, Object>> specifications = new ArrayList<>();
        for (Object[] row : results) {
            Map<String, Object> spec = new HashMap<>();
            spec.put("id", row[0]);
            spec.put("innerId", row[1]);
            spec.put("purchaseRequestId", row[2]);
            spec.put("state", row[3]);
            spec.put("contractCreationDate", row[4]);
            spec.put("purchaseRequestNumber", row[5]);
            spec.put("purchaseRequestName", row[6]);
            specifications.add(spec);
        }
        
        logger.info("Found {} specifications with null status linked to purchase requests", specifications.size());
        return specifications;
    }

    /**
     * Конвертирует Contract entity в ContractDto
     */
    public ContractDto toDto(Contract entity) {
        ContractDto dto = new ContractDto();
        dto.setId(entity.getId());
        dto.setGuid(entity.getGuid());
        dto.setInnerId(entity.getInnerId());
        dto.setContractCreationDate(entity.getContractCreationDate());
        dto.setName(entity.getName());
        dto.setTitle(entity.getTitle());
        dto.setCfo(entity.getCfo() != null ? entity.getCfo().getName() : null);
        dto.setPurchaseMethod(entity.getPurchaseMethod());
        dto.setDocumentForm(entity.getDocumentForm());
        dto.setBudgetAmount(entity.getBudgetAmount());
        dto.setCurrency(entity.getCurrency());
        dto.setCostType(entity.getCostType());
        dto.setContractType(entity.getContractType());
        dto.setContractDurationMonths(entity.getContractDurationMonths());
        dto.setStatus(entity.getStatus());
        dto.setState(entity.getState());
        dto.setPurchaseRequestId(entity.getPurchaseRequestId());
        // Маппинг внутреннего номера и системного id заявки
        if (entity.getPurchaseRequest() != null) {
            dto.setPurchaseRequestInnerId(entity.getPurchaseRequest().getIdPurchaseRequest());
            dto.setPurchaseRequestSystemId(entity.getPurchaseRequest().getId());
        }
        dto.setParentContractId(entity.getParentContractId());
        
        // Загружаем основной договор, если есть parentContractId
        if (entity.getParentContractId() != null) {
            // Пробуем получить из LAZY связи, если доступно
            if (entity.getParentContract() != null) {
                dto.setParentContract(toDto(entity.getParentContract()));
            } else {
                // Если LAZY не загружен, загружаем по ID
                contractRepository.findById(entity.getParentContractId())
                    .ifPresent(parentContract -> dto.setParentContract(toDto(parentContract)));
            }
        }
        
        dto.setPlannedDeliveryStartDate(entity.getPlannedDeliveryStartDate());
        dto.setPlannedDeliveryEndDate(entity.getPlannedDeliveryEndDate());

        // Маппинг preparedBy (ФИО пользователя)
        if (entity.getPreparedBy() != null) {
            com.uzproc.backend.entity.user.User preparedByUser = entity.getPreparedBy();
            String fullName = (preparedByUser.getSurname() != null ? preparedByUser.getSurname() : "") + " " +
                              (preparedByUser.getName() != null ? preparedByUser.getName() : "");
            dto.setPreparedBy(fullName.trim());
        }

        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setExcludedFromStatusCalculation(entity.getExcludedFromStatusCalculation());
        dto.setExclusionComment(entity.getExclusionComment());
        dto.setExcludeFromInWork(entity.getExcludeFromInWork());
        dto.setCustomerOrganization(entity.getCustomerOrganization());
        dto.setPaymentTerms(entity.getPaymentTerms());
        dto.setIsTypicalForm(entity.getIsTypicalForm());

        // Поставщики (контрагенты)
        if (entity.getSuppliers() != null && !entity.getSuppliers().isEmpty()) {
            List<SupplierDto> supplierDtos = entity.getSuppliers().stream()
                .map(this::supplierToDto)
                .collect(Collectors.toList());
            dto.setSuppliers(supplierDtos);
        } else {
            dto.setSuppliers(Collections.emptyList());
        }
        return dto;
    }

    private SupplierDto supplierToDto(Supplier s) {
        SupplierDto dto = new SupplierDto();
        dto.setId(s.getId());
        dto.setCode(s.getCode());
        dto.setInn(s.getInn());
        dto.setName(s.getName());
        dto.setType(s.getType());
        dto.setKpp(s.getKpp());
        dto.setCreatedAt(s.getCreatedAt());
        dto.setUpdatedAt(s.getUpdatedAt());
        return dto;
    }

    private Map<Long, LocalDateTime> batchCalculatePurchaseCompletionDates(List<Long> prIds) {
        if (prIds.isEmpty()) return new HashMap<>();
        List<PurchaseApproval> approvals = purchaseApprovalRepository.findByPurchaseRequestIdIn(prIds)
                .stream()
                .filter(a -> "Закупочная комиссия".equals(a.getStage()) ||
                             "Проверка результата закупочной комиссии".equals(a.getStage()))
                .collect(java.util.stream.Collectors.toList());
        Map<Long, List<PurchaseApproval>> byPrId = approvals.stream()
                .collect(java.util.stream.Collectors.groupingBy(PurchaseApproval::getPurchaseRequestId));
        Map<Long, LocalDateTime> result = new HashMap<>();
        for (Long prId : prIds) {
            result.put(prId, calcCompletionDate(byPrId.getOrDefault(prId, java.util.List.of())));
        }
        return result;
    }

    private LocalDateTime calcCompletionDate(List<PurchaseApproval> approvals) {
        List<PurchaseApproval> commission = approvals.stream()
                .filter(a -> "Закупочная комиссия".equals(a.getStage()))
                .collect(java.util.stream.Collectors.toList());
        if (commission.isEmpty() || commission.stream().anyMatch(a -> a.getCompletionDate() == null)) return null;
        LocalDateTime commissionMax = commission.stream()
                .map(PurchaseApproval::getCompletionDate)
                .max(LocalDateTime::compareTo).orElse(null);
        List<PurchaseApproval> verification = approvals.stream()
                .filter(a -> "Проверка результата закупочной комиссии".equals(a.getStage()))
                .collect(java.util.stream.Collectors.toList());
        if (verification.isEmpty()) return commissionMax;
        if (verification.stream().anyMatch(a -> a.getCompletionDate() == null)) return null;
        LocalDateTime verMax = verification.stream()
                .map(PurchaseApproval::getCompletionDate)
                .max(LocalDateTime::compareTo).orElse(null);
        if (commissionMax == null) return verMax;
        if (verMax == null) return commissionMax;
        return commissionMax.isAfter(verMax) ? commissionMax : verMax;
    }

    private Specification<Contract> buildSpecification(
            Integer year,
            String innerId,
            List<String> cfo,
            String name,
            String documentForm,
            String costType,
            String contractType,
            Long currentUserId,
            Boolean inWorkTab,
            Boolean signedTab,
            Boolean hiddenTab,
            String purchaseRequestInnerId,
            Boolean isTypicalForm,
            Boolean notCoordinatedTab,
            String customerOrganization,
            String preparedByName,
            String status,
            String supplier) {

        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            int predicateCount = 0;
            
            // Фильтр по году
            if (year != null) {
                java.time.LocalDateTime startOfYear = java.time.LocalDateTime.of(year, 1, 1, 0, 0);
                java.time.LocalDateTime endOfYear = java.time.LocalDateTime.of(year, 12, 31, 23, 59, 59);
                predicates.add(cb.between(root.get("contractCreationDate"), startOfYear, endOfYear));
                predicateCount++;
                logger.info("Added year filter: {}", year);
            }
            
            // Фильтр по внутреннему номеру (частичное совпадение, case-insensitive)
            if (innerId != null && !innerId.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("innerId")), "%" + innerId.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added innerId filter: '{}'", innerId);
            }
            
            // Фильтр по ЦФО (поддержка множественного выбора - точное совпадение)
            if (cfo != null && !cfo.isEmpty()) {
                List<String> validCfoValues = cfo.stream()
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .map(String::trim)
                    .toList();
                
                if (!validCfoValues.isEmpty()) {
                    // Делаем join к связанной сущности Cfo и фильтруем по name
                    jakarta.persistence.criteria.Join<Contract, com.uzproc.backend.entity.Cfo> cfoJoin = root.join("cfo", jakarta.persistence.criteria.JoinType.LEFT);
                    predicates.add(cb.lower(cfoJoin.get("name")).in(
                        validCfoValues.stream().map(String::toLowerCase).toList()
                    ));
                    predicateCount++;
                    logger.info("Added cfo filter: {}", validCfoValues);
                }
            }
            
            // Фильтр по наименованию (частичное совпадение, case-insensitive)
            if (name != null && !name.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added name filter: '{}'", name);
            }
            
            // Фильтр по форме документа (частичное совпадение, case-insensitive)
            if (documentForm != null && !documentForm.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("documentForm")), "%" + documentForm.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added documentForm filter: '{}'", documentForm);
            }
            
            // Фильтр по типу затрат
            if (costType != null && !costType.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("costType"), costType.trim()));
                predicateCount++;
                logger.info("Added costType filter: '{}'", costType);
            }
            
            // Фильтр по типу договора
            if (contractType != null && !contractType.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("contractType"), contractType.trim()));
                predicateCount++;
                logger.info("Added contractType filter: '{}'", contractType);
            }

            // Фильтр по номеру заявки (idPurchaseRequest через join)
            if (purchaseRequestInnerId != null && !purchaseRequestInnerId.trim().isEmpty()) {
                try {
                    Long prInnerId = Long.parseLong(purchaseRequestInnerId.trim());
                    jakarta.persistence.criteria.Join<Contract, com.uzproc.backend.entity.purchaserequest.PurchaseRequest> prJoin = root.join("purchaseRequest", jakarta.persistence.criteria.JoinType.INNER);
                    predicates.add(cb.equal(prJoin.get("idPurchaseRequest"), prInnerId));
                    predicateCount++;
                    logger.info("Added purchaseRequestInnerId filter: {}", prInnerId);
                } catch (NumberFormatException e) {
                    // Если не числовое значение — ищем по частичному совпадению как строку
                    jakarta.persistence.criteria.Join<Contract, com.uzproc.backend.entity.purchaserequest.PurchaseRequest> prJoin = root.join("purchaseRequest", jakarta.persistence.criteria.JoinType.INNER);
                    predicates.add(cb.like(
                        cb.toString(prJoin.get("idPurchaseRequest")),
                        "%" + purchaseRequestInnerId.trim() + "%"
                    ));
                    predicateCount++;
                    logger.info("Added purchaseRequestInnerId partial filter: '{}'", purchaseRequestInnerId);
                }
            }

            // Фильтр по типовой форме
            if (isTypicalForm != null) {
                predicates.add(cb.equal(root.get("isTypicalForm"), isTypicalForm));
                predicateCount++;
                logger.info("Added isTypicalForm filter: {}", isTypicalForm);
            }

            // Фильтр для вкладки "В работе": подготовил = договорник, статусы: null, Проект, На согласовании, На регистрации (без Подписан и Не согласован)
            // Договоры, исключённые из вкладки "В работе" (excludeFromInWork = true), не показываем в этой вкладке
            if (inWorkTab != null && inWorkTab) {
                jakarta.persistence.criteria.Join<Contract, com.uzproc.backend.entity.user.User> preparedByJoin = root.join("preparedBy", jakarta.persistence.criteria.JoinType.INNER);
                predicates.add(cb.equal(preparedByJoin.get("isContractor"), true));
                predicates.add(cb.or(
                    cb.isNull(root.get("status")),
                    cb.and(
                        cb.not(cb.equal(root.get("status"), ContractStatus.SIGNED)),
                        cb.not(cb.equal(root.get("status"), ContractStatus.NOT_COORDINATED))
                    )
                ));
                // Исключаем скрытые договоры
                predicates.add(cb.or(
                    cb.isNull(root.get("excludeFromInWork")),
                    cb.equal(root.get("excludeFromInWork"), false)
                ));
                predicateCount++;
                logger.info("Added inWorkTab filter: preparedBy.isContractor = true, statuses: null/Проект/На согласовании/На регистрации, excludeFromInWork = false/null");
            }

            // Фильтр для вкладки "Не согласованы": статус "Не согласован" и подготовил = договорник
            if (notCoordinatedTab != null && notCoordinatedTab) {
                predicates.add(cb.equal(root.get("status"), ContractStatus.NOT_COORDINATED));
                jakarta.persistence.criteria.Join<Contract, com.uzproc.backend.entity.user.User> preparedByJoin = root.join("preparedBy", jakarta.persistence.criteria.JoinType.INNER);
                predicates.add(cb.equal(preparedByJoin.get("isContractor"), true));
                predicateCount++;
                logger.info("Added notCoordinatedTab filter: status = Не согласован, preparedBy.isContractor = true");
            }

            // Фильтр для вкладки "Подписаны": статус "Подписан" и подготовил = договорник (isContractor = true)
            if (signedTab != null && signedTab) {
                predicates.add(cb.equal(root.get("status"), ContractStatus.SIGNED));
                jakarta.persistence.criteria.Join<Contract, com.uzproc.backend.entity.user.User> preparedByJoin = root.join("preparedBy", jakarta.persistence.criteria.JoinType.INNER);
                predicates.add(cb.equal(preparedByJoin.get("isContractor"), true));
                predicateCount++;
                logger.info("Added signedTab filter: status = Подписан, preparedBy.isContractor = true");
            }

            // Фильтр для вкладки "Скрытые": только договоры с excludeFromInWork = true
            if (hiddenTab != null && hiddenTab) {
                predicates.add(cb.equal(root.get("excludeFromInWork"), true));
                predicateCount++;
                logger.info("Added hiddenTab filter: excludeFromInWork = true");
            }

            // Фильтр по исполнителю (ФИО договорника)
            if (preparedByName != null && !preparedByName.trim().isEmpty()) {
                jakarta.persistence.criteria.Subquery<Long> subq = query.subquery(Long.class);
                jakarta.persistence.criteria.Root<com.uzproc.backend.entity.user.User> userRoot =
                    subq.from(com.uzproc.backend.entity.user.User.class);
                subq.select(userRoot.get("id"));
                jakarta.persistence.criteria.Expression<String> fullName = cb.trim(cb.concat(
                    cb.concat(cb.coalesce(userRoot.get("surname"), ""), " "),
                    cb.coalesce(userRoot.get("name"), "")
                ));
                subq.where(cb.equal(fullName, preparedByName.trim()));
                predicates.add(root.get("preparedById").in(subq));
                predicateCount++;
                logger.info("Added preparedByName filter: '{}'", preparedByName);
            }

            // Фильтр по организации заказчика
            if (customerOrganization != null && !customerOrganization.trim().isEmpty()) {
                try {
                    com.uzproc.backend.entity.contract.CustomerOrganization orgEnum =
                        com.uzproc.backend.entity.contract.CustomerOrganization.valueOf(customerOrganization.trim());
                    predicates.add(cb.equal(root.get("customerOrganization"), orgEnum));
                    predicateCount++;
                    logger.info("Added customerOrganization filter: {}", customerOrganization);
                } catch (IllegalArgumentException e) {
                    logger.warn("Invalid customerOrganization value ignored: {}", customerOrganization);
                }
            }

            // Фильтр по статусу (по отображаемому имени, LIKE)
            if (status != null && !status.trim().isEmpty()) {
                String statusLower = status.toLowerCase().trim();
                List<ContractStatus> matched = java.util.Arrays.stream(ContractStatus.values())
                    .filter(s -> s.getDisplayName().toLowerCase().contains(statusLower))
                    .collect(java.util.stream.Collectors.toList());
                if (!matched.isEmpty()) {
                    predicates.add(root.get("status").in(matched));
                    predicateCount++;
                    logger.info("Added status filter: '{}', matched: {}", status, matched);
                }
            }

            // Фильтр по поставщику (LIKE по имени, JOIN с suppliers)
            if (supplier != null && !supplier.trim().isEmpty()) {
                jakarta.persistence.criteria.Join<Contract, Supplier> supplierJoin =
                    root.join("suppliers", jakarta.persistence.criteria.JoinType.LEFT);
                predicates.add(cb.like(cb.lower(supplierJoin.get("name")), "%" + supplier.toLowerCase().trim() + "%"));
                if (query != null) query.distinct(true);
                predicateCount++;
                logger.info("Added supplier filter: '{}'", supplier);
            }

            logger.info("Total predicates: {}", predicateCount);
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSort(String sortBy, String sortDir) {
        if (sortBy == null || sortBy.trim().isEmpty()) {
            return Sort.by(Sort.Direction.DESC, "contractCreationDate");
        }
        
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) 
            ? Sort.Direction.ASC 
            : Sort.Direction.DESC;
        
        return Sort.by(direction, sortBy);
    }
}

