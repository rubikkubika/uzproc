package com.uzproc.backend.service.purchaseplan;

import com.uzproc.backend.entity.purchaseplan.PurchasePlanItem;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.purchaseplan.PurchasePlanItemRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
import com.uzproc.backend.repository.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Сервис для синхронизации закупщика между заявками на закупку и позициями плана закупок.
 * 
 * При изменении закупщика в заявке на закупку, этот сервис обновляет закупщика 
 * во всех связанных позициях плана закупок.
 */
@Service
public class PurchasePlanPurchaserSyncService {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanPurchaserSyncService.class);

    private final PurchasePlanItemRepository purchasePlanItemRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final UserRepository userRepository;
    private final PurchasePlanItemChangeService purchasePlanItemChangeService;
    private final PurchasePlanPurchaserSyncTxService purchaserSyncTxService;

    public PurchasePlanPurchaserSyncService(
            PurchasePlanItemRepository purchasePlanItemRepository,
            PurchaseRequestRepository purchaseRequestRepository,
            UserRepository userRepository,
            PurchasePlanItemChangeService purchasePlanItemChangeService,
            PurchasePlanPurchaserSyncTxService purchaserSyncTxService) {
        this.purchasePlanItemRepository = purchasePlanItemRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.userRepository = userRepository;
        this.purchasePlanItemChangeService = purchasePlanItemChangeService;
        this.purchaserSyncTxService = purchaserSyncTxService;
    }

    /**
     * Синхронизирует закупщика из заявки на закупку в позиции плана закупок.
     * Вызывается при изменении закупщика в заявке на закупку.
     * 
     * @param idPurchaseRequest номер заявки на закупку (idPurchaseRequest)
     * @param purchaserName имя закупщика из заявки (строка "Фамилия Имя")
     * @return количество обновленных позиций плана
     */
    @Transactional
    public int syncPurchaserFromRequest(Long idPurchaseRequest, String purchaserName) {
        if (idPurchaseRequest == null) {
            logger.debug("syncPurchaserFromRequest: idPurchaseRequest is null, skipping");
            return 0;
        }

        // Находим все позиции плана, связанные с этой заявкой
        List<PurchasePlanItem> planItems = purchasePlanItemRepository.findByPurchaseRequestId(idPurchaseRequest);
        
        if (planItems.isEmpty()) {
            logger.debug("syncPurchaserFromRequest: No plan items found for purchaseRequestId={}", idPurchaseRequest);
            return 0;
        }

        // Ищем пользователя по имени закупщика
        User purchaserUser = findUserByPurchaserName(purchaserName);

        int updatedCount = 0;
        for (PurchasePlanItem item : planItems) {
            User oldPurchaser = item.getPurchaser();
            
            // Проверяем, нужно ли обновление
            boolean needsUpdate = false;
            if (purchaserUser == null && oldPurchaser != null) {
                needsUpdate = true;
            } else if (purchaserUser != null && oldPurchaser == null) {
                needsUpdate = true;
            } else if (purchaserUser != null && oldPurchaser != null && !purchaserUser.getId().equals(oldPurchaser.getId())) {
                needsUpdate = true;
            }

            if (needsUpdate) {
                // Формируем имена для логирования
                String oldPurchaserName = oldPurchaser != null 
                    ? formatUserName(oldPurchaser)
                    : null;
                String newPurchaserName = purchaserUser != null 
                    ? formatUserName(purchaserUser)
                    : null;

                // Логируем изменение
                purchasePlanItemChangeService.logChange(
                    item.getId(),
                    item.getGuid(),
                    "purchaser",
                    oldPurchaserName,
                    newPurchaserName
                );

                item.setPurchaser(purchaserUser);
                purchasePlanItemRepository.save(item);
                updatedCount++;
                
                logger.info("Synced purchaser for plan item {}: {} -> {} (from purchaseRequest {})",
                    item.getId(), oldPurchaserName, newPurchaserName, idPurchaseRequest);
            }
        }

        if (updatedCount > 0) {
            logger.info("Synced purchaser from purchaseRequest {} to {} plan items", idPurchaseRequest, updatedCount);
        }

        return updatedCount;
    }

    /**
     * Получает закупщика из связанной заявки на закупку для позиции плана.
     * Используется при загрузке позиций плана для отображения актуального закупщика.
     * 
     * @param purchaseRequestId номер заявки на закупку (idPurchaseRequest)
     * @return User объект закупщика или null
     */
    public User getPurchaserFromRequest(Long purchaseRequestId) {
        if (purchaseRequestId == null) {
            return null;
        }

        Optional<PurchaseRequest> purchaseRequestOpt = purchaseRequestRepository.findByIdPurchaseRequest(purchaseRequestId);
        if (purchaseRequestOpt.isEmpty()) {
            return null;
        }

        PurchaseRequest purchaseRequest = purchaseRequestOpt.get();
        String purchaserName = purchaseRequest.getPurchaser();
        
        if (purchaserName == null || purchaserName.trim().isEmpty()) {
            return null;
        }

        return findUserByPurchaserName(purchaserName);
    }

    /**
     * Синхронизирует закупщика из заявки в позицию плана.
     * Обновляет позицию плана только если закупщик изменился.
     * 
     * @param planItem позиция плана закупок
     * @return true если закупщик был обновлен, false если изменений не было
     */
    @Transactional
    public boolean syncPurchaserForPlanItem(PurchasePlanItem planItem) {
        if (planItem == null || planItem.getPurchaseRequestId() == null) {
            return false;
        }

        User purchaserFromRequest = getPurchaserFromRequest(planItem.getPurchaseRequestId());
        User currentPurchaser = planItem.getPurchaser();

        // Проверяем, нужно ли обновление
        boolean needsUpdate = false;
        if (purchaserFromRequest == null && currentPurchaser != null) {
            needsUpdate = true;
        } else if (purchaserFromRequest != null && currentPurchaser == null) {
            needsUpdate = true;
        } else if (purchaserFromRequest != null && currentPurchaser != null 
                   && !purchaserFromRequest.getId().equals(currentPurchaser.getId())) {
            needsUpdate = true;
        }

        if (needsUpdate) {
            // Формируем имена для логирования
            String oldPurchaserName = currentPurchaser != null 
                ? formatUserName(currentPurchaser)
                : null;
            String newPurchaserName = purchaserFromRequest != null 
                ? formatUserName(purchaserFromRequest)
                : null;

            // Логируем изменение
            purchasePlanItemChangeService.logChange(
                planItem.getId(),
                planItem.getGuid(),
                "purchaser",
                oldPurchaserName,
                newPurchaserName
            );

            planItem.setPurchaser(purchaserFromRequest);
            purchasePlanItemRepository.save(planItem);
            
            logger.info("Auto-synced purchaser for plan item {}: {} -> {} (from purchaseRequest {})",
                planItem.getId(), oldPurchaserName, newPurchaserName, planItem.getPurchaseRequestId());
            
            return true;
        }

        return false;
    }

    /**
     * Синхронизирует закупщика для одной позиции плана в НОВОЙ транзакции.
     * Используется из read-only транзакции для сохранения изменений в БД.
     * 
     * Делегирует выполнение в отдельный Spring Bean (PurchasePlanPurchaserSyncTxService)
     * для корректной работы @Transactional(propagation = REQUIRES_NEW).
     * 
     * @param planItemId ID позиции плана
     * @param purchaserFromRequestId ID закупщика из заявки (null = очистить, если clearPurchaser == true)
     * @param clearPurchaser если true и purchaserFromRequestId == null, то очищает закупщика
     * @return true если закупщик был обновлен или очищен
     */
    public boolean syncPurchaserInNewTransaction(Long planItemId, Long purchaserFromRequestId, boolean clearPurchaser) {
        return purchaserSyncTxService.syncPurchaserInNewTransaction(planItemId, purchaserFromRequestId, clearPurchaser);
    }

    /**
     * Упрощенная версия для обратной совместимости.
     * Устанавливает закупщика, если purchaserFromRequestId != null.
     * 
     * @param planItemId ID позиции плана
     * @param purchaserFromRequestId ID закупщика из заявки
     * @return true если закупщик был обновлен
     */
    public boolean syncPurchaserInNewTransaction(Long planItemId, Long purchaserFromRequestId) {
        return purchaserSyncTxService.syncPurchaserInNewTransaction(planItemId, purchaserFromRequestId);
    }

    /**
     * Синхронизирует закупщиков для списка позиций плана.
     * Каждая позиция обрабатывается в отдельной транзакции через отдельный Spring Bean.
     * 
     * @param syncRequests список пар (planItemId, purchaserFromRequestId, clearPurchaser)
     * @return количество обновленных позиций
     */
    public int syncPurchasersInBatch(List<PurchaserSyncRequest> syncRequests) {
        if (syncRequests == null || syncRequests.isEmpty()) {
            return 0;
        }

        int updatedCount = 0;
        for (PurchaserSyncRequest request : syncRequests) {
            try {
                // Делегируем в отдельный Spring Bean для корректной работы REQUIRES_NEW
                boolean updated = purchaserSyncTxService.syncPurchaserInNewTransaction(
                        request.getPlanItemId(), 
                        request.getPurchaserUserId(),
                        request.isClearPurchaser()
                );
                if (updated) {
                    updatedCount++;
                }
            } catch (Exception e) {
                logger.error("Error syncing purchaser for plan item {}: {}", 
                    request.getPlanItemId(), e.getMessage());
            }
        }

        if (updatedCount > 0) {
            logger.info("Batch synced {} purchasers from {} requests", updatedCount, syncRequests.size());
        }

        return updatedCount;
    }

    /**
     * Класс для запроса синхронизации закупщика.
     * Поддерживает три сценария:
     * 1. Установка закупщика (purchaserUserId != null)
     * 2. Очистка закупщика (purchaserUserId == null, clearPurchaser == true)
     * 3. Пропуск (purchaserUserId == null, clearPurchaser == false)
     */
    public static class PurchaserSyncRequest {
        private final Long planItemId;
        private final Long purchaserUserId;
        private final boolean clearPurchaser;

        /**
         * Конструктор для установки закупщика (purchaserUserId != null) или пропуска (purchaserUserId == null).
         */
        public PurchaserSyncRequest(Long planItemId, Long purchaserUserId) {
            this(planItemId, purchaserUserId, false);
        }

        /**
         * Конструктор с поддержкой очистки закупщика.
         * 
         * @param planItemId ID позиции плана
         * @param purchaserUserId ID закупщика (null = очистить, если clearPurchaser == true)
         * @param clearPurchaser если true и purchaserUserId == null, то очищает закупщика
         */
        public PurchaserSyncRequest(Long planItemId, Long purchaserUserId, boolean clearPurchaser) {
            this.planItemId = planItemId;
            this.purchaserUserId = purchaserUserId;
            this.clearPurchaser = clearPurchaser;
        }

        public Long getPlanItemId() {
            return planItemId;
        }

        public Long getPurchaserUserId() {
            return purchaserUserId;
        }

        public boolean isClearPurchaser() {
            return clearPurchaser;
        }
    }

    /**
     * Ищет пользователя по имени закупщика (строка "Фамилия Имя" или частичное совпадение).
     * Обрабатывает формат "Имя Фамилия (Должность, Отдел)" - извлекает только имя и фамилию.
     */
    private User findUserByPurchaserName(String purchaserName) {
        if (purchaserName == null || purchaserName.trim().isEmpty()) {
            return null;
        }

        String trimmedName = purchaserName.trim();
        
        // Если в строке есть скобка, берём только часть до скобки (это имя и фамилия)
        // Например: "Dinara Fayzraxmanova (Отдел закупок, Менеджер)" -> "Dinara Fayzraxmanova"
        if (trimmedName.contains("(")) {
            trimmedName = trimmedName.substring(0, trimmedName.indexOf("(")).trim();
        }
        
        String[] parts = trimmedName.split("\\s+");

        // Сначала пробуем найти по точному совпадению фамилии и имени (первые два слова)
        if (parts.length >= 2) {
            // Пробуем parts[0] как фамилию, parts[1] как имя
            Optional<User> userOpt = userRepository.findBySurnameAndName(parts[0], parts[1]);
            if (userOpt.isPresent()) {
                return userOpt.get();
            }
            // Пробуем наоборот: parts[1] как фамилию, parts[0] как имя
            userOpt = userRepository.findBySurnameAndName(parts[1], parts[0]);
            if (userOpt.isPresent()) {
                return userOpt.get();
            }
        }

        // Если не нашли по точному совпадению, ищем по частичному совпадению
        final String searchName = trimmedName.toLowerCase();
        List<User> allUsers = userRepository.findAll();
        for (User user : allUsers) {
            String fullName = formatUserName(user);
            // Проверяем, содержит ли искомое имя полное имя пользователя или наоборот
            if (fullName != null) {
                String fullNameLower = fullName.toLowerCase();
                if (fullNameLower.contains(searchName) || searchName.contains(fullNameLower)) {
                    return user;
                }
            }
            // Также проверяем по частичному совпадению фамилии или имени
            if (user.getSurname() != null && searchName.contains(user.getSurname().toLowerCase())) {
                return user;
            }
            if (user.getName() != null && searchName.contains(user.getName().toLowerCase())) {
                return user;
            }
        }

        logger.debug("User not found for purchaser name: {}", purchaserName);
        return null;
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
