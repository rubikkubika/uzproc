package com.uzproc.backend.dto.payment;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PaymentDto {
    private Long id;
    private BigDecimal amount;
    private String cfo;
    private Long cfoId;
    private String comment;
    private Long purchaseRequestId;
    /** Основной номер заявки (id_purchase_request) */
    private Long purchaseRequestNumber;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public PaymentDto() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public BigDecimal getAmount() {
        return amount;
    }

    public void setAmount(BigDecimal amount) {
        this.amount = amount;
    }

    public String getCfo() {
        return cfo;
    }

    public void setCfo(String cfo) {
        this.cfo = cfo;
    }

    public Long getCfoId() {
        return cfoId;
    }

    public void setCfoId(Long cfoId) {
        this.cfoId = cfoId;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public Long getPurchaseRequestId() {
        return purchaseRequestId;
    }

    public void setPurchaseRequestId(Long purchaseRequestId) {
        this.purchaseRequestId = purchaseRequestId;
    }

    public Long getPurchaseRequestNumber() {
        return purchaseRequestNumber;
    }

    public void setPurchaseRequestNumber(Long purchaseRequestNumber) {
        this.purchaseRequestNumber = purchaseRequestNumber;
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
