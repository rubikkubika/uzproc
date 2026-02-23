package com.uzproc.backend.service.purchaserequest;

import com.uzproc.backend.dto.purchaserequest.PurchaseRequestChangeDto;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestChange;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestChangeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class PurchaseRequestChangeService {

    private static final Logger logger = LoggerFactory.getLogger(PurchaseRequestChangeService.class);

    /** Поле updated_at заявки не логируем при изменениях */
    public static final String FIELD_UPDATED_AT = "updatedAt";

    /** Источник изменения: парсинг Excel */
    public static final String SOURCE_PARSING = "PARSING";
    /** Источник изменения: действие пользователя */
    public static final String SOURCE_USER = "USER";
    /** Отображаемое имя при парсинге */
    public static final String DISPLAY_NAME_PARSING = "Система (парсинг)";

    private final PurchaseRequestChangeRepository changeRepository;

    public PurchaseRequestChangeService(PurchaseRequestChangeRepository changeRepository) {
        this.changeRepository = changeRepository;
    }

    /**
     * Записывает изменение поля заявки на закупку (кроме поля updatedAt).
     */
    public void logChange(Long purchaseRequestId, UUID guid, String fieldName, Object valueBefore, Object valueAfter) {
        if (FIELD_UPDATED_AT.equals(fieldName)) {
            return;
        }
        try {
            String beforeStr = valueBefore != null ? valueBefore.toString() : null;
            String afterStr = valueAfter != null ? valueAfter.toString() : null;

            if ((beforeStr == null && afterStr == null) ||
                    (beforeStr != null && beforeStr.equals(afterStr))) {
                return;
            }

            PurchaseRequestChange change = new PurchaseRequestChange(
                    purchaseRequestId,
                    guid,
                    fieldName,
                    beforeStr,
                    afterStr
            );
            change.setChangeDate(LocalDateTime.now());

            changeRepository.save(change);
            logger.debug("Logged change for purchase request {}: field={}, before={}, after={}",
                    purchaseRequestId, fieldName, beforeStr, afterStr);
        } catch (Exception e) {
            logger.error("Error logging change for purchase request {}: {}", purchaseRequestId, e.getMessage(), e);
        }
    }

    /**
     * Записывает изменение с указанием источника и того, кто изменил (для парсинга — "Система (парсинг)", для пользователя — имя).
     */
    public void logChange(Long purchaseRequestId, UUID guid, String fieldName, Object valueBefore, Object valueAfter,
                         String changeSource, String changedByDisplayName) {
        if (FIELD_UPDATED_AT.equals(fieldName)) {
            return;
        }
        try {
            String beforeStr = valueBefore != null ? valueBefore.toString() : null;
            String afterStr = valueAfter != null ? valueAfter.toString() : null;

            if ((beforeStr == null && afterStr == null) ||
                    (beforeStr != null && beforeStr.equals(afterStr))) {
                return;
            }

            PurchaseRequestChange change = new PurchaseRequestChange(
                    purchaseRequestId,
                    guid,
                    fieldName,
                    beforeStr,
                    afterStr
            );
            change.setChangeDate(LocalDateTime.now());
            change.setChangeSource(changeSource);
            change.setChangedByDisplayName(changedByDisplayName);

            changeRepository.save(change);
            logger.debug("Logged change for purchase request {}: field={}, before={}, after={}, by={}",
                    purchaseRequestId, fieldName, beforeStr, afterStr, changedByDisplayName);
        } catch (Exception e) {
            logger.error("Error logging change for purchase request {}: {}", purchaseRequestId, e.getMessage(), e);
        }
    }

    @Transactional(readOnly = true)
    public List<PurchaseRequestChange> getChangesByPurchaseRequestId(Long purchaseRequestId) {
        return changeRepository.findByPurchaseRequestIdOrderByChangeDateDesc(purchaseRequestId);
    }

    @Transactional(readOnly = true)
    public Page<PurchaseRequestChangeDto> getChangesByPurchaseRequestIdPaginated(Long purchaseRequestId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "changeDate"));
        Page<PurchaseRequestChange> changes = changeRepository.findByPurchaseRequestId(purchaseRequestId, pageable);
        return changes.map(this::toDto);
    }

    private PurchaseRequestChangeDto toDto(PurchaseRequestChange entity) {
        PurchaseRequestChangeDto dto = new PurchaseRequestChangeDto();
        dto.setId(entity.getId());
        dto.setPurchaseRequestId(entity.getPurchaseRequestId());
        dto.setGuid(entity.getGuid());
        dto.setFieldName(entity.getFieldName());
        dto.setValueBefore(entity.getValueBefore());
        dto.setValueAfter(entity.getValueAfter());
        dto.setChangeDate(entity.getChangeDate());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setChangeSource(entity.getChangeSource());
        dto.setChangedByDisplayName(entity.getChangedByDisplayName());
        return dto;
    }
}
