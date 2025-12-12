package com.uzproc.backend.service;

import com.uzproc.backend.dto.PurchasePlanItemChangeDto;
import com.uzproc.backend.entity.PurchasePlanItemChange;
import com.uzproc.backend.repository.PurchasePlanItemChangeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class PurchasePlanItemChangeService {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanItemChangeService.class);
    
    private final PurchasePlanItemChangeRepository changeRepository;

    public PurchasePlanItemChangeService(PurchasePlanItemChangeRepository changeRepository) {
        this.changeRepository = changeRepository;
    }

    /**
     * Записывает изменение поля позиции плана закупок
     */
    public void logChange(Long purchasePlanItemId, UUID guid, String fieldName, Object valueBefore, Object valueAfter) {
        try {
            String beforeStr = valueBefore != null ? valueBefore.toString() : null;
            String afterStr = valueAfter != null ? valueAfter.toString() : null;
            
            // Если значения одинаковые, не записываем изменение
            if ((beforeStr == null && afterStr == null) || 
                (beforeStr != null && beforeStr.equals(afterStr))) {
                return;
            }
            
            PurchasePlanItemChange change = new PurchasePlanItemChange(
                purchasePlanItemId,
                guid,
                fieldName,
                beforeStr,
                afterStr
            );
            change.setChangeDate(LocalDateTime.now());
            
            changeRepository.save(change);
            logger.debug("Logged change for purchase plan item {}: field={}, before={}, after={}", 
                purchasePlanItemId, fieldName, beforeStr, afterStr);
        } catch (Exception e) {
            logger.error("Error logging change for purchase plan item {}: {}", purchasePlanItemId, e.getMessage(), e);
            // Не прерываем выполнение, если не удалось записать изменение
        }
    }

    /**
     * Получает историю изменений для позиции плана закупок
     */
    @Transactional(readOnly = true)
    public List<PurchasePlanItemChange> getChangesByItemId(Long purchasePlanItemId) {
        return changeRepository.findByPurchasePlanItemIdOrderByChangeDateDesc(purchasePlanItemId);
    }

    /**
     * Получает историю изменений по GUID
     */
    @Transactional(readOnly = true)
    public List<PurchasePlanItemChange> getChangesByGuid(UUID guid) {
        return changeRepository.findByGuidOrderByChangeDateDesc(guid);
    }

    /**
     * Получает историю изменений для позиции плана закупок с пагинацией
     */
    @Transactional(readOnly = true)
    public Page<PurchasePlanItemChangeDto> getChangesByItemIdPaginated(Long purchasePlanItemId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "changeDate"));
        Page<PurchasePlanItemChange> changes = changeRepository.findByPurchasePlanItemId(purchasePlanItemId, pageable);
        return changes.map(this::toDto);
    }

    /**
     * Конвертирует entity в DTO
     */
    private PurchasePlanItemChangeDto toDto(PurchasePlanItemChange entity) {
        PurchasePlanItemChangeDto dto = new PurchasePlanItemChangeDto();
        dto.setId(entity.getId());
        dto.setPurchasePlanItemId(entity.getPurchasePlanItemId());
        dto.setGuid(entity.getGuid());
        dto.setFieldName(entity.getFieldName());
        dto.setValueBefore(entity.getValueBefore());
        dto.setValueAfter(entity.getValueAfter());
        dto.setChangeDate(entity.getChangeDate());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}

