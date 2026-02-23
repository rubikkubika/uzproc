package com.uzproc.backend.dto.purchaserequest;

import java.time.LocalDateTime;
import java.util.UUID;

public class PurchaseRequestChangeDto {
    private Long id;
    private Long purchaseRequestId;
    private UUID guid;
    private String fieldName;
    private String valueBefore;
    private String valueAfter;
    private LocalDateTime changeDate;
    private LocalDateTime createdAt;
    /** Источник: PARSING | USER */
    private String changeSource;
    /** Кто изменил: "Система (парсинг)" или ФИО пользователя */
    private String changedByDisplayName;

    public PurchaseRequestChangeDto() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPurchaseRequestId() {
        return purchaseRequestId;
    }

    public void setPurchaseRequestId(Long purchaseRequestId) {
        this.purchaseRequestId = purchaseRequestId;
    }

    public UUID getGuid() {
        return guid;
    }

    public void setGuid(UUID guid) {
        this.guid = guid;
    }

    public String getFieldName() {
        return fieldName;
    }

    public void setFieldName(String fieldName) {
        this.fieldName = fieldName;
    }

    public String getValueBefore() {
        return valueBefore;
    }

    public void setValueBefore(String valueBefore) {
        this.valueBefore = valueBefore;
    }

    public String getValueAfter() {
        return valueAfter;
    }

    public void setValueAfter(String valueAfter) {
        this.valueAfter = valueAfter;
    }

    public LocalDateTime getChangeDate() {
        return changeDate;
    }

    public void setChangeDate(LocalDateTime changeDate) {
        this.changeDate = changeDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getChangeSource() {
        return changeSource;
    }

    public void setChangeSource(String changeSource) {
        this.changeSource = changeSource;
    }

    public String getChangedByDisplayName() {
        return changedByDisplayName;
    }

    public void setChangedByDisplayName(String changedByDisplayName) {
        this.changedByDisplayName = changedByDisplayName;
    }
}
