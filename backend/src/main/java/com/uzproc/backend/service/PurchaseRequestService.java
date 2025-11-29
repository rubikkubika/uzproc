package com.uzproc.backend.service;

import com.uzproc.backend.dto.PurchaseRequestDto;
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

import java.util.ArrayList;
import java.util.List;

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
            
            // Фильтр по году
            if (year != null) {
                java.time.LocalDateTime startOfYear = java.time.LocalDateTime.of(year, 1, 1, 0, 0);
                java.time.LocalDateTime endOfYear = java.time.LocalDateTime.of(year, 12, 31, 23, 59, 59);
                predicates.add(cb.between(root.get("purchaseRequestCreationDate"), startOfYear, endOfYear));
                predicateCount++;
                logger.info("Added year filter: {}", year);
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
     * Логика:
     * - Если хотя бы одно согласование не согласовано → статус "Не согласована"
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
        
        boolean hasNotCoordinated = false;
        boolean hasActiveApproval = false;
        
        // Проверяем каждое согласование
        for (PurchaseRequestApproval approval : approvals) {
            // Проверяем, не согласовано ли согласование
            String completionResult = approval.getCompletionResult();
            if (completionResult != null && !completionResult.trim().isEmpty()) {
                String resultLower = completionResult.toLowerCase().trim();
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
            
            // Проверяем, активно ли согласование (назначено, но не завершено)
            if (approval.getAssignmentDate() != null && approval.getCompletionDate() == null) {
                hasActiveApproval = true;
                logger.debug("Found active approval for request {}: stage={}, role={}", 
                    idPurchaseRequest, approval.getStage(), approval.getRole());
            }
        }
        
        // Сохраняем текущий статус для сравнения
        PurchaseRequestStatus currentStatus = purchaseRequest.getStatus();
        
        // Определяем новый статус
        PurchaseRequestStatus newStatus = null;
        
        // Приоритет: сначала проверяем на не согласованные
        if (hasNotCoordinated) {
            newStatus = PurchaseRequestStatus.NOT_COORDINATED;
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
}

