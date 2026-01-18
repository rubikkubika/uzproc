package com.uzproc.backend.service.purchaserequest;

import com.uzproc.backend.dto.contract.ContractDto;
import com.uzproc.backend.dto.purchaserequest.PurchaseRequestDto;
import com.uzproc.backend.dto.purchaserequest.PurchaserStatsDto;
import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.purchase.Purchase;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestApproval;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestStatus;
import com.uzproc.backend.repository.contract.ContractRepository;
import com.uzproc.backend.repository.csifeedback.CsiFeedbackRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestApprovalRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
import com.uzproc.backend.repository.purchase.PurchaseRepository;
import com.uzproc.backend.entity.csifeedback.CsiFeedback;
import com.uzproc.backend.service.contract.ContractService;
import com.uzproc.backend.service.purchaserequest.PurchaseRequestStatusUpdateService;
import java.util.stream.Collectors;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class PurchaseRequestService {

    private static final Logger logger = LoggerFactory.getLogger(PurchaseRequestService.class);
    
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PurchaseRequestApprovalRepository approvalRepository;
    private final PurchaseRepository purchaseRepository;
    private final ContractRepository contractRepository;
    private final ContractService contractService;
    private final PurchaseRequestStatusUpdateService statusUpdateService;
    private final CsiFeedbackRepository csiFeedbackRepository;
    
    @Value("${app.frontend.base-url:}")
    private String frontendBaseUrl;

    public PurchaseRequestService(
            PurchaseRequestRepository purchaseRequestRepository,
            PurchaseRequestApprovalRepository approvalRepository,
            PurchaseRepository purchaseRepository,
            ContractRepository contractRepository,
            ContractService contractService,
            PurchaseRequestStatusUpdateService statusUpdateService,
            CsiFeedbackRepository csiFeedbackRepository) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.approvalRepository = approvalRepository;
        this.purchaseRepository = purchaseRepository;
        this.contractRepository = contractRepository;
        this.contractService = contractService;
        this.statusUpdateService = statusUpdateService;
        this.csiFeedbackRepository = csiFeedbackRepository;
    }

    public Page<PurchaseRequestDto> findAll(
            int page,
            int size,
            Integer year,
            Integer month,
            String sortBy,
            String sortDir,
            Long idPurchaseRequest,
            List<String> cfo,
            String purchaseRequestInitiator,
            List<String> purchaser,
            String name,
            String costType,
            String contractType,
            Boolean isPlanned,
            Boolean requiresPurchase,
            List<String> status,
            Boolean excludePendingStatuses,
            java.math.BigDecimal budgetAmount,
            String budgetAmountOperator,
            Boolean excludeFromInWorkParam) {
        
        logger.info("=== FILTER REQUEST ===");
        logger.info("Filter parameters - year: {}, month: {}, idPurchaseRequest: {}, cfo: {}, purchaseRequestInitiator: '{}', purchaser: {}, name: '{}', costType: '{}', contractType: '{}', isPlanned: {}, requiresPurchase: {}, status: {}, excludePendingStatuses: {}, budgetAmount: {}, budgetAmountOperator: '{}', excludeFromInWorkParam: {}",
                year, month, idPurchaseRequest, cfo, purchaseRequestInitiator, purchaser, name, costType, contractType, isPlanned, requiresPurchase, status, excludePendingStatuses, budgetAmount, budgetAmountOperator, excludeFromInWorkParam);
        
        // Определяем логику фильтрации по excludeFromInWork:
        // 1. Если excludeFromInWorkParam = true передается как параметр запроса, то фильтруем по excludeFromInWork = true (показываем только скрытые)
        // 2. Если excludeFromInWorkParam = false передается как параметр запроса, то исключаем записи с excludeFromInWork = true (показываем только не скрытые)
        // 3. Если excludeFromInWorkParam не передан, но переданы статусы для вкладки "В работе", то исключаем записи с excludeFromInWork = true
        Boolean excludeFromInWorkFilter = null; // null = не фильтровать, true = только скрытые, false = только не скрытые
        boolean excludeFromInWork = false; // для исключения записей с excludeFromInWork = true
        
        logger.info("Processing excludeFromInWorkParam: {}", excludeFromInWorkParam);
        
        if (excludeFromInWorkParam != null) {
            if (excludeFromInWorkParam) {
                // Если передан параметр excludeFromInWork = true, фильтруем только скрытые заявки
                excludeFromInWorkFilter = true;
                logger.info("Filtering only hidden requests (excludeFromInWork = true)");
            } else {
                // Если передан параметр excludeFromInWork = false, исключаем скрытые заявки
                excludeFromInWorkFilter = false;
                logger.info("Filtering only non-hidden requests (excludeFromInWork = false or null)");
            }
        } else if (status != null && !status.isEmpty()) {
            // Если параметр не передан, но переданы статусы для вкладки "В работе", исключаем скрытые заявки
            List<String> inWorkStatuses = List.of(
                "Заявка на согласовании", "На согласовании",
                "Заявка у закупщика", "На утверждении",
                "Спецификация создана", "Спецификация на согласовании",
                "Закупка создана",
                "Договор создан",
                "Заявка утверждена", "Утверждена",
                "Закупка завершена"
            );
            // Проверяем, все ли переданные статусы относятся к вкладке "В работе"
            boolean allInWorkStatuses = status.stream().allMatch(s -> inWorkStatuses.contains(s));
            if (allInWorkStatuses) {
                excludeFromInWork = true;
                logger.info("Detected 'in-work' tab statuses - will exclude records with excludeFromInWork = true");
            }
        }
        
        Specification<PurchaseRequest> spec = buildSpecification(
                year, month, idPurchaseRequest, cfo, purchaseRequestInitiator, purchaser, name, costType, contractType, isPlanned, requiresPurchase, status, excludePendingStatuses, budgetAmount, budgetAmountOperator, excludeFromInWork, excludeFromInWorkFilter);
        
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<PurchaseRequest> purchaseRequests = purchaseRequestRepository.findAll(spec, pageable);
        
        logger.info("Query result - Found {} purchase requests on page {} (size {}), total elements: {}",
                purchaseRequests.getContent().size(), page, size, purchaseRequests.getTotalElements());
        logger.info("=== END FILTER REQUEST ===\n");
        
        // Конвертируем entity в DTO
        Page<PurchaseRequestDto> dtoPage = purchaseRequests.map(this::toDto);
        
        return dtoPage;
    }

    public PurchaseRequestDto findById(Long id) {
        PurchaseRequest purchaseRequest = purchaseRequestRepository.findById(id)
                .orElse(null);
        if (purchaseRequest == null) {
            return null;
        }
        return toDto(purchaseRequest);
    }

    public PurchaseRequestDto findByIdPurchaseRequest(Long idPurchaseRequest) {
        PurchaseRequest purchaseRequest = purchaseRequestRepository.findByIdPurchaseRequest(idPurchaseRequest)
                .orElse(null);
        if (purchaseRequest == null) {
            return null;
        }
        return toDto(purchaseRequest);
    }

    /**
     * Подсчитывает количество записей для каждой вкладки
     * @return Map с ключами: "all", "in-work", "completed", "project-rejected"
     */
    public Map<String, Long> getTabCounts(
            Integer year,
            Long idPurchaseRequest,
            List<String> cfo,
            String purchaseRequestInitiator,
            List<String> purchaser,
            String name,
            String costType,
            String contractType,
            Boolean isPlanned,
            Boolean requiresPurchase,
            java.math.BigDecimal budgetAmount,
            String budgetAmountOperator) {
        
        Map<String, Long> counts = new HashMap<>();
        
        // Определяем статусы для каждой вкладки
        List<String> inWorkStatuses = List.of(
            "Заявка на согласовании", "На согласовании",
            "Заявка у закупщика", "На утверждении",
            "Спецификация создана", "Спецификация на согласовании",
            "Закупка создана",
            "Договор создан",
            "Заявка утверждена", "Утверждена",
            "Закупка завершена"
        );
        List<String> completedStatuses = List.of(
            "Спецификация подписана",
            "Договор подписан"
        );
        List<String> projectRejectedStatuses = List.of(
            "Проект", "Заявка не согласована", "Заявка не утверждена", "Закупка не согласована", "Спецификация создана - Архив"
        );
        
        // Подсчитываем для каждой вкладки
        counts.put("all", countWithFilters(year, idPurchaseRequest, cfo, purchaseRequestInitiator, purchaser,
            name, costType, contractType, isPlanned, requiresPurchase, null, budgetAmount, budgetAmountOperator, false));
        // Для вкладки "В работе" исключаем записи с excludeFromInWork = true
        counts.put("in-work", countWithFilters(year, idPurchaseRequest, cfo, purchaseRequestInitiator, purchaser,
            name, costType, contractType, isPlanned, requiresPurchase, inWorkStatuses, budgetAmount, budgetAmountOperator, true));
        counts.put("completed", countWithFilters(year, idPurchaseRequest, cfo, purchaseRequestInitiator, purchaser,
            name, costType, contractType, isPlanned, requiresPurchase, completedStatuses, budgetAmount, budgetAmountOperator, false));
        counts.put("project-rejected", countWithFilters(year, idPurchaseRequest, cfo, purchaseRequestInitiator, purchaser,
            name, costType, contractType, isPlanned, requiresPurchase, projectRejectedStatuses, budgetAmount, budgetAmountOperator, false));
        
        return counts;
    }

    /**
     * Подсчитывает количество записей с применением фильтров
     */
    private long countWithFilters(
            Integer year,
            Long idPurchaseRequest,
            List<String> cfo,
            String purchaseRequestInitiator,
            List<String> purchaser,
            String name,
            String costType,
            String contractType,
            Boolean isPlanned,
            Boolean requiresPurchase,
            List<String> status,
            java.math.BigDecimal budgetAmount,
            String budgetAmountOperator,
            boolean excludeFromInWork) {
        
        Specification<PurchaseRequest> spec = buildSpecification(
            year, null, idPurchaseRequest, cfo, purchaseRequestInitiator, purchaser,
            name, costType, contractType, isPlanned, requiresPurchase, status,
            false, budgetAmount, budgetAmountOperator, excludeFromInWork, null);
        
        return purchaseRequestRepository.count(spec);
    }

    /**
     * Конвертирует PurchaseRequest entity в PurchaseRequestDto
     */
    private PurchaseRequestDto toDto(PurchaseRequest entity) {
        PurchaseRequestDto dto = new PurchaseRequestDto();
        dto.setId(entity.getId());
        dto.setGuid(entity.getGuid());
        dto.setIdPurchaseRequest(entity.getIdPurchaseRequest());
        dto.setPurchaseRequestCreationDate(entity.getPurchaseRequestCreationDate());
        dto.setInnerId(entity.getInnerId());
        dto.setName(entity.getName());
        dto.setTitle(entity.getTitle());
        dto.setPurchaseRequestPlanYear(entity.getPurchaseRequestPlanYear());
        dto.setCompany(entity.getCompany());
        dto.setCfo(entity.getCfo() != null ? entity.getCfo().getName() : null);
        dto.setMcc(entity.getMcc());
        dto.setPurchaseRequestInitiator(entity.getPurchaseRequestInitiator());
        dto.setPurchaser(entity.getPurchaser());
        dto.setPurchaseRequestSubject(entity.getPurchaseRequestSubject());
        dto.setBudgetAmount(entity.getBudgetAmount());
        dto.setCurrency(entity.getCurrency());
        dto.setCostType(entity.getCostType());
        dto.setContractType(entity.getContractType());
        dto.setContractDurationMonths(entity.getContractDurationMonths());
        dto.setIsPlanned(entity.getIsPlanned());
        dto.setRequiresPurchase(entity.getRequiresPurchase());
        dto.setStatus(entity.getStatus());
        dto.setState(entity.getState());
        dto.setExpenseItem(entity.getExpenseItem());
        dto.setExcludeFromInWork(entity.getExcludeFromInWork());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        
        // Срок с даты создания: количество рабочих дней между датой создания заявки и сегодня (для всех заявок)
        LocalDate creationDate = null;
        if (entity.getPurchaseRequestCreationDate() != null) {
            creationDate = entity.getPurchaseRequestCreationDate().toLocalDate();
        } else if (entity.getCreatedAt() != null) {
            creationDate = entity.getCreatedAt().toLocalDate();
        }
        if (creationDate != null) {
            long daysSinceCreation = calculateWorkingDays(creationDate, LocalDate.now());
            dto.setDaysSinceCreation(daysSinceCreation);
        }
        
        // Рассчитываем рабочие дни в статусе только для закупок (requiresPurchase !== false)
        if (entity.getRequiresPurchase() != null && entity.getRequiresPurchase() != false) {
            // Срок в статусе: количество рабочих дней между датой обновления статуса и сегодня
            if (entity.getUpdatedAt() != null) {
                long daysInStatus = calculateWorkingDays(entity.getUpdatedAt().toLocalDate(), LocalDate.now());
                dto.setDaysInStatus(daysInStatus);
            }
        }
        
        // Загружаем связанные закупки по idPurchaseRequest
        if (entity.getIdPurchaseRequest() != null) {
            List<com.uzproc.backend.entity.purchase.Purchase> purchases = purchaseRepository.findByPurchaseRequestId(entity.getIdPurchaseRequest());
            List<Long> purchaseIds = purchases.stream()
                    .map(com.uzproc.backend.entity.purchase.Purchase::getId)
                    .collect(Collectors.toList());
            dto.setPurchaseIds(purchaseIds);
            
            // Проверяем, есть ли закупка со статусом "Завершена"
            boolean hasCompletedPurchase = purchases.stream()
                    .anyMatch(p -> p.getStatus() != null && 
                            p.getStatus().getDisplayName().equals("Завершена"));
            dto.setHasCompletedPurchase(hasCompletedPurchase);
            
            // Загружаем связанные договоры:
            // 1. Напрямую по purchaseRequestId
            List<Contract> contracts = new ArrayList<>(contractRepository.findByPurchaseRequestId(entity.getIdPurchaseRequest()));
            
            // 2. Через закупки по contractInnerIds (договоры связаны с закупками через innerId)
            Set<Long> contractIds = new HashSet<>();
            for (com.uzproc.backend.entity.purchase.Purchase purchase : purchases) {
                // Обрабатываем множественные договоры для каждой закупки
                if (purchase.getContractInnerIds() != null && !purchase.getContractInnerIds().isEmpty()) {
                    for (String contractInnerId : purchase.getContractInnerIds()) {
                        if (contractInnerId != null && !contractInnerId.trim().isEmpty()) {
                            contractRepository.findByInnerId(contractInnerId.trim()).ifPresent(contract -> {
                                if (!contractIds.contains(contract.getId())) {
                                    contracts.add(contract);
                                    contractIds.add(contract.getId());
                                }
                            });
                        }
                    }
                }
            }
            
            // Преобразуем в DTO и убираем дубликаты по ID
            Set<Long> addedContractIds = new HashSet<>();
            List<ContractDto> contractDtos = contracts.stream()
                    .filter(contract -> {
                        if (addedContractIds.contains(contract.getId())) {
                            return false;
                        }
                        addedContractIds.add(contract.getId());
                        return true;
                    })
                    .map(contract -> contractService.toDto(contract))
                    .collect(Collectors.toList());
            dto.setContracts(contractDtos);
        } else {
            dto.setPurchaseIds(new ArrayList<>());
            dto.setContracts(new ArrayList<>());
        }
        
        // Генерируем ссылку на форму CSI обратной связи
        if (entity.getCsiToken() != null && !entity.getCsiToken().isEmpty()) {
            // Формируем полную ссылку с учетом окружения: {baseUrl}/csi/feedback/{token}
            // baseUrl берется из переменной окружения FRONTEND_BASE_URL или из application.yml
            String csiPath = "/csi/feedback/" + entity.getCsiToken();
            // Убираем завершающий слэш из baseUrl, если он есть
            String baseUrl = determineFrontendBaseUrl();
            String csiLink = baseUrl + csiPath;
            dto.setCsiLink(csiLink);
            logger.debug("Generated CSI link for request {}: {} (using baseUrl: {})", 
                entity.getIdPurchaseRequest(), csiLink, baseUrl);
        }

        // Устанавливаем флаг отправки приглашения на оценку CSI
        dto.setCsiInvitationSent(entity.getCsiInvitationSent());

        // Проверяем наличие оценки CSI и вычисляем среднюю оценку (без uzprocRating)
        List<CsiFeedback> feedbacks = csiFeedbackRepository.findByPurchaseRequestId(entity.getId());
        if (!feedbacks.isEmpty()) {
            dto.setHasFeedback(true);
            // Вычисляем среднюю оценку по всем вопросам кроме uzprocRating
            double sum = 0.0;
            int count = 0;
            for (CsiFeedback feedback : feedbacks) {
                if (feedback.getSpeedRating() != null) {
                    sum += feedback.getSpeedRating();
                    count++;
                }
                if (feedback.getQualityRating() != null) {
                    sum += feedback.getQualityRating();
                    count++;
                }
                if (feedback.getSatisfactionRating() != null) {
                    sum += feedback.getSatisfactionRating();
                    count++;
                }
            }
            if (count > 0) {
                dto.setAverageRating(sum / count);
            } else {
                dto.setAverageRating(null);
            }
        } else {
            dto.setHasFeedback(false);
            dto.setAverageRating(null);
        }
        
        return dto;
    }

    private Specification<PurchaseRequest> buildSpecification(
            Integer year,
            Integer month,
            Long idPurchaseRequest,
            List<String> cfo,
            String purchaseRequestInitiator,
            List<String> purchaser,
            String name,
            String costType,
            String contractType,
            Boolean isPlanned,
            Boolean requiresPurchase,
            List<String> status,
            Boolean excludePendingStatuses,
            java.math.BigDecimal budgetAmount,
            String budgetAmountOperator,
            boolean excludeFromInWork,
            Boolean excludeFromInWorkFilter) {
        
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            int predicateCount = 0;
            
            // Фильтр по году и месяцу (по дате создания заявки - purchaseRequestCreationDate)
            if (year != null) {
                if (month != null && month >= 1 && month <= 12) {
                    // Фильтр по конкретному месяцу
                    java.time.LocalDateTime startOfMonth = java.time.LocalDateTime.of(year, month, 1, 0, 0);
                    java.time.LocalDateTime endOfMonth = java.time.LocalDateTime.of(year, month, 
                        java.time.YearMonth.of(year, month).lengthOfMonth(), 23, 59, 59, 999999999);
                    predicates.add(cb.and(
                        cb.isNotNull(root.get("purchaseRequestCreationDate")),
                        cb.greaterThanOrEqualTo(root.get("purchaseRequestCreationDate"), startOfMonth),
                        cb.lessThanOrEqualTo(root.get("purchaseRequestCreationDate"), endOfMonth)
                    ));
                    predicateCount++;
                    logger.info("Added year and month filter (by purchaseRequestCreationDate): {} year, {} month ({} - {})", 
                        year, month, startOfMonth, endOfMonth);
                } else {
                    // Фильтр только по году
                java.time.LocalDateTime startOfYear = java.time.LocalDateTime.of(year, 1, 1, 0, 0);
                java.time.LocalDateTime endOfYear = java.time.LocalDateTime.of(year, 12, 31, 23, 59, 59, 999999999);
                predicates.add(cb.and(
                    cb.isNotNull(root.get("purchaseRequestCreationDate")),
                    cb.greaterThanOrEqualTo(root.get("purchaseRequestCreationDate"), startOfYear),
                    cb.lessThanOrEqualTo(root.get("purchaseRequestCreationDate"), endOfYear)
                ));
                predicateCount++;
                logger.info("Added year filter (by purchaseRequestCreationDate): {} (January - December), excluding null dates", year);
                }
            }
            
            // Фильтр по номеру заявки
            if (idPurchaseRequest != null) {
                predicates.add(cb.equal(root.get("idPurchaseRequest"), idPurchaseRequest));
                predicateCount++;
                logger.info("Added idPurchaseRequest filter: {}", idPurchaseRequest);
            }
            
            // Фильтр по ЦФО (поддержка множественного выбора - точное совпадение)
            if (cfo != null && !cfo.isEmpty()) {
                // Убираем пустые значения и тримим
                List<String> validCfoValues = cfo.stream()
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .map(String::trim)
                    .toList();
                
                if (!validCfoValues.isEmpty()) {
                    // Делаем join к связанной сущности Cfo и фильтруем по name
                    jakarta.persistence.criteria.Join<PurchaseRequest, com.uzproc.backend.entity.Cfo> cfoJoin = root.join("cfo", jakarta.persistence.criteria.JoinType.LEFT);
                    predicates.add(cb.lower(cfoJoin.get("name")).in(
                        validCfoValues.stream().map(String::toLowerCase).toList()
                    ));
                        predicateCount++;
                    logger.info("Added cfo filter: {}", validCfoValues);
                }
            }
            
            // Фильтр по инициатору (частичное совпадение, case-insensitive)
            if (purchaseRequestInitiator != null && !purchaseRequestInitiator.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("purchaseRequestInitiator")), "%" + purchaseRequestInitiator.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added purchaseRequestInitiator filter: '{}'", purchaseRequestInitiator);
            }
            
            // Фильтр по закупщику (множественный выбор, точное совпадение, case-insensitive)
            // ВАЖНО: используем trim на стороне БД, т.к. в данных могут быть хвостовые пробелы
            if (purchaser != null && !purchaser.isEmpty()) {
                List<String> validPurchaserValues = purchaser.stream()
                        .filter(s -> s != null && !s.trim().isEmpty())
                        .map(String::trim)
                        .toList();
                
                if (!validPurchaserValues.isEmpty()) {
                    // Проверяем, есть ли среди значений "Не назначен"
                    boolean hasUnassigned = validPurchaserValues.stream()
                            .anyMatch(v -> v.equalsIgnoreCase("Не назначен"));
                    
                    // Разделяем значения на "Не назначен" и остальные
                    List<String> assignedPurchasers = validPurchaserValues.stream()
                            .filter(v -> !v.equalsIgnoreCase("Не назначен"))
                            .toList();
                    
                    List<Predicate> purchaserPredicates = new ArrayList<>();
                    
                    // Если есть "Не назначен", добавляем условие для null и пустых строк
                    if (hasUnassigned) {
                        purchaserPredicates.add(cb.or(
                                cb.isNull(root.get("purchaser")),
                                cb.equal(root.get("purchaser"), "")
                        ));
                        logger.info("Added 'Не назначен' filter (null or empty purchaser)");
                    }
                    
                    // Добавляем условия для назначенных закупщиков
                    if (!assignedPurchasers.isEmpty()) {
                        var purchaserExpr = cb.lower(root.get("purchaser"));
                        List<String> lowerPurchaserValues = assignedPurchasers.stream()
                                .map(String::toLowerCase)
                                .toList();
                        
                        if (lowerPurchaserValues.size() == 1) {
                            // Используем LIKE для обработки возможных хвостовых пробелов
                            purchaserPredicates.add(cb.like(
                                    purchaserExpr,
                                    lowerPurchaserValues.get(0) + "%"
                            ));
                            logger.info("Added single purchaser filter (using LIKE): '{}'", assignedPurchasers.get(0));
                        } else {
                            // Для множественного выбора используем OR с LIKE для каждого значения
                            List<Predicate> assignedPredicates = lowerPurchaserValues.stream()
                                    .map(p -> cb.like(purchaserExpr, p + "%"))
                                    .toList();
                            purchaserPredicates.add(cb.or(assignedPredicates.toArray(new Predicate[0])));
                            logger.info("Added multiple purchaser filter (using OR with LIKE): {}", assignedPurchasers);
                        }
                    }
                    
                    // Объединяем все условия через OR
                    if (!purchaserPredicates.isEmpty()) {
                        if (purchaserPredicates.size() == 1) {
                            predicates.add(purchaserPredicates.get(0));
                        } else {
                            predicates.add(cb.or(purchaserPredicates.toArray(new Predicate[0])));
                        }
                        predicateCount++;
                    }
                }
            }
            
            // Фильтр по наименованию (частичное совпадение, case-insensitive)
            if (name != null && !name.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added name filter: '{}'", name);
            }
            
            // Фильтр по типу затрат (точное совпадение)
            if (costType != null && !costType.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("costType"), costType));
                predicateCount++;
                logger.info("Added costType filter: '{}'", costType);
            }
            
            // Фильтр по типу договора (точное совпадение)
            if (contractType != null && !contractType.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("contractType"), contractType));
                predicateCount++;
                logger.info("Added contractType filter: '{}'", contractType);
            }
            
            // Фильтр по плану
            if (isPlanned != null) {
                predicates.add(cb.equal(root.get("isPlanned"), isPlanned));
                predicateCount++;
                logger.info("Added isPlanned filter: {}", isPlanned);
            }
            
            // Фильтр по требуется закупка
            if (requiresPurchase != null) {
                predicates.add(cb.equal(root.get("requiresPurchase"), requiresPurchase));
                predicateCount++;
                logger.info("Added requiresPurchase filter: {}", requiresPurchase);
                
                // ВАЖНО: Если фильтруем по requiresPurchase и НЕ указан явный фильтр по статусам,
                // исключаем заявки со статусами "Не согласована", "Не утверждена", "Проект"
                // НО включаем заявки с null статусом (они тоже показываются в диаграмме)
                // Это соответствует логике getYearlyStats, где эти статусы учитываются отдельно
                if (status == null || status.isEmpty()) {
                    List<PurchaseRequestStatus> excludedStatuses = List.of(
                        PurchaseRequestStatus.NOT_COORDINATED,
                        PurchaseRequestStatus.NOT_APPROVED,
                        PurchaseRequestStatus.PROJECT
                    );
                    // Исключаем только те записи, у которых статус явно равен одному из исключаемых
                    // Записи с null статусом не исключаются
                    predicates.add(cb.or(
                        cb.isNull(root.get("status")),
                        cb.not(root.get("status").in(excludedStatuses))
                    ));
                    predicateCount++;
                    logger.info("Excluded pending statuses (NOT_COORDINATED, NOT_APPROVED, PROJECT) from requiresPurchase filter, but included null statuses");
                }
            } else if (excludePendingStatuses != null && excludePendingStatuses && (status == null || status.isEmpty())) {
                // Если requiresPurchase не указан, но excludePendingStatuses = true, исключаем статусы
                // Это используется для "Заявки на закупку", где нужно показать все заявки, но без статусов "Не согласована", "Не утверждена", "Проект"
                // НО включаем заявки с null статусом (они тоже показываются в диаграмме)
                List<PurchaseRequestStatus> excludedStatuses = List.of(
                    PurchaseRequestStatus.NOT_COORDINATED,
                    PurchaseRequestStatus.NOT_APPROVED,
                    PurchaseRequestStatus.PROJECT
                );
                // Исключаем только те записи, у которых статус явно равен одному из исключаемых
                // Записи с null статусом не исключаются
                predicates.add(cb.or(
                    cb.isNull(root.get("status")),
                    cb.not(root.get("status").in(excludedStatuses))
                ));
                predicateCount++;
                logger.info("Excluded pending statuses (NOT_COORDINATED, NOT_APPROVED, PROJECT) due to excludePendingStatuses=true, but included null statuses");
            }
            
            // Фильтр по статусу (множественный выбор)
            // Если excludeFromInWorkFilter = true (вкладка "Скрытые"), не применяем фильтр по статусу
            // Показываем все скрытые заявки независимо от статуса
            // Для всех остальных случаев (включая excludeFromInWorkFilter = false) применяем фильтр по статусам
            if (status != null && !status.isEmpty() && excludeFromInWorkFilter != Boolean.TRUE) {
                // Убираем пустые значения и тримим
                List<String> validStatusValues = status.stream()
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .map(String::trim)
                    .toList();
                
                if (!validStatusValues.isEmpty()) {
                    // Преобразуем русские названия в enum значения
                    List<PurchaseRequestStatus> statusEnums = validStatusValues.stream()
                        .map(statusStr -> {
                            // Ищем enum по displayName
                            for (PurchaseRequestStatus statusEnum : PurchaseRequestStatus.values()) {
                                if (statusEnum.getDisplayName().equals(statusStr)) {
                                    return statusEnum;
                                }
                            }
                            logger.warn("Status '{}' not found in PurchaseRequestStatus enum. Available statuses: {}", 
                                statusStr, 
                                java.util.Arrays.stream(PurchaseRequestStatus.values())
                                    .map(PurchaseRequestStatus::getDisplayName)
                                    .collect(Collectors.toList()));
                            return null;
                        })
                        .filter(s -> s != null)
                        .collect(Collectors.toList());
                    
                    logger.info("Status filter: received {} status values, found {} matching enum values", 
                        validStatusValues.size(), statusEnums.size());
                    
                    if (!statusEnums.isEmpty()) {
                        if (statusEnums.size() == 1) {
                            // Одно значение - точное совпадение (БЕЗ null)
                            predicates.add(cb.equal(root.get("status"), statusEnums.get(0)));
                            predicateCount++;
                            logger.info("Added single status filter: '{}' (exact match only)", statusEnums.get(0).getDisplayName());
                        } else {
                            // Несколько значений - IN запрос (БЕЗ null)
                            predicates.add(root.get("status").in(statusEnums));
                            predicateCount++;
                            logger.info("Added multiple status filter: {} (exact match only)", statusEnums.stream()
                                .map(PurchaseRequestStatus::getDisplayName)
                                .collect(Collectors.toList()));
                        }
                    } else {
                        // Если ни один статус не найден в enum, но статусы были переданы,
                        // возможно они хранятся в поле state - исключаем "Исключена"
                        logger.warn("No matching status enums found, but status filter was provided. Excluding 'Исключена' from state field.");
                        predicates.add(cb.or(
                            cb.isNull(root.get("state")),
                            cb.not(cb.like(cb.lower(root.get("state")), "%неактуальн%"))
                        ));
                        predicateCount++;
                    }
                }
            } else {
                // Если статус фильтр не указан, исключаем записи с state содержащим "Исключена" по умолчанию
                predicates.add(cb.or(
                    cb.isNull(root.get("state")),
                    cb.not(cb.like(cb.lower(root.get("state")), "%исключена%"))
                ));
                predicateCount++;
                logger.info("No status filter provided - excluding records with state containing 'Исключена' by default");
            }
            
            // Фильтр по бюджету с оператором
            if (budgetAmount != null && budgetAmountOperator != null && !budgetAmountOperator.trim().isEmpty()) {
                String operator = budgetAmountOperator.trim().toLowerCase();
                logger.info("Processing budgetAmount filter: operator='{}', value={}", operator, budgetAmount);
                
                // Исключаем записи с null значениями budgetAmount
                predicates.add(cb.isNotNull(root.get("budgetAmount")));
                predicateCount++;
                
                switch (operator) {
                    case "gt":
                        predicates.add(cb.greaterThan(root.get("budgetAmount"), budgetAmount));
                        predicateCount++;
                        logger.info("Added budgetAmount filter: > {} (excluding null values)", budgetAmount);
                        break;
                    case "gte":
                        predicates.add(cb.greaterThanOrEqualTo(root.get("budgetAmount"), budgetAmount));
                        predicateCount++;
                        logger.info("Added budgetAmount filter: >= {} (excluding null values)", budgetAmount);
                        break;
                    case "lt":
                        predicates.add(cb.lessThan(root.get("budgetAmount"), budgetAmount));
                        predicateCount++;
                        logger.info("Added budgetAmount filter: < {} (excluding null values)", budgetAmount);
                        break;
                    case "lte":
                        predicates.add(cb.lessThanOrEqualTo(root.get("budgetAmount"), budgetAmount));
                        predicateCount++;
                        logger.info("Added budgetAmount filter: <= {} (excluding null values)", budgetAmount);
                        break;
                    default:
                        logger.warn("Unknown budgetAmountOperator: '{}', using >= as default", operator);
                        predicates.add(cb.greaterThanOrEqualTo(root.get("budgetAmount"), budgetAmount));
                        predicateCount++;
                        logger.info("Added budgetAmount filter: >= {} (default, excluding null values)", budgetAmount);
                        break;
                }
            } else {
                logger.info("Budget filter not applied: budgetAmount={}, budgetAmountOperator='{}'", 
                        budgetAmount, budgetAmountOperator);
            }
            
            // Фильтр по excludeFromInWork
            if (excludeFromInWorkFilter != null) {
                // Если excludeFromInWorkFilter = true, показываем только скрытые заявки (excludeFromInWork = true)
                // Если excludeFromInWorkFilter = false, показываем только не скрытые заявки (excludeFromInWork = false или null)
                if (excludeFromInWorkFilter) {
                    predicates.add(cb.equal(root.get("excludeFromInWork"), true));
                    predicateCount++;
                    logger.info("Filtering only hidden requests (excludeFromInWork = true)");
                } else {
                    predicates.add(cb.or(
                        cb.isNull(root.get("excludeFromInWork")),
                        cb.equal(root.get("excludeFromInWork"), false)
                    ));
                    predicateCount++;
                    logger.info("Filtering only non-hidden requests (excludeFromInWork = false or null)");
                }
            } else if (excludeFromInWork) {
                // Для вкладки "В работе" исключаем записи с excludeFromInWork = true
                predicates.add(cb.or(
                    cb.isNull(root.get("excludeFromInWork")),
                    cb.equal(root.get("excludeFromInWork"), false)
                ));
                predicateCount++;
                logger.info("Excluding records with excludeFromInWork = true from in-work tab");
            }
            
            logger.info("Total predicates added: {}", predicateCount);
            
            if (predicates.isEmpty()) {
                logger.info("No filters applied - returning all records");
                return cb.conjunction(); // Возвращаем пустое условие (все записи)
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSort(String sortBy, String sortDir) {
        if (sortBy != null && !sortBy.trim().isEmpty()) {
            Sort.Direction direction = (sortDir != null && sortDir.equalsIgnoreCase("desc")) 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
            return Sort.by(direction, sortBy);
        }
        return Sort.unsorted();
    }

    @Transactional
    public PurchaseRequestDto updateExcludeFromInWork(Long idPurchaseRequest, Boolean excludeFromInWork) {
        PurchaseRequest purchaseRequest = purchaseRequestRepository.findByIdPurchaseRequest(idPurchaseRequest)
                .orElse(null);
        if (purchaseRequest == null) {
            return null;
        }
        purchaseRequest.setExcludeFromInWork(excludeFromInWork);
        PurchaseRequest saved = purchaseRequestRepository.save(purchaseRequest);
        logger.info("Updated excludeFromInWork for purchase request {}: {}", idPurchaseRequest, excludeFromInWork);
        return toDto(saved);
    }

    @Transactional
    public PurchaseRequestDto updatePurchaser(Long idPurchaseRequest, String purchaser) {
        PurchaseRequest purchaseRequest = purchaseRequestRepository.findByIdPurchaseRequest(idPurchaseRequest)
                .orElse(null);
        if (purchaseRequest == null) {
            return null;
        }
        // Если purchaser - пустая строка или null, устанавливаем null
        String purchaserValue = (purchaser != null && !purchaser.trim().isEmpty()) ? purchaser.trim() : null;
        purchaseRequest.setPurchaser(purchaserValue);
        PurchaseRequest saved = purchaseRequestRepository.save(purchaseRequest);
        logger.info("Updated purchaser for purchase request {}: {}", idPurchaseRequest, purchaserValue);
        return toDto(saved);
    }

    /**
     * Обновляет статус заявки на закупку на основе согласований
     * Делегирует вызов в PurchaseRequestStatusUpdateService
     * 
     * @param idPurchaseRequest ID заявки на закупку
     * @deprecated Используйте PurchaseRequestStatusUpdateService.updateStatus() напрямую
     */
    @Deprecated
    @Transactional
    public void updateStatusBasedOnApprovals(Long idPurchaseRequest) {
        statusUpdateService.updateStatus(idPurchaseRequest);
    }


    /**
     * Получить статистику по закупщикам для закупок (requiresPurchase != false)
     */
    public List<PurchaserStatsDto> getPurchasesStatsByPurchaser(Integer year) {
        List<PurchaseRequest> allRequests;
        
        if (year != null) {
            // Фильтруем по году
            LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
            LocalDateTime endOfYear = LocalDateTime.of(year, 12, 31, 23, 59, 59);
            Specification<PurchaseRequest> yearSpec = (root, query, cb) -> 
                cb.between(root.get("purchaseRequestCreationDate"), startOfYear, endOfYear);
            allRequests = purchaseRequestRepository.findAll(yearSpec);
            logger.debug("Filtering purchases by year {}: found {} requests", year, allRequests.size());
        } else {
            allRequests = purchaseRequestRepository.findAll();
            logger.debug("Loading all purchases: found {} requests", allRequests.size());
        }
        
        // Фильтруем только закупки (requiresPurchase != false)
        List<PurchaseRequest> purchases = allRequests.stream()
            .filter(pr -> pr.getRequiresPurchase() != null && pr.getRequiresPurchase() != false)
            .filter(pr -> pr.getPurchaser() != null && !pr.getPurchaser().trim().isEmpty())
            .collect(Collectors.toList());
        
        logger.debug("Filtered purchases (requiresPurchase != false): {} requests", purchases.size());
        return calculateStatsByPurchaser(purchases);
    }

    /**
     * Получить статистику по закупщикам для заказов (requiresPurchase == false)
     */
    public List<PurchaserStatsDto> getOrdersStatsByPurchaser(Integer year) {
        List<PurchaseRequest> allRequests;
        
        if (year != null) {
            // Фильтруем по году
            LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
            LocalDateTime endOfYear = LocalDateTime.of(year, 12, 31, 23, 59, 59);
            Specification<PurchaseRequest> yearSpec = (root, query, cb) -> 
                cb.between(root.get("purchaseRequestCreationDate"), startOfYear, endOfYear);
            allRequests = purchaseRequestRepository.findAll(yearSpec);
            logger.debug("Filtering orders by year {}: found {} requests", year, allRequests.size());
        } else {
            allRequests = purchaseRequestRepository.findAll();
            logger.debug("Loading all orders: found {} requests", allRequests.size());
        }
        
        // Фильтруем только заказы (requiresPurchase == false)
        List<PurchaseRequest> orders = allRequests.stream()
            .filter(pr -> pr.getRequiresPurchase() != null && pr.getRequiresPurchase() == false)
            .filter(pr -> pr.getPurchaser() != null && !pr.getPurchaser().trim().isEmpty())
            .collect(Collectors.toList());
        
        logger.debug("Filtered orders (requiresPurchase == false): {} requests", orders.size());
        return calculateStatsByPurchaser(orders);
    }

    /**
     * Рассчитать статистику по закупщикам
     */
    private List<PurchaserStatsDto> calculateStatsByPurchaser(List<PurchaseRequest> requests) {
        Map<String, StatsData> statsMap = new HashMap<>();
        
        for (PurchaseRequest pr : requests) {
            String purchaser = pr.getPurchaser() != null ? pr.getPurchaser().trim() : "Не назначен";
            if (purchaser.isEmpty()) {
                purchaser = "Не назначен";
            }
            
            StatsData stats = statsMap.computeIfAbsent(purchaser, k -> new StatsData());
            stats.total++;
            
            // Определяем статус
            PurchaseRequestStatus status = pr.getStatus();
            if (status == PurchaseRequestStatus.APPROVED || status == PurchaseRequestStatus.COORDINATED) {
                stats.completed++;
            } else if (status != null && status != PurchaseRequestStatus.NOT_COORDINATED && status != PurchaseRequestStatus.NOT_APPROVED) {
                stats.active++;
            }
            
            // Сумма
            if (pr.getBudgetAmount() != null) {
                stats.totalAmount = stats.totalAmount.add(pr.getBudgetAmount());
            }
            
            // Дни согласования (если есть дата создания)
            if (pr.getPurchaseRequestCreationDate() != null && pr.getUpdatedAt() != null) {
                Duration duration = Duration.between(pr.getPurchaseRequestCreationDate(), pr.getUpdatedAt());
                long days = duration.toDays();
                if (days > 0) {
                    stats.totalDays += days;
                    stats.requestsWithDays++;
                }
            }
        }
        
        // Конвертируем в DTO
        return statsMap.entrySet().stream()
            .map(entry -> {
                StatsData data = entry.getValue();
                long averageDays = data.requestsWithDays > 0 
                    ? data.totalDays / data.requestsWithDays 
                    : 0;
                
                return new PurchaserStatsDto(
                    entry.getKey(),
                    data.total,
                    data.active,
                    data.completed,
                    averageDays,
                    data.totalAmount
                );
            })
            .sorted((a, b) -> Long.compare(
                (b.getActivePurchases() + b.getTotalPurchases()),
                (a.getActivePurchases() + a.getTotalPurchases())
            ))
            .collect(Collectors.toList());
    }
    
    /**
     * Получить список доступных годов из purchaseRequestCreationDate
     */
    public List<Integer> getAvailableYears(Boolean requiresPurchase) {
        Specification<PurchaseRequest> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (requiresPurchase != null && requiresPurchase) {
                predicates.add(cb.equal(root.get("requiresPurchase"), true));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
        
        List<PurchaseRequest> requests = purchaseRequestRepository.findAll(spec);
        return requests.stream()
            .map(PurchaseRequest::getPurchaseRequestCreationDate)
            .filter(date -> date != null)
            .map(LocalDateTime::getYear)
            .distinct()
            .sorted((a, b) -> b.compareTo(a)) // Сортировка по убыванию
            .collect(Collectors.toList());
    }

    /**
     * Получить статистику по годам: количество закупок и заказов по каждому году
     * @return Map с ключами: years (список годов), purchases (список количеств закупок), orders (список количеств заказов), pendingStatus (список количеств заявок со статусами "Не согласована", "Не утверждена", "Проект")
     */
    public Map<String, Object> getYearlyStats() {
        List<PurchaseRequest> allRequests = purchaseRequestRepository.findAll();
        
        // Группируем по годам
        Map<Integer, Long> purchasesByYear = new HashMap<>();
        Map<Integer, Long> ordersByYear = new HashMap<>();
        Map<Integer, Long> pendingStatusByYear = new HashMap<>();
        
        for (PurchaseRequest request : allRequests) {
            if (request.getPurchaseRequestCreationDate() == null) {
                continue;
            }
            
            int year = request.getPurchaseRequestCreationDate().getYear();
            
            // Проверяем статусы: "Не согласована", "Не утверждена", "Проект"
            boolean isPendingStatus = request.getStatus() != null && (
                request.getStatus() == PurchaseRequestStatus.NOT_COORDINATED ||
                request.getStatus() == PurchaseRequestStatus.NOT_APPROVED ||
                request.getStatus() == PurchaseRequestStatus.PROJECT
            );
            
            if (isPendingStatus) {
                // Заявки со статусами "Не согласована", "Не утверждена", "Проект"
                pendingStatusByYear.put(year, pendingStatusByYear.getOrDefault(year, 0L) + 1);
            } else if (request.getRequiresPurchase() != null && request.getRequiresPurchase()) {
                // Закупка
                purchasesByYear.put(year, purchasesByYear.getOrDefault(year, 0L) + 1);
            } else {
                // Заказ
                ordersByYear.put(year, ordersByYear.getOrDefault(year, 0L) + 1);
            }
        }
        
        // Получаем все годы и сортируем их
        Set<Integer> allYearsSet = new HashSet<>();
        allYearsSet.addAll(purchasesByYear.keySet());
        allYearsSet.addAll(ordersByYear.keySet());
        allYearsSet.addAll(pendingStatusByYear.keySet());
        List<Integer> years = allYearsSet.stream()
            .sorted()
            .collect(Collectors.toList());
        
        // Формируем списки данных для каждого года
        List<Long> purchases = years.stream()
            .map(year -> purchasesByYear.getOrDefault(year, 0L))
            .collect(Collectors.toList());
        
        List<Long> orders = years.stream()
            .map(year -> ordersByYear.getOrDefault(year, 0L))
            .collect(Collectors.toList());
        
        List<Long> pendingStatus = years.stream()
            .map(year -> pendingStatusByYear.getOrDefault(year, 0L))
            .collect(Collectors.toList());
        
        Map<String, Object> result = new HashMap<>();
        result.put("years", years);
        result.put("purchases", purchases);
        result.put("orders", orders);
        result.put("pendingStatus", pendingStatus);
        
        logger.info("Yearly stats: {} years, total purchases: {}, total orders: {}, total pending status: {}", 
            years.size(), 
            purchases.stream().mapToLong(Long::longValue).sum(),
            orders.stream().mapToLong(Long::longValue).sum(),
            pendingStatus.stream().mapToLong(Long::longValue).sum());
        
        return result;
    }

    /**
     * Получить статистику по ЦФО для выбранного года
     * @param year год для фильтрации
     * @return Map с ключами: cfoLabels (список ЦФО), purchases (количество закупок по ЦФО), orders (количество заказов по ЦФО), pendingStatus (количество заявок со статусами "Не согласована", "Не утверждена", "Проект" по ЦФО)
     */
    public Map<String, Object> getCfoStats(Integer year) {
        Specification<PurchaseRequest> yearSpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (year != null) {
                LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
                LocalDateTime endOfYear = LocalDateTime.of(year, 12, 31, 23, 59, 59);
                predicates.add(cb.between(root.get("purchaseRequestCreationDate"), startOfYear, endOfYear));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
        
        List<PurchaseRequest> allRequests = purchaseRequestRepository.findAll(yearSpec);
        
        // Группируем по ЦФО
        Map<String, Long> purchasesByCfo = new HashMap<>();
        Map<String, BigDecimal> purchasesAmountByCfo = new HashMap<>();
        Map<String, Long> ordersByCfo = new HashMap<>();
        Map<String, BigDecimal> ordersAmountByCfo = new HashMap<>();
        Map<String, Long> pendingStatusByCfo = new HashMap<>();
        
        for (PurchaseRequest request : allRequests) {
            String cfo = request.getCfo() != null ? request.getCfo().getName() : null;
            if (cfo == null || cfo.trim().isEmpty()) {
                cfo = "Без ЦФО";
            } else {
                cfo = cfo.trim();
            }
            
            // Проверяем статусы: "Не согласована", "Не утверждена", "Проект"
            boolean isPendingStatus = request.getStatus() != null && (
                request.getStatus() == PurchaseRequestStatus.NOT_COORDINATED ||
                request.getStatus() == PurchaseRequestStatus.NOT_APPROVED ||
                request.getStatus() == PurchaseRequestStatus.PROJECT
            );
            
            BigDecimal budgetAmount = request.getBudgetAmount() != null ? request.getBudgetAmount() : BigDecimal.ZERO;
            
            if (isPendingStatus) {
                // Заявки со статусами "Не согласована", "Не утверждена", "Проект"
                pendingStatusByCfo.put(cfo, pendingStatusByCfo.getOrDefault(cfo, 0L) + 1);
            } else if (request.getRequiresPurchase() != null && request.getRequiresPurchase()) {
                // Закупка
                purchasesByCfo.put(cfo, purchasesByCfo.getOrDefault(cfo, 0L) + 1);
                purchasesAmountByCfo.put(cfo, purchasesAmountByCfo.getOrDefault(cfo, BigDecimal.ZERO).add(budgetAmount));
            } else {
                // Заказ
                ordersByCfo.put(cfo, ordersByCfo.getOrDefault(cfo, 0L) + 1);
                ordersAmountByCfo.put(cfo, ordersAmountByCfo.getOrDefault(cfo, BigDecimal.ZERO).add(budgetAmount));
            }
        }
        
        // Получаем данные о закупочных процедурах (Purchase entities) по ЦФО
        Specification<Purchase> purchaseYearSpec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (year != null) {
                LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
                LocalDateTime endOfYear = LocalDateTime.of(year, 12, 31, 23, 59, 59);
                predicates.add(cb.between(root.get("purchaseCreationDate"), startOfYear, endOfYear));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
        
        List<Purchase> allPurchases = purchaseRepository.findAll(purchaseYearSpec);
        
        // Группируем Purchase entities по ЦФО
        Map<String, Long> purchaseProceduresByCfo = new HashMap<>();
        Map<String, BigDecimal> purchaseProceduresAmountByCfo = new HashMap<>();
        
        for (Purchase purchase : allPurchases) {
            String cfo = purchase.getCfo() != null ? purchase.getCfo().getName() : null;
            if (cfo == null || cfo.trim().isEmpty()) {
                cfo = "Без ЦФО";
            } else {
                cfo = cfo.trim();
            }
            
            purchaseProceduresByCfo.put(cfo, purchaseProceduresByCfo.getOrDefault(cfo, 0L) + 1);
            BigDecimal purchaseAmount = purchase.getBudgetAmount() != null ? purchase.getBudgetAmount() : BigDecimal.ZERO;
            purchaseProceduresAmountByCfo.put(cfo, purchaseProceduresAmountByCfo.getOrDefault(cfo, BigDecimal.ZERO).add(purchaseAmount));
        }
        
        // Получаем все ЦФО и сортируем их
        Set<String> allCfoSet = new HashSet<>();
        allCfoSet.addAll(purchasesByCfo.keySet());
        allCfoSet.addAll(ordersByCfo.keySet());
        allCfoSet.addAll(pendingStatusByCfo.keySet());
        allCfoSet.addAll(purchaseProceduresByCfo.keySet());
        List<String> cfoLabels = allCfoSet.stream()
            .sorted()
            .collect(Collectors.toList());
        
        // Формируем списки данных для каждого ЦФО
        List<Long> ordersCount = cfoLabels.stream()
            .map(cfo -> ordersByCfo.getOrDefault(cfo, 0L))
            .collect(Collectors.toList());
        
        List<BigDecimal> ordersAmount = cfoLabels.stream()
            .map(cfo -> ordersAmountByCfo.getOrDefault(cfo, BigDecimal.ZERO))
            .collect(Collectors.toList());
        
        List<Long> purchaseProceduresCount = cfoLabels.stream()
            .map(cfo -> purchaseProceduresByCfo.getOrDefault(cfo, 0L))
            .collect(Collectors.toList());
        
        List<BigDecimal> purchaseProceduresAmount = cfoLabels.stream()
            .map(cfo -> purchaseProceduresAmountByCfo.getOrDefault(cfo, BigDecimal.ZERO))
            .collect(Collectors.toList());
        
        Map<String, Object> result = new HashMap<>();
        result.put("cfoLabels", cfoLabels);
        result.put("ordersCount", ordersCount);
        result.put("ordersAmount", ordersAmount);
        result.put("purchaseProceduresCount", purchaseProceduresCount);
        result.put("purchaseProceduresAmount", purchaseProceduresAmount);
        
        logger.info("Cfo stats for year {}: {} CFOs, total orders: {}, total purchase procedures: {}", 
            year, 
            cfoLabels.size(), 
            ordersCount.stream().mapToLong(Long::longValue).sum(),
            purchaseProceduresCount.stream().mapToLong(Long::longValue).sum());
        
        return result;
    }

    /**
     * Получить агрегированные данные по месяцам для заявок на закупку
     * Логика: "Дек (пред. год)" = декабрь выбранного года, остальные месяцы = год + 1
     */
    public Map<String, Object> getMonthlyStats(Integer year, Boolean requiresPurchase) {
        return getMonthlyStats(year, requiresPurchase, false);
    }

    /**
     * Получить агрегированные данные по месяцам для заявок на закупку
     * @param year год
     * @param requiresPurchase фильтр по типу (true = закупка, false = заказ, null = все)
     * @param useCalendarYear если true, то используется календарный год (январь-декабрь), иначе старая логика
     */
    public Map<String, Object> getMonthlyStats(Integer year, Boolean requiresPurchase, Boolean useCalendarYear) {
        // Если useCalendarYear = true, используем новую логику (январь-декабрь выбранного года)
        if (useCalendarYear != null && useCalendarYear && year != null) {
            Specification<PurchaseRequest> specForYear = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                
                if (requiresPurchase != null) {
                    predicates.add(cb.equal(root.get("requiresPurchase"), requiresPurchase));
                    
                    // ВАЖНО: Исключаем заявки со статусами "Не согласована", "Не утверждена", "Проект"
                    // НО включаем заявки с null статусом (они тоже показываются в диаграмме)
                    // Это соответствует логике buildSpecification и getYearlyStats
                    // Для не согласованных заказов есть отдельная категория "Не согласована / Проект"
                    List<PurchaseRequestStatus> excludedStatuses = List.of(
                        PurchaseRequestStatus.NOT_COORDINATED,
                        PurchaseRequestStatus.NOT_APPROVED,
                        PurchaseRequestStatus.PROJECT
                    );
                    // Исключаем только те записи, у которых статус явно равен одному из исключаемых
                    // Записи с null статусом не исключаются
                    predicates.add(cb.or(
                        cb.isNull(root.get("status")),
                        cb.not(root.get("status").in(excludedStatuses))
                    ));
                }
                
                // Календарный год: январь-декабрь выбранного года
                LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
                LocalDateTime endOfYear = LocalDateTime.of(year, 12, 31, 23, 59, 59, 999999999);
                
                predicates.add(cb.and(
                    cb.isNotNull(root.get("purchaseRequestCreationDate")),
                    cb.greaterThanOrEqualTo(root.get("purchaseRequestCreationDate"), startOfYear),
                    cb.lessThanOrEqualTo(root.get("purchaseRequestCreationDate"), endOfYear)
                ));
                
                return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
            };
            
            List<PurchaseRequest> requests = purchaseRequestRepository.findAll(specForYear);
            
            // Группируем по месяцам (январь-декабрь)
            Map<String, Integer> monthCounts = new HashMap<>();
            String[] monthNames = {"Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"};
            for (String monthName : monthNames) {
                monthCounts.put(monthName, 0);
            }
            
            for (PurchaseRequest request : requests) {
                if (request.getPurchaseRequestCreationDate() != null) {
                    LocalDateTime date = request.getPurchaseRequestCreationDate();
                    int monthIndex = date.getMonthValue() - 1; // 0-11
                    monthCounts.put(monthNames[monthIndex], monthCounts.get(monthNames[monthIndex]) + 1);
                }
            }
            
            // Загружаем данные для заявок со статусами "Не согласована", "Не утверждена", "Проект"
            // Эти данные загружаем независимо от requiresPurchase, так как статусы могут быть у любых заявок
            Specification<PurchaseRequest> specForPendingStatus = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                
                // Фильтр по статусам
                predicates.add(cb.or(
                    cb.equal(root.get("status"), PurchaseRequestStatus.NOT_COORDINATED),
                    cb.equal(root.get("status"), PurchaseRequestStatus.NOT_APPROVED),
                    cb.equal(root.get("status"), PurchaseRequestStatus.PROJECT)
                ));
                
                // Календарный год: январь-декабрь выбранного года
                LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
                LocalDateTime endOfYear = LocalDateTime.of(year, 12, 31, 23, 59, 59, 999999999);
                
                predicates.add(cb.and(
                    cb.isNotNull(root.get("purchaseRequestCreationDate")),
                    cb.greaterThanOrEqualTo(root.get("purchaseRequestCreationDate"), startOfYear),
                    cb.lessThanOrEqualTo(root.get("purchaseRequestCreationDate"), endOfYear)
                ));
                
                return cb.and(predicates.toArray(new Predicate[0]));
            };
            
            List<PurchaseRequest> pendingStatusRequests = purchaseRequestRepository.findAll(specForPendingStatus);
            
            // Группируем по месяцам для заявок со статусами
            Map<String, Integer> pendingStatusMonthCounts = new HashMap<>();
            for (String monthName : monthNames) {
                pendingStatusMonthCounts.put(monthName, 0);
            }
            
            for (PurchaseRequest request : pendingStatusRequests) {
                if (request.getPurchaseRequestCreationDate() != null) {
                    LocalDateTime date = request.getPurchaseRequestCreationDate();
                    int monthIndex = date.getMonthValue() - 1; // 0-11
                    pendingStatusMonthCounts.put(monthNames[monthIndex], pendingStatusMonthCounts.get(monthNames[monthIndex]) + 1);
                }
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("monthCounts", monthCounts);
            result.put("pendingStatusMonthCounts", pendingStatusMonthCounts);
            return result;
        }
        
        // Старая логика для обратной совместимости (когда useCalendarYear == false или null)
        Specification<PurchaseRequest> specForYear = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            if (requiresPurchase != null && requiresPurchase) {
                predicates.add(cb.equal(root.get("requiresPurchase"), true));
            }
            
            if (year != null) {
                // Декабрь выбранного года
                LocalDateTime startOfDecember = LocalDateTime.of(year, 12, 1, 0, 0);
                LocalDateTime endOfDecember = LocalDateTime.of(year, 12, 31, 23, 59, 59);
                // Январь-декабрь года + 1
                LocalDateTime startOfNextYear = LocalDateTime.of(year + 1, 1, 1, 0, 0);
                LocalDateTime endOfNextYear = LocalDateTime.of(year + 1, 12, 31, 23, 59, 59);
                
                predicates.add(cb.or(
                    cb.between(root.get("purchaseRequestCreationDate"), startOfDecember, endOfDecember),
                    cb.between(root.get("purchaseRequestCreationDate"), startOfNextYear, endOfNextYear)
                ));
            }
            
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
        
        List<PurchaseRequest> requests = purchaseRequestRepository.findAll(specForYear);
        
        // Группируем по месяцам
        Map<String, Integer> monthCounts = new HashMap<>();
        monthCounts.put("Дек (пред. год)", 0);
        for (int i = 0; i < 12; i++) {
            String[] monthNames = {"Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"};
            monthCounts.put(monthNames[i], 0);
        }
        
        for (PurchaseRequest request : requests) {
            if (request.getPurchaseRequestCreationDate() != null) {
                LocalDateTime date = request.getPurchaseRequestCreationDate();
                int monthIndex = date.getMonthValue() - 1; // 0-11
                int requestYear = date.getYear();
                
                if (year != null) {
                    // Если это декабрь выбранного года - идет в "Дек (пред. год)"
                    if (monthIndex == 11 && requestYear == year) {
                        monthCounts.put("Дек (пред. год)", monthCounts.get("Дек (пред. год)") + 1);
                    } else if (requestYear == year + 1) {
                        // Остальные месяцы года + 1
                        String[] monthNames = {"Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"};
                        monthCounts.put(monthNames[monthIndex], monthCounts.get(monthNames[monthIndex]) + 1);
                    }
                } else {
                    // Если год не указан, показываем все данные
                    int currentYear = LocalDateTime.now().getYear();
                    if (monthIndex == 11 && requestYear == currentYear) {
                        monthCounts.put("Дек (пред. год)", monthCounts.get("Дек (пред. год)") + 1);
                    } else {
                        String[] monthNames = {"Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"};
                        monthCounts.put(monthNames[monthIndex], monthCounts.get(monthNames[monthIndex]) + 1);
                    }
                }
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("monthCounts", monthCounts);
        return result;
    }
    
    /**
     * Вспомогательный класс для хранения статистики
     */
    private static class StatsData {
        long total = 0;
        long active = 0;
        long completed = 0;
        long totalDays = 0;
        long requestsWithDays = 0;
        BigDecimal totalAmount = BigDecimal.ZERO;
    }
    
    /**
     * Подсчитывает количество рабочих дней между двумя датами (исключая выходные - суббота и воскресенье)
     * 
     * @param startDate начальная дата
     * @param endDate конечная дата
     * @return количество рабочих дней
     */
    private long calculateWorkingDays(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null || startDate.isAfter(endDate)) {
            return 0;
        }
        
        long workingDays = 0;
        LocalDate currentDate = startDate;
        
        while (!currentDate.isAfter(endDate)) {
            DayOfWeek dayOfWeek = currentDate.getDayOfWeek();
            // Считаем только рабочие дни (понедельник - пятница)
            if (dayOfWeek != DayOfWeek.SATURDAY && dayOfWeek != DayOfWeek.SUNDAY) {
                workingDays++;
            }
            currentDate = currentDate.plusDays(1);
        }
        
        return workingDays;
    }
    
    /**
     * Определяет базовый URL фронтенда в зависимости от окружения
     * - Если переменная FRONTEND_BASE_URL установлена явно - использует её
     * - Если запущено в Docker (определяется по переменным окружения) - использует продакшн URL
     * - Иначе - использует localhost для локальной разработки
     */
    private String determineFrontendBaseUrl() {
        // Если переменная окружения установлена явно - используем её
        if (frontendBaseUrl != null && !frontendBaseUrl.trim().isEmpty()) {
            return frontendBaseUrl.replaceAll("/$", "");
        }
        
        // Определяем окружение по переменным окружения
        String env = System.getenv("ENV");
        String nodeEnv = System.getenv("NODE_ENV");
        String dockerEnv = System.getenv("DOCKER_ENV");
        
        // Проверяем, запущено ли приложение в Docker контейнере
        // В Docker обычно есть переменные DB_HOST=postgres (имя сервиса) или другие Docker-специфичные переменные
        boolean isDocker = System.getenv("DB_HOST") != null && 
                          (System.getenv("DB_HOST").equals("postgres") || 
                           System.getenv("DB_HOST").contains("."));
        
        // Если явно указано, что мы в Docker или в продакшене
        boolean isProduction = "production".equalsIgnoreCase(env) || 
                               "production".equalsIgnoreCase(nodeEnv) ||
                               "true".equalsIgnoreCase(dockerEnv) ||
                               isDocker;
        
        // Если запущено в Docker или продакшене
        if (isProduction) {
            // Используем продакшн URL из nginx конфигурации
            // Можно также определить по переменной окружения HOST или SERVER_NAME
            String host = System.getenv("HOST");
            String serverName = System.getenv("SERVER_NAME");
            
            if (host != null && !host.trim().isEmpty()) {
                String url = host.trim().replaceAll("/$", "");
                // Если URL не содержит протокол, добавляем http://
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    url = "http://" + url;
                }
                return url;
            } else if (serverName != null && !serverName.trim().isEmpty()) {
                String url = serverName.trim().replaceAll("/$", "");
                // Если URL не содержит протокол, добавляем http://
                if (!url.startsWith("http://") && !url.startsWith("https://")) {
                    url = "http://" + url;
                }
                return url;
            } else {
                // Значение по умолчанию для продакшена - используем IP адрес
                return "http://10.123.48.62";
            }
        }
        
        // Для локальной разработки
        return "http://localhost:3000";
    }
}

