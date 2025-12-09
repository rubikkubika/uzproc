package com.uzproc.backend.service;

import com.uzproc.backend.dto.PurchaseRequestDto;
import com.uzproc.backend.dto.PurchaserStatsDto;
import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.entity.PurchaseRequestApproval;
import com.uzproc.backend.entity.PurchaseRequestStatus;
import com.uzproc.backend.repository.PurchaseRequestApprovalRepository;
import com.uzproc.backend.repository.PurchaseRequestRepository;
import com.uzproc.backend.repository.PurchaseRepository;
import java.util.stream.Collectors;
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

import java.math.BigDecimal;
import java.time.Duration;
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

    public PurchaseRequestService(
            PurchaseRequestRepository purchaseRequestRepository,
            PurchaseRequestApprovalRepository approvalRepository,
            PurchaseRepository purchaseRepository) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.approvalRepository = approvalRepository;
        this.purchaseRepository = purchaseRepository;
    }

    public Page<PurchaseRequestDto> findAll(
            int page,
            int size,
            Integer year,
            String sortBy,
            String sortDir,
            Long idPurchaseRequest,
            List<String> cfo,
            String purchaseRequestInitiator,
            String name,
            String costType,
            String contractType,
            Boolean isPlanned,
            Boolean requiresPurchase,
            List<String> status) {
        
        logger.info("=== FILTER REQUEST ===");
        logger.info("Filter parameters - year: {}, idPurchaseRequest: {}, cfo: {}, purchaseRequestInitiator: '{}', name: '{}', costType: '{}', contractType: '{}', isPlanned: {}, requiresPurchase: {}, status: {}",
                year, idPurchaseRequest, cfo, purchaseRequestInitiator, name, costType, contractType, isPlanned, requiresPurchase, status);
        
        Specification<PurchaseRequest> spec = buildSpecification(
                year, idPurchaseRequest, cfo, purchaseRequestInitiator, name, costType, contractType, isPlanned, requiresPurchase, status);
        
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
        dto.setCfo(entity.getCfo());
        dto.setMcc(entity.getMcc());
        dto.setPurchaseRequestInitiator(entity.getPurchaseRequestInitiator());
        dto.setPurchaser(entity.getPurchaser());
        dto.setPurchaseRequestSubject(entity.getPurchaseRequestSubject());
        dto.setBudgetAmount(entity.getBudgetAmount());
        dto.setCostType(entity.getCostType());
        dto.setContractType(entity.getContractType());
        dto.setContractDurationMonths(entity.getContractDurationMonths());
        dto.setIsPlanned(entity.getIsPlanned());
        dto.setRequiresPurchase(entity.getRequiresPurchase());
        dto.setStatus(entity.getStatus());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        
        // Загружаем связанные закупки по idPurchaseRequest
        if (entity.getIdPurchaseRequest() != null) {
            List<com.uzproc.backend.entity.Purchase> purchases = purchaseRepository.findByPurchaseRequestId(entity.getIdPurchaseRequest());
            List<Long> purchaseIds = purchases.stream()
                    .map(com.uzproc.backend.entity.Purchase::getId)
                    .collect(Collectors.toList());
            dto.setPurchaseIds(purchaseIds);
        } else {
            dto.setPurchaseIds(new ArrayList<>());
        }
        
        return dto;
    }

    private Specification<PurchaseRequest> buildSpecification(
            Integer year,
            Long idPurchaseRequest,
            List<String> cfo,
            String purchaseRequestInitiator,
            String name,
            String costType,
            String contractType,
            Boolean isPlanned,
            Boolean requiresPurchase,
            List<String> status) {
        
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            int predicateCount = 0;
            
            // Фильтр по году (по дате создания заявки - purchaseRequestCreationDate)
            if (year != null) {
                java.time.LocalDateTime startOfYear = java.time.LocalDateTime.of(year, 1, 1, 0, 0);
                java.time.LocalDateTime endOfYear = java.time.LocalDateTime.of(year, 12, 31, 23, 59, 59, 999999999);
                // Используем greaterThanOrEqualTo и lessThanOrEqualTo для более точной фильтрации
                predicates.add(cb.and(
                    cb.isNotNull(root.get("purchaseRequestCreationDate")),
                    cb.greaterThanOrEqualTo(root.get("purchaseRequestCreationDate"), startOfYear),
                    cb.lessThanOrEqualTo(root.get("purchaseRequestCreationDate"), endOfYear)
                ));
                predicateCount++;
                logger.info("Added year filter (by purchaseRequestCreationDate): {} (January - December), excluding null dates", year);
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
                    if (validCfoValues.size() == 1) {
                        // Одно значение - точное совпадение
                        predicates.add(cb.equal(cb.lower(root.get("cfo")), validCfoValues.get(0).toLowerCase()));
                        predicateCount++;
                        logger.info("Added single cfo filter: '{}'", validCfoValues.get(0));
                    } else {
                        // Несколько значений - IN запрос
                        List<Predicate> cfoPredicates = validCfoValues.stream()
                            .map(cfoValue -> cb.equal(cb.lower(root.get("cfo")), cfoValue.toLowerCase()))
                            .toList();
                        predicates.add(cb.or(cfoPredicates.toArray(new Predicate[0])));
                        predicateCount++;
                        logger.info("Added multiple cfo filter: {}", validCfoValues);
                    }
                }
            }
            
            // Фильтр по инициатору (частичное совпадение, case-insensitive)
            if (purchaseRequestInitiator != null && !purchaseRequestInitiator.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("purchaseRequestInitiator")), "%" + purchaseRequestInitiator.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added purchaseRequestInitiator filter: '{}'", purchaseRequestInitiator);
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
            }
            
            // Фильтр по статусу (множественный выбор)
            if (status != null && !status.isEmpty()) {
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
                            return null;
                        })
                        .filter(s -> s != null)
                        .collect(Collectors.toList());
                    
                    if (!statusEnums.isEmpty()) {
                        if (statusEnums.size() == 1) {
                            // Одно значение - точное совпадение
                            predicates.add(cb.equal(root.get("status"), statusEnums.get(0)));
                            predicateCount++;
                            logger.info("Added single status filter: '{}'", statusEnums.get(0).getDisplayName());
                        } else {
                            // Несколько значений - IN запрос
                            predicates.add(root.get("status").in(statusEnums));
                            predicateCount++;
                            logger.info("Added multiple status filter: {}", statusEnums.stream()
                                .map(PurchaseRequestStatus::getDisplayName)
                                .collect(Collectors.toList()));
                        }
                    }
                }
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

    /**
     * Обновляет статус заявки на закупку на основе согласований
     * Логика (приоритет по убыванию):
     * - Если хотя бы одно согласование не утверждено → статус "Не утверждена"
     * - Если хотя бы одно согласование не согласовано → статус "Не согласована"
     * - Если есть завершенное утверждение → статус "Утверждена"
     * - Если есть активное и не законченное утверждение → статус "На утверждении"
     * - Если хотя бы одно согласование активно (не завершено) → статус "На согласовании"
     * 
     * @param idPurchaseRequest ID заявки на закупку
     */
    @Transactional
    public void updateStatusBasedOnApprovals(Long idPurchaseRequest) {
        // Находим заявку по idPurchaseRequest
        PurchaseRequest purchaseRequest = purchaseRequestRepository.findByIdPurchaseRequest(idPurchaseRequest)
                .orElse(null);
        
        if (purchaseRequest == null) {
            logger.debug("Purchase request with id {} not found for status update", idPurchaseRequest);
            return;
        }
        
        // Получаем все согласования для заявки
        List<PurchaseRequestApproval> approvals = approvalRepository.findByIdPurchaseRequest(idPurchaseRequest);
        
        if (approvals.isEmpty()) {
            logger.debug("No approvals found for purchase request {}, status not updated", idPurchaseRequest);
            return;
        }
        
        boolean hasNotApproved = false;
        boolean hasNotCoordinated = false;
        boolean hasActiveApproval = false;
        boolean hasActiveFinalApproval = false;
        boolean hasCompletedFinalApproval = false;
        
        // Проверяем каждое согласование
        for (PurchaseRequestApproval approval : approvals) {
            // Проверяем, не согласовано ли согласование
            String completionResult = approval.getCompletionResult();
            if (completionResult != null && !completionResult.trim().isEmpty()) {
                String resultLower = completionResult.toLowerCase().trim();
                // Проверяем различные варианты "не утверждено"
                if (resultLower.contains("не утвержден") || 
                    resultLower.contains("не утверждено") ||
                    resultLower.contains("не утверждена")) {
                    hasNotApproved = true;
                    logger.debug("Found not approved approval for request {}: {}", 
                        idPurchaseRequest, completionResult);
                }
                // Проверяем различные варианты "не согласован"
                if (resultLower.contains("не согласован") || 
                    resultLower.contains("не согласована") ||
                    resultLower.contains("отклонен") ||
                    resultLower.contains("отклонена")) {
                    hasNotCoordinated = true;
                    logger.debug("Found not coordinated approval for request {}: {}", 
                        idPurchaseRequest, completionResult);
                }
            }
            
            String stage = approval.getStage();
            // Проверяем, является ли это утверждением
            boolean isFinalApproval = stage != null && (stage.equals("Утверждение заявки на ЗП") || 
                stage.equals("Утверждение заявки на ЗП (НЕ требуется ЗП)"));
            
            // Проверяем, завершено ли утверждение
            if (isFinalApproval && approval.getCompletionDate() != null) {
                // Проверяем, что результат положительный (согласовано)
                if (completionResult != null && !completionResult.trim().isEmpty()) {
                    String resultLower = completionResult.toLowerCase().trim();
                    if (resultLower.contains("согласован") || resultLower.contains("согласовано") ||
                        resultLower.contains("утвержден") || resultLower.contains("утверждено")) {
                        hasCompletedFinalApproval = true;
                        logger.debug("Found completed final approval for request {}: stage={}, role={}, result={}", 
                            idPurchaseRequest, stage, approval.getRole(), completionResult);
                    }
                } else {
                    // Если completionDate есть, но completionResult пустой, считаем утвержденным
                    hasCompletedFinalApproval = true;
                    logger.debug("Found completed final approval for request {}: stage={}, role={} (no result specified)", 
                        idPurchaseRequest, stage, approval.getRole());
                }
            }
            
            // Проверяем, активно ли согласование (назначено, но не завершено)
            if (approval.getAssignmentDate() != null && approval.getCompletionDate() == null) {
                if (isFinalApproval) {
                    hasActiveFinalApproval = true;
                    logger.debug("Found active final approval for request {}: stage={}, role={}", 
                        idPurchaseRequest, stage, approval.getRole());
                } else {
                hasActiveApproval = true;
                logger.debug("Found active approval for request {}: stage={}, role={}", 
                        idPurchaseRequest, stage, approval.getRole());
                }
            }
        }
        
        // Сохраняем текущий статус для сравнения
        PurchaseRequestStatus currentStatus = purchaseRequest.getStatus();
        
        // Определяем новый статус
        PurchaseRequestStatus newStatus = null;
        
        // Приоритет: сначала проверяем на не утверждено (самый высокий), потом на не согласованные, 
        // потом на завершенное утверждение, потом на активное утверждение, потом на согласование
        if (hasNotApproved) {
            newStatus = PurchaseRequestStatus.NOT_APPROVED;
        } else if (hasNotCoordinated) {
            newStatus = PurchaseRequestStatus.NOT_COORDINATED;
        } else if (hasCompletedFinalApproval) {
            newStatus = PurchaseRequestStatus.APPROVED;
        } else if (hasActiveFinalApproval) {
            newStatus = PurchaseRequestStatus.ON_APPROVAL_FINAL;
        } else if (hasActiveApproval) {
            newStatus = PurchaseRequestStatus.ON_APPROVAL;
        }
        
        // Обновляем статус только если он изменился
        if (newStatus != null && currentStatus != newStatus) {
            purchaseRequest.setStatus(newStatus);
            purchaseRequestRepository.save(purchaseRequest);
            logger.info("Status updated for purchase request {}: {} -> {}", 
                idPurchaseRequest, 
                currentStatus != null ? currentStatus.getDisplayName() : "null",
                newStatus.getDisplayName());
        } else if (newStatus == null) {
            logger.debug("No status change needed for request {} (no active approvals or not coordinated)", idPurchaseRequest);
        } else {
            logger.debug("Status for request {} already set to: {}", idPurchaseRequest, newStatus.getDisplayName());
        }
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
     * @return Map с ключами: years (список годов), purchases (список количеств закупок), orders (список количеств заказов)
     */
    public Map<String, Object> getYearlyStats() {
        List<PurchaseRequest> allRequests = purchaseRequestRepository.findAll();
        
        // Группируем по годам
        Map<Integer, Long> purchasesByYear = new HashMap<>();
        Map<Integer, Long> ordersByYear = new HashMap<>();
        
        for (PurchaseRequest request : allRequests) {
            if (request.getPurchaseRequestCreationDate() == null) {
                continue;
            }
            
            int year = request.getPurchaseRequestCreationDate().getYear();
            
            if (request.getRequiresPurchase() != null && request.getRequiresPurchase()) {
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
        
        Map<String, Object> result = new HashMap<>();
        result.put("years", years);
        result.put("purchases", purchases);
        result.put("orders", orders);
        
        logger.info("Yearly stats: {} years, total purchases: {}, total orders: {}", 
            years.size(), 
            purchases.stream().mapToLong(Long::longValue).sum(),
            orders.stream().mapToLong(Long::longValue).sum());
        
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
            
            Map<String, Object> result = new HashMap<>();
            result.put("monthCounts", monthCounts);
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
}

