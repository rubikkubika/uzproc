package com.uzproc.backend.service;

import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.entity.PurchaseRequestApproval;
import com.uzproc.backend.entity.PurchaseRequestStatus;
import com.uzproc.backend.repository.PurchaseRequestApprovalRepository;
import com.uzproc.backend.repository.PurchaseRequestRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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

    public PurchaseRequestStatusUpdateService(
            PurchaseRequestRepository purchaseRequestRepository,
            PurchaseRequestApprovalRepository approvalRepository) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.approvalRepository = approvalRepository;
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
            } else {
                logger.debug("No specifications found for purchase request {}", idPurchaseRequest);
            }
        } catch (Exception e) {
            logger.warn("Error checking specification for purchase request {}: {}", idPurchaseRequest, e.getMessage());
        }
        
        // Проверяем наличие связанной закупки для заявок с типом "Закупка" (requiresPurchase !== false)
        boolean hasPurchase = false;
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
        
        // Сохраняем текущий статус для сравнения
        PurchaseRequestStatus currentStatus = purchaseRequest.getStatus();
        
        // Определяем новый статус
        PurchaseRequestStatus newStatus = null;
        
        // Приоритет: сначала проверяем наличие спецификации (высокий приоритет), 
        // потом наличие закупки (для заявок с requiresPurchase !== false) - даже если заявка утверждена,
        // потом на не утверждено, потом на не согласованные, 
        // потом на завершенное утверждение, потом на активное утверждение, потом на согласование
        if (hasSpecification) {
            newStatus = PurchaseRequestStatus.SPECIFICATION_CREATED;
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
}

