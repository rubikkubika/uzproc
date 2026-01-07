package com.uzproc.backend.service;

import com.uzproc.backend.entity.Purchase;
import com.uzproc.backend.entity.PurchaseApproval;
import com.uzproc.backend.entity.PurchaseStatus;
import com.uzproc.backend.repository.PurchaseApprovalRepository;
import com.uzproc.backend.repository.PurchaseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Сервис для обновления статусов закупок
 * Проверяет согласования для определения статуса
 */
@Service
@Transactional(readOnly = false)
public class PurchaseStatusUpdateService {

    private static final Logger logger = LoggerFactory.getLogger(PurchaseStatusUpdateService.class);

    private final PurchaseRepository purchaseRepository;
    private final PurchaseApprovalRepository purchaseApprovalRepository;

    public PurchaseStatusUpdateService(
            PurchaseRepository purchaseRepository,
            PurchaseApprovalRepository purchaseApprovalRepository) {
        this.purchaseRepository = purchaseRepository;
        this.purchaseApprovalRepository = purchaseApprovalRepository;
    }

    /**
     * Обновляет статус закупки на основе согласований
     * Если в согласованиях закупки есть визы "Не согласовано", то статус закупки "Не согласовано"
     *
     * @param purchaseRequestId ID закупки (purchase_request_id)
     */
    @Transactional
    public void updateStatus(Long purchaseRequestId) {
        Purchase purchase = purchaseRepository.findFirstByPurchaseRequestId(purchaseRequestId).orElse(null);

        if (purchase == null) {
            logger.debug("Purchase with purchaseRequestId {} not found for status update", purchaseRequestId);
            return;
        }

        logger.info("Updating status for purchase with purchaseRequestId: {}, purchaseId: {}, current status: {}", 
            purchaseRequestId, purchase.getId(), purchase.getStatus() != null ? purchase.getStatus().getDisplayName() : "null");

        // Сохраняем текущий статус для сравнения
        PurchaseStatus currentStatus = purchase.getStatus();

        // Получаем все согласования для закупки
        List<PurchaseApproval> approvals = purchaseApprovalRepository.findByPurchaseRequestId(purchaseRequestId);
        logger.info("Found {} approvals for purchase {} (purchaseRequestId: {})", approvals.size(), purchase.getId(), purchaseRequestId);

        // Определяем новый статус на основе согласований
        PurchaseStatus newStatus = null;

        // Проверяем, есть ли согласования с "Не согласовано"
        boolean hasNotCoordinated = false;

        if (!approvals.isEmpty()) {
            logger.info("Checking {} approvals for purchase {} (purchaseRequestId: {})", 
                approvals.size(), purchase.getId(), purchaseRequestId);
            for (PurchaseApproval approval : approvals) {
                String completionResult = approval.getCompletionResult();
                logger.info("Checking approval for purchase {} (purchaseRequestId: {}): stage={}, role={}, completionResult={}", 
                    purchase.getId(), purchaseRequestId, approval.getStage(), approval.getRole(), 
                    completionResult != null ? completionResult : "null");
                
                if (completionResult != null && !completionResult.trim().isEmpty()) {
                    String resultLower = completionResult.toLowerCase().trim();
                    logger.debug("Checking completion result '{}' (lowercase: '{}') for 'не согласован' patterns", 
                        completionResult, resultLower);
                    // Проверяем различные варианты "не согласован"
                    if (resultLower.contains("не согласован") || 
                        resultLower.contains("не согласована") ||
                        resultLower.contains("не согласовано") ||
                        resultLower.contains("отклонен") ||
                        resultLower.contains("отклонена")) {
                        hasNotCoordinated = true;
                        logger.info("Found not coordinated approval for purchase {} (purchaseRequestId: {}): stage={}, role={}, result='{}'", 
                            purchase.getId(), purchaseRequestId, approval.getStage(), approval.getRole(), completionResult);
                        break; // Достаточно одного "не согласовано"
                    }
                } else {
                    logger.debug("Approval has no completion result or it's empty");
                }
            }
        } else {
            logger.info("No approvals found for purchase {} (purchaseRequestId: {})", purchase.getId(), purchaseRequestId);
        }

        // Если есть "не согласовано", устанавливаем статус "Не согласовано"
        if (hasNotCoordinated) {
            newStatus = PurchaseStatus.NOT_COORDINATED;
            logger.info("Purchase {} has not coordinated approvals, setting status to NOT_COORDINATED", purchaseRequestId);
        }

        // Обновляем статус только если он изменился
        if (newStatus != null && currentStatus != newStatus) {
            purchase.setStatus(newStatus);
            purchaseRepository.save(purchase);
            logger.info("Status updated for purchase {}: {} -> {}", 
                purchaseRequestId, 
                currentStatus != null ? currentStatus.getDisplayName() : "null",
                newStatus.getDisplayName());
        } else if (newStatus == null) {
            logger.debug("No status change needed for purchase {} (no not coordinated approvals found)", purchaseRequestId);
        } else {
            logger.debug("Status for purchase {} already set to: {}", purchaseRequestId, newStatus.getDisplayName());
        }
    }

    /**
     * Массовое обновление статусов для всех закупок
     * Используется после парсинга данных для обновления всех статусов
     */
    @Transactional
    public void updateAllStatuses() {
        logger.info("Starting mass status update for all purchases");
        long startTime = System.currentTimeMillis();

        List<Purchase> allPurchases = purchaseRepository.findAll();
        logger.info("Found {} purchases to update", allPurchases.size());

        int updatedCount = 0;
        int errorCount = 0;

        for (Purchase purchase : allPurchases) {
            try {
                PurchaseStatus oldStatus = purchase.getStatus();
                if (purchase.getPurchaseRequestId() != null) {
                    updateStatus(purchase.getPurchaseRequestId());
                    // Re-fetch to check if status actually changed
                    Purchase updatedPurchase = purchaseRepository.findFirstByPurchaseRequestId(purchase.getPurchaseRequestId()).orElse(null);
                    if (updatedPurchase != null && updatedPurchase.getStatus() != oldStatus) {
                        updatedCount++;
                    }
                }
            } catch (Exception e) {
                errorCount++;
                logger.error("Error updating status for purchase {}: {}",
                    purchase.getPurchaseRequestId(), e.getMessage(), e);
            }
        }

        long processingTime = System.currentTimeMillis() - startTime;
        logger.info("Mass purchase status update completed: {} purchases processed, {} updated, {} errors, time: {} ms",
            allPurchases.size(), updatedCount, errorCount, processingTime);
    }

    /**
     * Обновление статусов для закупок с указанными purchaseRequestId
     *
     * @param purchaseRequestIds список purchaseRequestId закупок для обновления
     */
    @Transactional
    public void updateStatuses(List<Long> purchaseRequestIds) {
        logger.info("Starting status update for {} purchases", purchaseRequestIds.size());
        long startTime = System.currentTimeMillis();

        int updatedCount = 0;
        int errorCount = 0;

        for (Long purchaseRequestId : purchaseRequestIds) {
            try {
                updateStatus(purchaseRequestId);
                updatedCount++;
            } catch (Exception e) {
                errorCount++;
                logger.error("Error updating status for purchase {}: {}",
                    purchaseRequestId, e.getMessage(), e);
            }
        }

        long processingTime = System.currentTimeMillis() - startTime;
        logger.info("Purchase status update completed: {} purchases processed, {} updated, {} errors, time: {} ms",
            purchaseRequestIds.size(), updatedCount, errorCount, processingTime);
    }
}

