package com.uzproc.backend.dto;

import java.math.BigDecimal;

/**
 * DTO для передачи информации о заявке на закупку для формы CSI
 */
public class PurchaseRequestInfoDto {
    private Long id;
    private Long idPurchaseRequest;
    private String innerId;
    private String purchaseRequestSubject;
    private BigDecimal budgetAmount;
    private String currency;
    private String purchaser;
    private boolean alreadySubmitted; // Уже был оставлен отзыв

    public PurchaseRequestInfoDto() {
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getIdPurchaseRequest() {
        return idPurchaseRequest;
    }

    public void setIdPurchaseRequest(Long idPurchaseRequest) {
        this.idPurchaseRequest = idPurchaseRequest;
    }

    public String getInnerId() {
        return innerId;
    }

    public void setInnerId(String innerId) {
        this.innerId = innerId;
    }

    public String getPurchaseRequestSubject() {
        return purchaseRequestSubject;
    }

    public void setPurchaseRequestSubject(String purchaseRequestSubject) {
        this.purchaseRequestSubject = purchaseRequestSubject;
    }

    public BigDecimal getBudgetAmount() {
        return budgetAmount;
    }

    public void setBudgetAmount(BigDecimal budgetAmount) {
        this.budgetAmount = budgetAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public String getPurchaser() {
        return purchaser;
    }

    public void setPurchaser(String purchaser) {
        this.purchaser = purchaser;
    }

    public boolean isAlreadySubmitted() {
        return alreadySubmitted;
    }

    public void setAlreadySubmitted(boolean alreadySubmitted) {
        this.alreadySubmitted = alreadySubmitted;
    }
}
