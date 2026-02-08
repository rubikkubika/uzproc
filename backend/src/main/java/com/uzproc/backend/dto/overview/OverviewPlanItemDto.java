package com.uzproc.backend.dto.overview;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Позиция плана закупок для блока месяца на вкладке «Обзор».
 */
public class OverviewPlanItemDto {
    private Long id;
    private LocalDate requestDate;
    private String purchaserCompany;
    private Long purchaseRequestId;
    private String status;
    private String cfo;
    private BigDecimal budgetAmount;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public LocalDate getRequestDate() {
        return requestDate;
    }

    public void setRequestDate(LocalDate requestDate) {
        this.requestDate = requestDate;
    }

    public String getPurchaserCompany() {
        return purchaserCompany;
    }

    public void setPurchaserCompany(String purchaserCompany) {
        this.purchaserCompany = purchaserCompany;
    }

    public Long getPurchaseRequestId() {
        return purchaseRequestId;
    }

    public void setPurchaseRequestId(Long purchaseRequestId) {
        this.purchaseRequestId = purchaseRequestId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getCfo() {
        return cfo;
    }

    public void setCfo(String cfo) {
        this.cfo = cfo;
    }

    public BigDecimal getBudgetAmount() {
        return budgetAmount;
    }

    public void setBudgetAmount(BigDecimal budgetAmount) {
        this.budgetAmount = budgetAmount;
    }
}
