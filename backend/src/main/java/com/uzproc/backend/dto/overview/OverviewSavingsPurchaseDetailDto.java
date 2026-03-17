package com.uzproc.backend.dto.overview;

import java.math.BigDecimal;

/**
 * Детали одной закупки для раскрытия в таблице экономии по закупщикам.
 */
public class OverviewSavingsPurchaseDetailDto {
    private Long idPurchaseRequest;
    private String cfo;
    private String purchaser;
    private String name;
    private String purchaseCreationDate;
    private BigDecimal budgetAmount;
    private BigDecimal savings;
    private String savingsType;
    private String status;
    private String complexity;

    public Long getIdPurchaseRequest() { return idPurchaseRequest; }
    public void setIdPurchaseRequest(Long idPurchaseRequest) { this.idPurchaseRequest = idPurchaseRequest; }

    public String getCfo() { return cfo; }
    public void setCfo(String cfo) { this.cfo = cfo; }

    public String getPurchaser() { return purchaser; }
    public void setPurchaser(String purchaser) { this.purchaser = purchaser; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPurchaseCreationDate() { return purchaseCreationDate; }
    public void setPurchaseCreationDate(String purchaseCreationDate) { this.purchaseCreationDate = purchaseCreationDate; }

    public BigDecimal getBudgetAmount() { return budgetAmount; }
    public void setBudgetAmount(BigDecimal budgetAmount) { this.budgetAmount = budgetAmount; }

    public BigDecimal getSavings() { return savings; }
    public void setSavings(BigDecimal savings) { this.savings = savings; }

    public String getSavingsType() { return savingsType; }
    public void setSavingsType(String savingsType) { this.savingsType = savingsType; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getComplexity() { return complexity; }
    public void setComplexity(String complexity) { this.complexity = complexity; }
}
