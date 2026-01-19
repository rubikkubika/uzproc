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

    public PurchasePlanPurchaserSyncService(
            PurchasePlanItemRepository purchasePlanItemRepository,
            PurchaseRequestRepository purchaseRequestRepository,
            UserRepository userRepository,
            PurchasePlanItemChangeService purchasePlanItemChangeService) {
        this.purchasePlanItemRepository = purchasePlanItemRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.userRepository = userRepository;
        this.purchasePlanItemChangeService = purchasePlanItemChangeService;
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
     * Ищет пользователя по имени закупщика (строка "Фамилия Имя" или частичное совпадение).
     */
    private User findUserByPurchaserName(String purchaserName) {
        if (purchaserName == null || purchaserName.trim().isEmpty()) {
            return null;
        }

        String trimmedName = purchaserName.trim();
        String[] parts = trimmedName.split("\\s+");

        // Сначала пробуем найти по точному совпадению фамилии и имени
        if (parts.length >= 2) {
            Optional<User> userOpt = userRepository.findBySurnameAndName(parts[0], parts[1]);
            if (userOpt.isPresent()) {
                return userOpt.get();
            }
        }

        // Если не нашли по точному совпадению, ищем по частичному совпадению
        List<User> allUsers = userRepository.findAll();
        for (User user : allUsers) {
            String fullName = formatUserName(user);
            if (fullName != null && fullName.toLowerCase().contains(trimmedName.toLowerCase())) {
                return user;
            }
            // Также проверяем по частичному совпадению фамилии или имени
            if (user.getSurname() != null && user.getSurname().toLowerCase().contains(trimmedName.toLowerCase())) {
                return user;
            }
            if (user.getName() != null && user.getName().toLowerCase().contains(trimmedName.toLowerCase())) {
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
