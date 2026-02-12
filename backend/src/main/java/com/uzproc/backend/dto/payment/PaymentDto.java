package com.uzproc.backend.dto.payment;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class PaymentDto {
    private Long id;
    /** Основной номер оплаты (колонка "Номер" в Excel) */
    private String mainId;
    private BigDecimal amount;
    private String cfo;
    private Long cfoId;
    private String comment;
    private Long purchaseRequestId;
    /** Основной номер заявки (id_purchase_request) */
    private Long purchaseRequestNumber;
    /** Статус оплаты: К оплате, Оплата возвращена, Оплачена */
    private String paymentStatus;
    /** Статус заявки: На согласовании, Отклонен, Утвержден, Черновик */
    private String requestStatus;
    private LocalDate plannedExpenseDate;
    private LocalDate paymentDate;
    private Long executorId;
    private String executorDisplayName;
    private Long responsibleId;
    private String responsibleDisplayName;
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

    public String getMainId() {
        return mainId;
    }

    public void setMainId(String mainId) {
        this.mainId = mainId;
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

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public String getRequestStatus() {
        return requestStatus;
    }

    public void setRequestStatus(String requestStatus) {
        this.requestStatus = requestStatus;
    }

    public LocalDate getPlannedExpenseDate() {
        return plannedExpenseDate;
    }

    public void setPlannedExpenseDate(LocalDate plannedExpenseDate) {
        this.plannedExpenseDate = plannedExpenseDate;
    }

    public LocalDate getPaymentDate() {
        return paymentDate;
    }

    public void setPaymentDate(LocalDate paymentDate) {
        this.paymentDate = paymentDate;
    }

    public Long getExecutorId() {
        return executorId;
    }

    public void setExecutorId(Long executorId) {
        this.executorId = executorId;
    }

    public String getExecutorDisplayName() {
        return executorDisplayName;
    }

    public void setExecutorDisplayName(String executorDisplayName) {
        this.executorDisplayName = executorDisplayName;
    }

    public Long getResponsibleId() {
        return responsibleId;
    }

    public void setResponsibleId(Long responsibleId) {
        this.responsibleId = responsibleId;
    }

    public String getResponsibleDisplayName() {
        return responsibleDisplayName;
    }

    public void setResponsibleDisplayName(String responsibleDisplayName) {
        this.responsibleDisplayName = responsibleDisplayName;
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
