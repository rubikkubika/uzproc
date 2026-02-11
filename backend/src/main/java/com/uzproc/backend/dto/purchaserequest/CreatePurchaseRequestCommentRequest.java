package com.uzproc.backend.dto.purchaserequest;

import com.uzproc.backend.entity.purchaserequest.PurchaseRequestCommentType;

/**
 * Запрос на создание комментария к заявке на закупку.
 */
public class CreatePurchaseRequestCommentRequest {
    private PurchaseRequestCommentType type;
    private String text;
    /** ID пользователя, добавившего комментарий (опционально). */
    private Long createdByUserId;

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

    public Long getCreatedByUserId() {
        return createdByUserId;
    }

    public void setCreatedByUserId(Long createdByUserId) {
        this.createdByUserId = createdByUserId;
    }
}
