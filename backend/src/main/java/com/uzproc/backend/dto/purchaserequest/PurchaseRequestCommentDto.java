package com.uzproc.backend.dto.purchaserequest;

import com.uzproc.backend.entity.purchaserequest.PurchaseRequestCommentType;

import java.time.LocalDateTime;

/**
 * DTO комментария заявки на закупку.
 */
public class PurchaseRequestCommentDto {
    private Long id;
    private Long purchaseRequestId;
    private PurchaseRequestCommentType type;
    private String text;
    private String createdByUserName;
    private LocalDateTime createdAt;

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

    public PurchaseRequestCommentType getType() {
        return type;
    }

    public void setType(PurchaseRequestCommentType type) {
        this.type = type;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public String getCreatedByUserName() {
        return createdByUserName;
    }

    public void setCreatedByUserName(String createdByUserName) {
        this.createdByUserName = createdByUserName;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
