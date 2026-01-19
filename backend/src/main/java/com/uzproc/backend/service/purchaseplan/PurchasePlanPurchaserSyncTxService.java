package com.uzproc.backend.service.purchaseplan;

import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.purchaseplan.PurchasePlanItemRepository;
import com.uzproc.backend.repository.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * Отдельный сервис для выполнения транзакционных операций синхронизации закупщика.
 * 
 * Выделен из PurchasePlanPurchaserSyncService для корректной работы @Transactional(propagation = REQUIRES_NEW).
 * При self-invocation (вызов метода того же класса) Spring AOP proxy не применяет аспекты,
 * поэтому транзакционный метод вынесен в отдельный Spring Bean.
 */
@Service
public class PurchasePlanPurchaserSyncTxService {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanPurchaserSyncTxService.class);

    private final PurchasePlanItemRepository purchasePlanItemRepository;
    private final UserRepository userRepository;

    public PurchasePlanPurchaserSyncTxService(
            PurchasePlanItemRepository purchasePlanItemRepository,
            UserRepository userRepository) {
        this.purchasePlanItemRepository = purchasePlanItemRepository;
        this.userRepository = userRepository;
    }

    /**
     * Синхронизирует закупщика для одной позиции плана в НОВОЙ транзакции.
     * Используется из read-only транзакции для сохранения изменений в БД.
     * 
     * Поддерживает три сценария:
     * 1. Установка закупщика (purchaserFromRequestId != null) — UPDATE purchaser_id = :purchaserId
     * 2. Очистка закупщика (purchaserFromRequestId == null, clearPurchaser == true) — UPDATE purchaser_id = NULL
     * 3. Пропуск (purchaserFromRequestId == null, clearPurchaser == false) — ничего не делать
     * 
     * @param planItemId ID позиции плана
     * @param purchaserFromRequestId ID закупщика из заявки (null = очистить, если clearPurchaser == true)
     * @param clearPurchaser если true и purchaserFromRequestId == null, то очищает закупщика
     * @return true если закупщик был обновлен или очищен
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean syncPurchaserInNewTransaction(Long planItemId, Long purchaserFromRequestId, boolean clearPurchaser) {
        logger.debug("syncPurchaserInNewTransaction called: planItemId={}, purchaserFromRequestId={}, clearPurchaser={}", 
                planItemId, purchaserFromRequestId, clearPurchaser);
        
        if (planItemId == null) {
            logger.debug("planItemId is null, skipping");
            return false;
        }

        // Сценарий 1: Установка закупщика
        if (purchaserFromRequestId != null) {
            // Обновляем напрямую через SQL, минуя проблемы с кэшем Hibernate
            // UPDATE только если purchaser_id отличается (условие в запросе)
            int updated = purchasePlanItemRepository.updatePurchaserIdById(planItemId, purchaserFromRequestId);
            
            if (updated > 0) {
                // Получаем данные для логирования
                User newPurchaser = userRepository.findById(purchaserFromRequestId).orElse(null);
                String newPurchaserName = formatUserName(newPurchaser);
                
                logger.info("Auto-synced purchaser for plan item {}: -> {} (updated via SQL)", planItemId, newPurchaserName);
                return true;
            }
            
            logger.debug("No update needed for plan item {} - purchaser already set to {}", planItemId, purchaserFromRequestId);
            return false;
        }

        // Сценарий 2: Очистка закупщика
        if (clearPurchaser) {
            // Очищаем purchaser_id (SET NULL), только если он сейчас не null
            int updated = purchasePlanItemRepository.clearPurchaserIdById(planItemId);
            
            if (updated > 0) {
                logger.info("Cleared purchaser for plan item {} (set to NULL via SQL)", planItemId);
                return true;
            }
            
            logger.debug("No update needed for plan item {} - purchaser already null", planItemId);
            return false;
        }

        // Сценарий 3: Пропуск
        logger.debug("purchaserFromRequestId is null and clearPurchaser is false, skipping plan item {}", planItemId);
        return false;
    }

    /**
     * Упрощенная версия для обратной совместимости.
     * Устанавливает закупщика, если purchaserFromRequestId != null.
     * Если purchaserFromRequestId == null — пропускает (не очищает).
     * 
     * @param planItemId ID позиции плана
     * @param purchaserFromRequestId ID закупщика из заявки
     * @return true если закупщик был обновлен
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean syncPurchaserInNewTransaction(Long planItemId, Long purchaserFromRequestId) {
        return syncPurchaserInNewTransaction(planItemId, purchaserFromRequestId, false);
    }

    /**
     * Форматирует имя пользователя как "Фамилия Имя" или username если фамилия/имя не заполнены.
     */
    private String formatUserName(User user) {
        if (user == null) {
            return null;
        }
        if (user.getSurname() != null && user.getName() != null) {
            return user.getSurname() + " " + user.getName();
        }
        return user.getUsername();
    }
}
