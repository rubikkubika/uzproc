package com.uzproc.backend.entity.purchaserequest;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "purchase_request_changes")
public class PurchaseRequestChange {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "purchase_request_id", nullable = false)
    private Long purchaseRequestId;

    @Column(name = "guid")
    private UUID guid;

    @Column(name = "field_name", length = 255, nullable = false)
    private String fieldName;

    @Column(name = "value_before", length = 1000)
    private String valueBefore;

    @Column(name = "value_after", length = 1000)
    private String valueAfter;

    @Column(name = "change_date", nullable = false)
    private LocalDateTime changeDate;

    /** Источник изменения: PARSING (парсинг Excel) или USER (действие пользователя) */
    @Column(name = "change_source", length = 50)
    private String changeSource;

    /** Кто изменил: "Система (парсинг)" или отображаемое имя пользователя */
    @Column(name = "changed_by_display_name", length = 255)
    private String changedByDisplayName;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PurchaseRequestChange() {
    }

    public PurchaseRequestChange(Long purchaseRequestId, UUID guid, String fieldName, String valueBefore, String valueAfter) {
        this.purchaseRequestId = purchaseRequestId;
        this.guid = guid;
        this.fieldName = fieldName;
        this.valueBefore = valueBefore;
        this.valueAfter = valueAfter;
        this.changeDate = LocalDateTime.now();
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
