package com.uzproc.backend.dto.purchaseplan;

import java.time.LocalDateTime;
import java.util.UUID;

public class PurchasePlanItemChangeDto {
    private Long id;
    private Long purchasePlanItemId;
    private UUID guid;
    private String fieldName;
    private String valueBefore;
    private String valueAfter;
    private LocalDateTime changeDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public PurchasePlanItemChangeDto() {
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPurchasePlanItemId() {
        return purchasePlanItemId;
    }

    public void setPurchasePlanItemId(Long purchasePlanItemId) {
        this.purchasePlanItemId = purchasePlanItemId;
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

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}

