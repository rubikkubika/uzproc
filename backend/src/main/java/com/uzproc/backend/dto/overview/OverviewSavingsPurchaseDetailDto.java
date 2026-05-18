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
    private String commissionCompletionDate;
    private boolean excludeFromKpi;
    private String excludeFromKpiComment;
    private boolean autoExcludedFromKpi;
    private String purchaseMethod;
    private String statusGroup;
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

    public String getCommissionCompletionDate() { return commissionCompletionDate; }
    public void setCommissionCompletionDate(String commissionCompletionDate) { this.commissionCompletionDate = commissionCompletionDate; }

    public boolean isExcludeFromKpi() { return excludeFromKpi; }
    public void setExcludeFromKpi(boolean excludeFromKpi) { this.excludeFromKpi = excludeFromKpi; }

    public String getExcludeFromKpiComment() { return excludeFromKpiComment; }
    public void setExcludeFromKpiComment(String excludeFromKpiComment) { this.excludeFromKpiComment = excludeFromKpiComment; }

    public boolean isAutoExcludedFromKpi() { return autoExcludedFromKpi; }
    public void setAutoExcludedFromKpi(boolean autoExcludedFromKpi) { this.autoExcludedFromKpi = autoExcludedFromKpi; }

    public String getPurchaseMethod() { return purchaseMethod; }
    public void setPurchaseMethod(String purchaseMethod) { this.purchaseMethod = purchaseMethod; }

    public String getStatusGroup() { return statusGroup; }
    public void setStatusGroup(String statusGroup) { this.statusGroup = statusGroup; }
}
