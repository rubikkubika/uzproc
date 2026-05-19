package com.uzproc.backend.dto.overview;

import java.math.BigDecimal;

/**
 * Деталь заявки на закупку для KPI SLA (выбранного закупщика за месяц).
 */
public class KpiSlaDetailDto {
    private Long id;
    private Long idPurchaseRequest;
    private String name;
    private String status;
    private String complexity;
    private BigDecimal budgetAmount;
    private Integer plannedSlaDays;
    private Integer factualSlaDays;
    private Integer diffDays;
    private Boolean metSla;
    private String approvalAssignmentDate;
    private String purchaseCompletionDate;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getIdPurchaseRequest() { return idPurchaseRequest; }
    public void setIdPurchaseRequest(Long idPurchaseRequest) { this.idPurchaseRequest = idPurchaseRequest; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getComplexity() { return complexity; }
    public void setComplexity(String complexity) { this.complexity = complexity; }

    public BigDecimal getBudgetAmount() { return budgetAmount; }
    public void setBudgetAmount(BigDecimal budgetAmount) { this.budgetAmount = budgetAmount; }

    public Integer getPlannedSlaDays() { return plannedSlaDays; }
    public void setPlannedSlaDays(Integer plannedSlaDays) { this.plannedSlaDays = plannedSlaDays; }

    public Integer getFactualSlaDays() { return factualSlaDays; }
    public void setFactualSlaDays(Integer factualSlaDays) { this.factualSlaDays = factualSlaDays; }

    public Integer getDiffDays() { return diffDays; }
    public void setDiffDays(Integer diffDays) { this.diffDays = diffDays; }

    public Boolean getMetSla() { return metSla; }
    public void setMetSla(Boolean metSla) { this.metSla = metSla; }

    public String getApprovalAssignmentDate() { return approvalAssignmentDate; }
    public void setApprovalAssignmentDate(String approvalAssignmentDate) { this.approvalAssignmentDate = approvalAssignmentDate; }

    public String getPurchaseCompletionDate() { return purchaseCompletionDate; }
    public void setPurchaseCompletionDate(String purchaseCompletionDate) { this.purchaseCompletionDate = purchaseCompletionDate; }
}
