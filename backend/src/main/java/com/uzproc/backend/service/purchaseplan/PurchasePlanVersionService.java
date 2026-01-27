package com.uzproc.backend.service.purchaseplan;

import com.uzproc.backend.dto.purchaseplan.PurchasePlanItemDto;
import com.uzproc.backend.dto.purchaseplan.PurchasePlanVersionDto;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.entity.purchaseplan.PurchasePlanItem;
import com.uzproc.backend.entity.purchaseplan.PurchasePlanItemVersion;
import com.uzproc.backend.entity.purchaseplan.PurchasePlanVersion;
import com.uzproc.backend.repository.CfoRepository;
import com.uzproc.backend.repository.purchaseplan.PurchasePlanItemRepository;
import com.uzproc.backend.repository.purchaseplan.PurchasePlanItemVersionRepository;
import com.uzproc.backend.repository.purchaseplan.PurchasePlanVersionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PurchasePlanVersionService {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanVersionService.class);

    private final PurchasePlanVersionRepository versionRepository;
    private final PurchasePlanItemRepository itemRepository;
    private final PurchasePlanItemVersionRepository itemVersionRepository;
    private final CfoRepository cfoRepository;

    public PurchasePlanVersionService(
            PurchasePlanVersionRepository versionRepository,
            PurchasePlanItemRepository itemRepository,
            PurchasePlanItemVersionRepository itemVersionRepository,
            CfoRepository cfoRepository) {
        this.versionRepository = versionRepository;
        this.itemRepository = itemRepository;
        this.itemVersionRepository = itemVersionRepository;
        this.cfoRepository = cfoRepository;
    }

    @Transactional
    public PurchasePlanVersionDto createVersion(Integer year, String description, String createdBy) {
        logger.info("Creating new version for year {} with description: {}", year, description);

        // 1. Получить текущий максимальный номер версии для года
        Integer maxVersion = versionRepository.findMaxVersionNumberByYear(year).orElse(0);
        Integer newVersionNumber = maxVersion + 1;
        logger.info("New version number for year {}: {}", year, newVersionNumber);

        // 2. Снять флаг is_current со всех предыдущих версий этого года
        versionRepository.findByYearAndIsCurrentTrue(year).ifPresent(v -> {
            v.setIsCurrent(false);
            versionRepository.save(v);
            logger.info("Removed is_current flag from version {} for year {}", v.getVersionNumber(), year);
        });

        // 3. Создать новую версию
        PurchasePlanVersion version = new PurchasePlanVersion(newVersionNumber, year, description, createdBy);
        version.setIsCurrent(true);

        // 4. Скопировать все текущие строки плана закупок в purchase_plan_item_versions
        // Загружаем элементы с purchaser (LAZY поле) через JOIN FETCH
        // Важно: используем актуальные данные из БД, не кэшированные
        List<PurchasePlanItem> currentItems = itemRepository.findByYearWithPurchaser(year);
        logger.info("Found {} items to copy for year {}", currentItems.size(), year);
        
        // Проверяем, что данные актуальные - логируем примеры purchaser и purchaserCompany
        if (!currentItems.isEmpty()) {
            PurchasePlanItem firstItem = currentItems.get(0);
            String purchaserName = firstItem.getPurchaser() != null 
                ? (firstItem.getPurchaser().getSurname() != null && firstItem.getPurchaser().getName() != null
                    ? firstItem.getPurchaser().getSurname() + " " + firstItem.getPurchaser().getName()
                    : firstItem.getPurchaser().getUsername())
                : null;
            String purchaserCompanyName = firstItem.getPurchaserCompany() != null 
                ? firstItem.getPurchaserCompany().getDisplayName() 
                : null;
            logger.debug("Sample item {}: purchaser={}, purchaserCompany={}", 
                firstItem.getId(), purchaserName, purchaserCompanyName);
        }

        List<PurchasePlanItemVersion> itemVersions = new ArrayList<>();
        for (PurchasePlanItem item : currentItems) {
            PurchasePlanItemVersion itemVersion = copyItemToVersion(item, version);
            itemVersions.add(itemVersion);
        }

        version.setItems(itemVersions);
        PurchasePlanVersion saved = versionRepository.save(version);
        logger.info("Created version {} for year {} with {} items", newVersionNumber, year, itemVersions.size());

        return toDto(saved);
    }

    private PurchasePlanItemVersion copyItemToVersion(PurchasePlanItem item, PurchasePlanVersion version) {
        PurchasePlanItemVersion itemVersion = new PurchasePlanItemVersion();
        itemVersion.setVersion(version);
        itemVersion.setPurchasePlanItemId(item.getId());
        itemVersion.setGuid(item.getGuid());
        itemVersion.setYear(item.getYear());
        itemVersion.setCompany(item.getCompany());
        itemVersion.setPurchaserCompany(item.getPurchaserCompany());
        if (item.getPurchaserCompany() != null) {
            logger.debug("Copied purchaserCompany for item {}: {}", item.getId(), item.getPurchaserCompany().getDisplayName());
        } else {
            logger.debug("Item {} has no purchaserCompany", item.getId());
        }
        itemVersion.setCfo(item.getCfo());
        itemVersion.setPurchaseSubject(item.getPurchaseSubject());
        itemVersion.setBudgetAmount(item.getBudgetAmount());
        itemVersion.setContractEndDate(item.getContractEndDate());
        itemVersion.setRequestDate(item.getRequestDate());
        itemVersion.setNewContractDate(item.getNewContractDate());
        // Конвертируем User в строку (фамилия + имя)
        if (item.getPurchaser() != null) {
            User purchaser = item.getPurchaser();
            String purchaserName = purchaser.getSurname() != null && purchaser.getName() != null
                ? purchaser.getSurname() + " " + purchaser.getName()
                : purchaser.getUsername();
            itemVersion.setPurchaser(purchaserName);
            logger.debug("Copied purchaser for item {}: {}", item.getId(), purchaserName);
        } else {
            itemVersion.setPurchaser(null);
            logger.debug("Item {} has no purchaser", item.getId());
        }
        itemVersion.setProduct(item.getProduct());
        itemVersion.setHasContract(item.getHasContract());
        itemVersion.setCurrentKa(item.getCurrentKa());
        itemVersion.setCurrentAmount(item.getCurrentAmount());
        itemVersion.setCurrentContractAmount(item.getCurrentContractAmount());
        itemVersion.setCurrentContractBalance(item.getCurrentContractBalance());
        itemVersion.setCurrentContractEndDate(item.getCurrentContractEndDate());
        itemVersion.setAutoRenewal(item.getAutoRenewal());
        itemVersion.setComplexity(item.getComplexity());
        itemVersion.setHolding(item.getHolding());
        itemVersion.setCategory(item.getCategory());
        itemVersion.setStatus(item.getStatus());
        itemVersion.setState(item.getState());
        itemVersion.setPurchaseRequestId(item.getPurchaseRequestId());
        itemVersion.setComment(item.getComment());
        return itemVersion;
    }

    public List<PurchasePlanVersionDto> getVersionsByYear(Integer year) {
        List<PurchasePlanVersion> versions = versionRepository.findByYearOrderByVersionNumberDesc(year);
        return versions.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public PurchasePlanVersionDto getVersion(Long versionId) {
        return versionRepository.findById(versionId)
                .map(this::toDto)
                .orElse(null);
    }

    public List<PurchasePlanItemDto> getVersionItems(Long versionId) {
        List<PurchasePlanItemVersion> itemVersions = itemVersionRepository.findByVersionId(versionId);
        logger.info("Loading {} items for version {}", itemVersions.size(), versionId);
        // Проверяем поле purchaser в первых нескольких элементах
        int itemsWithPurchaser = 0;
        int itemsWithoutPurchaser = 0;
        for (PurchasePlanItemVersion itemVersion : itemVersions) {
            if (itemVersion.getPurchaser() != null && !itemVersion.getPurchaser().trim().isEmpty()) {
                itemsWithPurchaser++;
                if (itemsWithPurchaser <= 3) {
                    logger.debug("Item {} has purchaser: {}", itemVersion.getPurchasePlanItemId(), itemVersion.getPurchaser());
                }
            } else {
                itemsWithoutPurchaser++;
                if (itemsWithoutPurchaser <= 3) {
                    logger.debug("Item {} has no purchaser (null or empty)", itemVersion.getPurchasePlanItemId());
                }
            }
        }
        logger.info("Version {} items: {} with purchaser, {} without purchaser", versionId, itemsWithPurchaser, itemsWithoutPurchaser);
        return itemVersions.stream()
                .map(this::itemVersionToDto)
                .collect(java.util.stream.Collectors.toList());
    }

    private PurchasePlanItemDto itemVersionToDto(PurchasePlanItemVersion itemVersion) {
        PurchasePlanItemDto dto = new PurchasePlanItemDto();
        dto.setId(itemVersion.getPurchasePlanItemId()); // Используем ID оригинальной записи, если есть
        dto.setGuid(itemVersion.getGuid());
        dto.setYear(itemVersion.getYear());
        dto.setCompany(itemVersion.getCompany() != null ? itemVersion.getCompany().getDisplayName() : null);
        dto.setPurchaserCompany(itemVersion.getPurchaserCompany() != null ? itemVersion.getPurchaserCompany().getDisplayName() : null);
        dto.setCfo(itemVersion.getCfo() != null ? itemVersion.getCfo().getName() : null);
        dto.setPurchaseSubject(itemVersion.getPurchaseSubject());
        dto.setBudgetAmount(itemVersion.getBudgetAmount());
        dto.setContractEndDate(itemVersion.getContractEndDate());
        dto.setRequestDate(itemVersion.getRequestDate());
        dto.setNewContractDate(itemVersion.getNewContractDate());
        // purchaser в itemVersion уже строка, просто используем её
        String purchaser = itemVersion.getPurchaser();
        dto.setPurchaser(purchaser);
        if (purchaser == null || purchaser.trim().isEmpty()) {
            logger.debug("Item version {} (itemId: {}) has empty purchaser", itemVersion.getId(), itemVersion.getPurchasePlanItemId());
        }
        dto.setProduct(itemVersion.getProduct());
        dto.setHasContract(itemVersion.getHasContract());
        dto.setCurrentKa(itemVersion.getCurrentKa());
        dto.setCurrentAmount(itemVersion.getCurrentAmount());
        dto.setCurrentContractAmount(itemVersion.getCurrentContractAmount());
        dto.setCurrentContractBalance(itemVersion.getCurrentContractBalance());
        dto.setCurrentContractEndDate(itemVersion.getCurrentContractEndDate());
        dto.setAutoRenewal(itemVersion.getAutoRenewal());
        dto.setComplexity(itemVersion.getComplexity());
        dto.setHolding(itemVersion.getHolding());
        dto.setCategory(itemVersion.getCategory());
        dto.setStatus(itemVersion.getStatus());
        dto.setState(itemVersion.getState());
        dto.setPurchaseRequestId(itemVersion.getPurchaseRequestId());
        dto.setComment(itemVersion.getComment());
        dto.setCreatedAt(itemVersion.getCreatedAt());
        dto.setUpdatedAt(itemVersion.getCreatedAt()); // В версии нет updatedAt, используем createdAt
        return dto;
    }

    private PurchasePlanVersionDto toDto(PurchasePlanVersion version) {
        PurchasePlanVersionDto dto = new PurchasePlanVersionDto();
        dto.setId(version.getId());
        dto.setVersionNumber(version.getVersionNumber());
        dto.setYear(version.getYear());
        dto.setDescription(version.getDescription());
        dto.setCreatedBy(version.getCreatedBy());
        dto.setIsCurrent(version.getIsCurrent());
        dto.setCreatedAt(version.getCreatedAt());
        dto.setItemsCount(version.getItems() != null ? version.getItems().size() : 0);
        return dto;
    }
}

