package com.uzproc.backend.service;

import com.uzproc.backend.entity.Contract;
import com.uzproc.backend.entity.ContractStatus;
import com.uzproc.backend.entity.Purchase;
import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.entity.PurchaseRequestApproval;
import com.uzproc.backend.entity.PurchaseRequestStatus;
import com.uzproc.backend.repository.ContractRepository;
import com.uzproc.backend.repository.PurchaseRequestApprovalRepository;
import com.uzproc.backend.repository.PurchaseRequestRepository;
import com.uzproc.backend.repository.PurchaseRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Сервис для обновления статусов заявок на закупку
 * Проверяет согласования и наличие спецификаций для определения статуса
 */
@Service
@Transactional(readOnly = false)
public class PurchaseRequestStatusUpdateService {

    private static final Logger logger = LoggerFactory.getLogger(PurchaseRequestStatusUpdateService.class);
    
    @PersistenceContext
    private EntityManager entityManager;
    
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PurchaseRequestApprovalRepository approvalRepository;
    private final ContractRepository contractRepository;
    private final PurchaseRepository purchaseRepository;

    public PurchaseRequestStatusUpdateService(
            PurchaseRequestRepository purchaseRequestRepository,
            PurchaseRequestApprovalRepository approvalRepository,
            ContractRepository contractRepository,
            PurchaseRepository purchaseRepository) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.approvalRepository = approvalRepository;
        this.contractRepository = contractRepository;
        this.purchaseRepository = purchaseRepository;
    }

    /**
     * Обновляет статус заявки на закупку на основе согласований, спецификаций и закупок
     * Логика (приоритет по убыванию):
     * - Если есть спецификация → статус "Спецификация создана"
     * - Если заявка с типом "Закупка" (requiresPurchase !== false) и есть связанная закупка → статус "Закупка создана"
     * - Если хотя бы одно согласование не утверждено → статус "Не утверждена"
     * - Если хотя бы одно согласование не согласовано → статус "Не согласована"
     * - Если есть завершенное утверждение → статус "Утверждена"
     * - Если есть активное и не законченное утверждение → статус "На утверждении"
     * - Если хотя бы одно согласование активно (не завершено) → статус "На согласовании"
     * 
     * @param idPurchaseRequest ID заявки на закупку
     */
    @Transactional
    public void updateStatus(Long idPurchaseRequest) {
        // Находим заявку по idPurchaseRequest
        PurchaseRequest purchaseRequest = purchaseRequestRepository.findByIdPurchaseRequest(idPurchaseRequest)
                .orElse(null);
        
        if (purchaseRequest == null) {
            logger.debug("Purchase request with id {} not found for status update", idPurchaseRequest);
            return;
        }
        
        // Получаем все согласования для заявки
        List<PurchaseRequestApproval> approvals = approvalRepository.findByIdPurchaseRequest(idPurchaseRequest);
        
        boolean hasNotApproved = false;
        boolean hasNotCoordinated = false;
        boolean hasActiveApproval = false;
        boolean hasActiveFinalApproval = false;
        boolean hasCompletedFinalApproval = false;
        
        // Проверяем каждое согласование
        if (!approvals.isEmpty()) {
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
        }
        
        // Проверяем наличие спецификации у заявки
        // Спецификации хранятся в таблице contracts с document_form = 'Спецификация'
        // и связаны с заявкой через purchase_request_id
        boolean hasSpecification = false;
        boolean hasSignedSpecification = false;
        boolean hasNotCoordinatedSpecification = false;
        boolean hasArchivedSpecification = false;
        try {
            // Проверяем наличие спецификации через нативный SQL запрос к таблице contracts
            Query query = entityManager.createNativeQuery(
                "SELECT COUNT(*) FROM contracts WHERE purchase_request_id = ? AND document_form = ?"
            );
            query.setParameter(1, idPurchaseRequest);
            query.setParameter(2, "Спецификация");
            Long count = ((Number) query.getSingleResult()).longValue();
            if (count > 0) {
                hasSpecification = true;
                logger.debug("Found {} specification(s) for purchase request {}", count, idPurchaseRequest);
                
                // Проверяем спецификации для заказов (когда requiresPurchase === false)
                if (purchaseRequest.getRequiresPurchase() != null && purchaseRequest.getRequiresPurchase() == false) {
                    // Проверяем, есть ли подписанная спецификация
                    // В базе данных статус хранится как имя enum константы (SIGNED), а не displayName (Подписан)
                    Query signedQuery = entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM contracts WHERE purchase_request_id = ? AND document_form = ? AND status = ?"
                    );
                    signedQuery.setParameter(1, idPurchaseRequest);
                    signedQuery.setParameter(2, "Спецификация");
                    signedQuery.setParameter(3, "SIGNED"); // Используем имя enum константы, так как используется @Enumerated(EnumType.STRING)
                    Long signedCount = ((Number) signedQuery.getSingleResult()).longValue();
                    if (signedCount > 0) {
                        hasSignedSpecification = true;
                        logger.info("Found {} signed specification(s) for purchase request {} (order type)", signedCount, idPurchaseRequest);
                    } else {
                        logger.debug("No signed specifications found for purchase request {} (order type)", idPurchaseRequest);
                        
                        // Проверяем, есть ли спецификация со статусом "Не согласован"
                        Query notCoordinatedSpecQuery = entityManager.createNativeQuery(
                            "SELECT COUNT(*) FROM contracts WHERE purchase_request_id = ? AND document_form = ? AND status = ?"
                        );
                        notCoordinatedSpecQuery.setParameter(1, idPurchaseRequest);
                        notCoordinatedSpecQuery.setParameter(2, "Спецификация");
                        notCoordinatedSpecQuery.setParameter(3, "NOT_COORDINATED"); // Используем имя enum константы
                        Long notCoordinatedSpecCount = ((Number) notCoordinatedSpecQuery.getSingleResult()).longValue();
                        if (notCoordinatedSpecCount > 0) {
                            hasNotCoordinatedSpecification = true;
                            logger.info("Found {} not coordinated specification(s) for purchase request {} (order type)", notCoordinatedSpecCount, idPurchaseRequest);
                        } else {
                            logger.debug("No not coordinated specifications found for purchase request {} (order type)", idPurchaseRequest);
                            
                            // Проверяем, есть ли спецификация со статусом "Проект"
                            Query projectQuery = entityManager.createNativeQuery(
                                "SELECT COUNT(*) FROM contracts WHERE purchase_request_id = ? AND document_form = ? AND status = ?"
                            );
                            projectQuery.setParameter(1, idPurchaseRequest);
                            projectQuery.setParameter(2, "Спецификация");
                            projectQuery.setParameter(3, "PROJECT"); // Используем имя enum константы
                            Long projectCount = ((Number) projectQuery.getSingleResult()).longValue();
                            if (projectCount > 0) {
                                // Проверяем, прошло ли более 60 рабочих дней с даты создания заявки
                                // Используем purchaseRequestCreationDate, если есть, иначе используем дату создания спецификации
                                LocalDateTime creationDate = purchaseRequest.getPurchaseRequestCreationDate();
                                if (creationDate == null) {
                                    // Если дата создания заявки отсутствует, используем дату создания спецификации как fallback
                                    Query specDateQuery = entityManager.createNativeQuery(
                                        "SELECT MIN(contract_creation_date) FROM contracts WHERE purchase_request_id = ? AND document_form = ? AND status = ?"
                                    );
                                    specDateQuery.setParameter(1, idPurchaseRequest);
                                    specDateQuery.setParameter(2, "Спецификация");
                                    specDateQuery.setParameter(3, "PROJECT");
                                    Object specDateObj = specDateQuery.getSingleResult();
                                    if (specDateObj != null) {
                                        if (specDateObj instanceof java.sql.Timestamp) {
                                            creationDate = ((java.sql.Timestamp) specDateObj).toLocalDateTime();
                                        } else if (specDateObj instanceof java.time.LocalDateTime) {
                                            creationDate = (LocalDateTime) specDateObj;
                                        }
                                        logger.debug("Using specification creation date as fallback for purchase request {}: {}", idPurchaseRequest, creationDate);
                                    }
                                }
                                
                                if (creationDate != null) {
                                    long workingDays = calculateWorkingDays(creationDate.toLocalDate(), LocalDate.now());
                                    if (workingDays > 60) {
                                        hasArchivedSpecification = true;
                                        logger.info("Found {} project specification(s) for purchase request {} (order type) and {} working days passed (>60), marking as archive", 
                                            projectCount, idPurchaseRequest, workingDays);
                                    } else {
                                        logger.debug("Found {} project specification(s) for purchase request {} (order type) but only {} working days passed (<=60)", 
                                            projectCount, idPurchaseRequest, workingDays);
                                    }
                                } else {
                                    logger.debug("Purchase request {} has no creation date (neither purchaseRequestCreationDate nor specification creation date), cannot check archive condition", idPurchaseRequest);
                                }
                            }
                        }
                    }
                }
            } else {
                logger.debug("No specifications found for purchase request {}", idPurchaseRequest);
            }
        } catch (Exception e) {
            logger.warn("Error checking specification for purchase request {}: {}", idPurchaseRequest, e.getMessage());
        }
        
        // Проверяем наличие связанной закупки для заявок с типом "Закупка" (requiresPurchase !== false)
        boolean hasPurchase = false;
        boolean hasNotCoordinatedPurchase = false;
        if (purchaseRequest.getRequiresPurchase() != null && purchaseRequest.getRequiresPurchase() != false) {
            try {
                // Проверяем наличие связанной закупки через нативный SQL запрос к таблице purchases
                // Поле purchase_request_id в таблице purchases ссылается на id_purchase_request в purchase_requests
                Query purchaseQuery = entityManager.createNativeQuery(
                    "SELECT COUNT(*) FROM purchases WHERE purchase_request_id = ?"
                );
                purchaseQuery.setParameter(1, idPurchaseRequest);
                Long purchaseCount = ((Number) purchaseQuery.getSingleResult()).longValue();
                if (purchaseCount > 0) {
                    hasPurchase = true;
                    logger.info("Found {} purchase(s) for purchase request {} (requiresPurchase={})", 
                        purchaseCount, idPurchaseRequest, purchaseRequest.getRequiresPurchase());
                    
                    // Проверяем, есть ли закупка со статусом "Не согласовано"
                    // В базе данных статус хранится как имя enum константы (NOT_COORDINATED), а не displayName (Не согласовано)
                    Query notCoordinatedQuery = entityManager.createNativeQuery(
                        "SELECT COUNT(*) FROM purchases WHERE purchase_request_id = ? AND status = ?"
                    );
                    notCoordinatedQuery.setParameter(1, idPurchaseRequest);
                    notCoordinatedQuery.setParameter(2, "NOT_COORDINATED"); // Используем имя enum константы
                    Long notCoordinatedCount = ((Number) notCoordinatedQuery.getSingleResult()).longValue();
                    if (notCoordinatedCount > 0) {
                        hasNotCoordinatedPurchase = true;
                        logger.info("Found {} not coordinated purchase(s) for purchase request {}", 
                            notCoordinatedCount, idPurchaseRequest);
                    } else {
                        logger.debug("No not coordinated purchases found for purchase request {}", idPurchaseRequest);
                    }
                } else {
                    logger.debug("No purchases found for purchase request {} (requiresPurchase={})", 
                        idPurchaseRequest, purchaseRequest.getRequiresPurchase());
                }
            } catch (Exception e) {
                logger.error("Error checking purchase for purchase request {}: {}", idPurchaseRequest, e.getMessage(), e);
            }
        } else {
            logger.debug("Purchase request {} does not require purchase (requiresPurchase={}), skipping purchase check", 
                idPurchaseRequest, purchaseRequest.getRequiresPurchase());
        }
        
        // Проверяем статус всех связанных договоров
        // Договоры могут быть связаны:
        // 1. Напрямую через purchase_request_id
        // 2. Через закупки по contractInnerIds
        boolean allContractsSigned = false;
        boolean hasContracts = false;
        try {
            List<Contract> allContracts = new ArrayList<>();
            
            // 1. Получаем договоры напрямую связанные с заявкой
            List<Contract> directContracts = contractRepository.findByPurchaseRequestId(idPurchaseRequest);
            allContracts.addAll(directContracts);
            
            // 2. Получаем договоры через закупки
            List<Purchase> purchases = purchaseRepository.findByPurchaseRequestId(idPurchaseRequest);
            Set<Long> contractIds = new HashSet<>();
            for (Purchase purchase : purchases) {
                if (purchase.getContractInnerIds() != null && !purchase.getContractInnerIds().isEmpty()) {
                    for (String contractInnerId : purchase.getContractInnerIds()) {
                        if (contractInnerId != null && !contractInnerId.trim().isEmpty()) {
                            contractRepository.findByInnerId(contractInnerId.trim()).ifPresent(contract -> {
                                if (!contractIds.contains(contract.getId())) {
                                    allContracts.add(contract);
                                    contractIds.add(contract.getId());
                                }
                            });
                        }
                    }
                }
            }
            
            // Исключаем спецификации из проверки (они обрабатываются отдельно)
            allContracts.removeIf(contract -> {
                String documentForm = contract.getDocumentForm();
                return documentForm != null && documentForm.equals("Спецификация");
            });
            
            if (!allContracts.isEmpty()) {
                hasContracts = true;
                // Проверяем, все ли договоры имеют статус "Подписан"
                allContractsSigned = allContracts.stream()
                    .allMatch(contract -> contract.getStatus() == ContractStatus.SIGNED);
                
                logger.debug("Found {} contracts for purchase request {} (excluding specifications), all signed: {}", 
                    allContracts.size(), idPurchaseRequest, allContractsSigned);
            } else {
                logger.debug("No contracts found for purchase request {} (excluding specifications)", idPurchaseRequest);
            }
        } catch (Exception e) {
            logger.warn("Error checking contracts for purchase request {}: {}", idPurchaseRequest, e.getMessage());
        }
        
        // Сохраняем текущий статус для сравнения
        PurchaseRequestStatus currentStatus = purchaseRequest.getStatus();
        
        // Определяем новый статус
        PurchaseRequestStatus newStatus = null;
        
        // Приоритет: сначала проверяем подписанную спецификацию (для заказов, самый высокий приоритет),
        // потом не согласованную спецификацию (для заказов, высокий приоритет),
        // потом архивную спецификацию (для заказов с проектной спецификацией старше 60 рабочих дней),
        // потом наличие спецификации (высокий приоритет), 
        // потом проверяем статус закупки (для заявок с requiresPurchase !== false) - если закупка не согласована, то "Закупка не согласована"
        // потом наличие закупки (для заявок с requiresPurchase !== false) - даже если заявка утверждена,
        // потом на не утверждено, потом на не согласованные, 
        // потом на завершенное утверждение, потом на активное утверждение, потом на согласование
        if (hasSignedSpecification) {
            // Для заказов (requiresPurchase === false) с подписанной спецификацией
            newStatus = PurchaseRequestStatus.SPECIFICATION_SIGNED;
        } else if (hasContracts && allContractsSigned) {
            // Если есть договоры и все они подписаны, устанавливаем статус "Договор подписан"
            newStatus = PurchaseRequestStatus.CONTRACT_SIGNED;
        } else if (hasNotCoordinatedSpecification) {
            // Для заказов (requiresPurchase === false) с не согласованной спецификацией
            newStatus = PurchaseRequestStatus.SPECIFICATION_NOT_COORDINATED;
        } else if (hasArchivedSpecification) {
            // Для заказов (requiresPurchase === false) с проектной спецификацией старше 60 рабочих дней
            newStatus = PurchaseRequestStatus.SPECIFICATION_CREATED_ARCHIVE;
        } else if (hasSpecification && purchaseRequest.getRequiresPurchase() != null && purchaseRequest.getRequiresPurchase() == false) {
            // Статус "Спецификация создана" только для заказов (requiresPurchase === false)
            newStatus = PurchaseRequestStatus.SPECIFICATION_CREATED;
        } else if (hasNotCoordinatedPurchase) {
            // Если связанная закупка имеет статус "Не согласовано", устанавливаем статус "Закупка не согласована"
            newStatus = PurchaseRequestStatus.PURCHASE_NOT_COORDINATED;
        } else if (hasPurchase) {
            // Если есть закупка, устанавливаем статус "Закупка создана" даже если заявка утверждена
            newStatus = PurchaseRequestStatus.PURCHASE_CREATED;
        } else if (hasNotApproved) {
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
     * Массовое обновление статусов для всех заявок на закупку
     * Используется после парсинга данных для обновления всех статусов
     */
    @Transactional
    public void updateAllStatuses() {
        logger.info("Starting mass status update for all purchase requests");
        long startTime = System.currentTimeMillis();
        
        // Получаем все заявки на закупку
        List<PurchaseRequest> allRequests = purchaseRequestRepository.findAll();
        logger.info("Found {} purchase requests to update", allRequests.size());
        
        int updatedCount = 0;
        int errorCount = 0;
        
        for (PurchaseRequest request : allRequests) {
            try {
                PurchaseRequestStatus oldStatus = request.getStatus();
                updateStatus(request.getIdPurchaseRequest());
                
                // Проверяем, изменился ли статус
                request = purchaseRequestRepository.findByIdPurchaseRequest(request.getIdPurchaseRequest())
                    .orElse(null);
                if (request != null && request.getStatus() != oldStatus) {
                    updatedCount++;
                }
            } catch (Exception e) {
                errorCount++;
                logger.error("Error updating status for purchase request {}: {}", 
                    request.getIdPurchaseRequest(), e.getMessage(), e);
            }
        }
        
        long processingTime = System.currentTimeMillis() - startTime;
        logger.info("Mass status update completed: {} requests processed, {} updated, {} errors, time: {} ms", 
            allRequests.size(), updatedCount, errorCount, processingTime);
    }

    /**
     * Обновление статусов для заявок с указанными ID
     * 
     * @param idPurchaseRequests список ID заявок для обновления
     */
    @Transactional
    public void updateStatuses(List<Long> idPurchaseRequests) {
        logger.info("Starting status update for {} purchase requests", idPurchaseRequests.size());
        long startTime = System.currentTimeMillis();
        
        int updatedCount = 0;
        int errorCount = 0;
        
        for (Long idPurchaseRequest : idPurchaseRequests) {
            try {
                updateStatus(idPurchaseRequest);
                updatedCount++;
            } catch (Exception e) {
                errorCount++;
                logger.error("Error updating status for purchase request {}: {}", 
                    idPurchaseRequest, e.getMessage(), e);
            }
        }
        
        long processingTime = System.currentTimeMillis() - startTime;
        logger.info("Status update completed: {} requests processed, {} updated, {} errors, time: {} ms", 
            idPurchaseRequests.size(), updatedCount, errorCount, processingTime);
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
}

