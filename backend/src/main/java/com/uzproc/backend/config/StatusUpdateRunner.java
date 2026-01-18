package com.uzproc.backend.config;

import com.uzproc.backend.service.contract.ContractStatusUpdateService;
import com.uzproc.backend.service.purchaserequest.PurchaseRequestStatusUpdateService;
import com.uzproc.backend.service.purchase.PurchaseStatusUpdateService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

/**
 * Компонент для автоматического обновления статусов при запуске приложения
 * Запускается после всех парсингов Excel (если они есть) или просто при старте
 */
@Component
@Order(1000) // Высокий порядок, чтобы запускаться после всех парсингов
public class StatusUpdateRunner implements CommandLineRunner {

    private static final Logger logger = LoggerFactory.getLogger(StatusUpdateRunner.class);

    private final PurchaseStatusUpdateService purchaseStatusUpdateService;
    private final ContractStatusUpdateService contractStatusUpdateService;
    private final PurchaseRequestStatusUpdateService purchaseRequestStatusUpdateService;

    public StatusUpdateRunner(
            PurchaseStatusUpdateService purchaseStatusUpdateService,
            ContractStatusUpdateService contractStatusUpdateService,
            PurchaseRequestStatusUpdateService purchaseRequestStatusUpdateService) {
        this.purchaseStatusUpdateService = purchaseStatusUpdateService;
        this.contractStatusUpdateService = contractStatusUpdateService;
        this.purchaseRequestStatusUpdateService = purchaseRequestStatusUpdateService;
    }

    @Override
    public void run(String... args) throws Exception {
        logger.info("=== Starting automatic status update services ===");
        
        try {
            // Обновляем статусы в правильном порядке:
            // 1. Сначала статусы закупок
            // 2. Затем статусы договоров
            // 3. Затем статусы заявок (которые зависят от статусов закупок и договоров)
            
            if (purchaseStatusUpdateService != null) {
                logger.info("=== Starting status update for all purchases ===");
                try {
                    purchaseStatusUpdateService.updateAllStatuses();
                    logger.info("=== Purchase status update completed successfully ===");
                } catch (Exception e) {
                    logger.error("=== ERROR during purchase status update: {} ===", e.getMessage(), e);
                }
            } else {
                logger.warn("=== purchaseStatusUpdateService is NULL, skipping purchase status update ===");
            }
            
            if (contractStatusUpdateService != null) {
                logger.info("Starting status update for all contracts");
                try {
                    contractStatusUpdateService.updateAllStatuses();
                    logger.info("Contract status update completed successfully");
                } catch (Exception e) {
                    logger.error("Error during contract status update: {}", e.getMessage(), e);
                }
            } else {
                logger.warn("contractStatusUpdateService is NULL, skipping contract status update");
            }
            
            if (purchaseRequestStatusUpdateService != null) {
                logger.info("Starting status update for all purchase requests");
                try {
                    purchaseRequestStatusUpdateService.updateAllStatuses();
                    logger.info("Purchase request status update completed successfully");
                } catch (Exception e) {
                    logger.error("Error during purchase request status update: {}", e.getMessage(), e);
                }
            } else {
                logger.warn("purchaseRequestStatusUpdateService is NULL, skipping purchase request status update");
            }
            
            logger.info("=== Automatic status update services completed ===");
        } catch (Exception e) {
            logger.error("=== ERROR during automatic status update services: {} ===", e.getMessage(), e);
        }
    }
}

