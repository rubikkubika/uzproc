package com.uzproc.backend.service.purchase;

import com.uzproc.backend.entity.purchase.Purchase;
import com.uzproc.backend.entity.purchase.PurchaseApproval;
import com.uzproc.backend.entity.purchase.PurchaseStatus;
import com.uzproc.backend.repository.purchase.PurchaseApprovalRepository;
import com.uzproc.backend.repository.purchase.PurchaseRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Сервис для обновления статусов закупок
 * Проверяет согласования для определения статуса
 */
@Service
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
     * Логика (приоритет по убыванию):
     * - Если в согласованиях закупки есть визы "Не согласовано", то статус закупки "Не согласовано"
     * - Статус "Завершена" только если все согласования на этапе "Закупочная комиссия" / "Проверка результата закупочной комиссии" завершены с положительным результатом и нет других активных согласований
     * - Если есть активные согласования (не завершены) — статус "На согласовании" (в т.ч. понижение с "Завершена")
     *
     * @param purchaseRequestId ID закупки (purchase_request_id)
     */
    @Transactional
    public void updateStatus(Long purchaseRequestId) {
        List<Purchase> purchases = purchaseRepository.findByPurchaseRequestId(purchaseRequestId);

        if (purchases == null || purchases.isEmpty()) {
            logger.debug("No purchases with purchaseRequestId {} found for status update", purchaseRequestId);
            return;
        }

        // Согласования привязаны к заявке (purchase_request_id), общий набор виз для всех закупок по этой заявке
        Purchase firstPurchase = purchases.get(0);
        logger.info("Updating status for purchases with purchaseRequestId: {} ({} purchase(s)), first purchaseId: {}, current status: {}",
            purchaseRequestId, purchases.size(), firstPurchase.getId(),
            firstPurchase.getStatus() != null ? firstPurchase.getStatus().getDisplayName() : "null");

        // Получаем все согласования для заявки (общие для всех закупок по этой заявке)
        List<PurchaseApproval> approvals = purchaseApprovalRepository.findByPurchaseRequestId(purchaseRequestId);
        logger.info("Found {} approvals for purchaseRequestId: {}", approvals.size(), purchaseRequestId);

        // Определяем новый статус на основе согласований
        PurchaseStatus newStatus = null;

        boolean hasNotCoordinated = false;
        boolean hasActiveApprovals = false;

        if (!approvals.isEmpty()) {
            logger.info("Checking {} approvals for purchaseRequestId: {}", approvals.size(), purchaseRequestId);
            for (PurchaseApproval approval : approvals) {
                String completionResult = approval.getCompletionResult();
                logger.info("Checking approval for purchaseRequestId {}: stage={}, role={}, completionResult={}, completionDate={}",
                    purchaseRequestId, approval.getStage(), approval.getRole(),
                    completionResult != null ? completionResult : "null",
                    approval.getCompletionDate() != null ? approval.getCompletionDate() : "null");

                if (completionResult != null && !completionResult.trim().isEmpty()) {
                    String resultLower = completionResult.toLowerCase().trim();
                    if (resultLower.contains("не согласован") ||
                        resultLower.contains("не согласована") ||
                        resultLower.contains("не согласовано") ||
                        resultLower.contains("отклонен") ||
                        resultLower.contains("отклонена")) {
                        hasNotCoordinated = true;
                        logger.info("Found not coordinated approval for purchaseRequestId {}: stage={}, role={}, result='{}'",
                            purchaseRequestId, approval.getStage(), approval.getRole(), completionResult);
                        break;
                    }
                }

                if (approval.getCompletionDate() == null) {
                    hasActiveApprovals = true;
                    logger.debug("Found active approval (no completion date) for purchaseRequestId {}: stage={}, role={}",
                        purchaseRequestId, approval.getStage(), approval.getRole());
                }
            }
        } else {
            logger.info("No approvals found for purchaseRequestId: {}", purchaseRequestId);
        }

        boolean allApprovalsCompleted = !approvals.isEmpty() && !hasActiveApprovals;

        if (hasNotCoordinated) {
            newStatus = PurchaseStatus.NOT_COORDINATED;
            logger.info("Purchase {} has not coordinated approvals, setting status to NOT_COORDINATED", purchaseRequestId);
        } else if (allApprovalsCompleted) {
            newStatus = PurchaseStatus.COMPLETED;
            logger.info("Purchase {} (purchaseRequestId: {}) all approvals completed, setting status to COMPLETED",
                    purchaseRequestId, purchaseRequestId);
        } else if (hasActiveApprovals) {
            newStatus = PurchaseStatus.ON_COORDINATION;
            logger.info("Purchase {} (purchaseRequestId: {}) has active approvals, setting status to ON_COORDINATION",
                    purchaseRequestId, purchaseRequestId);
        }

        // Обновляем статус у всех закупок по этой заявке (визы общие для заявки)
        if (newStatus != null) {
            int updated = 0;
            for (Purchase p : purchases) {
                if (p.getStatus() != newStatus) {
                    PurchaseStatus oldStatus = p.getStatus();
                    p.setStatus(newStatus);
                    purchaseRepository.save(p);
                    updated++;
                    logger.info("Status updated for purchase id={}, innerId={}: {} -> {}",
                        p.getId(), p.getInnerId(),
                        oldStatus != null ? oldStatus.getDisplayName() : "null",
                        newStatus.getDisplayName());
                }
            }
            if (updated > 0) {
                purchaseRepository.flush();
                logger.info("Status updated for purchaseRequestId {}: {} purchase(s) set to {}",
                    purchaseRequestId, updated, newStatus.getDisplayName());
            } else {
                logger.debug("Status for all {} purchase(s) with purchaseRequestId {} already set to: {}",
                    purchases.size(), purchaseRequestId, newStatus.getDisplayName());
            }
        } else {
            logger.debug("No status change needed for purchaseRequestId {} (newStatus not determined)", purchaseRequestId);
        }
    }

    /**
     * Массовое обновление статусов для всех закупок
     * Используется после парсинга данных для обновления всех статусов
     * Каждая обработка записи выполняется в отдельной транзакции с явным flush для освобождения соединения
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
                    // Каждый вызов updateStatus выполняется в отдельной транзакции
                    updateStatusInNewTransaction(purchase.getPurchaseRequestId());
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
     * Обновляет статус в новой транзакции (для массовых обновлений)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    private void updateStatusInNewTransaction(Long purchaseRequestId) {
        updateStatus(purchaseRequestId);
    }

    /**
     * Обновление статусов для закупок с указанными purchaseRequestId
     * Каждая обработка записи выполняется в отдельной транзакции
     *
     * @param purchaseRequestIds список purchaseRequestId закупок для обновления
     */
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

