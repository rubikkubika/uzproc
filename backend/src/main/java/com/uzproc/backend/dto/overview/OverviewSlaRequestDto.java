package com.uzproc.backend.dto.overview;

import java.math.BigDecimal;

/**
 * Одна заявка в блоке SLA на вкладке «Обзор».
 */
public class OverviewSlaRequestDto {
    private Long id;
    private Long idPurchaseRequest;
    private String name;
    private BigDecimal budgetAmount;
    private String purchaser;
    private String complexity;
    /** Плановый СЛА (рабочих дней) по сложности. */
    private Integer plannedSlaDays;
    private String status;
    private String approvalAssignmentDate;
    private String purchaseCompletionDate;
    private Integer slaCommentCount;

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

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public BigDecimal getBudgetAmount() {
        return budgetAmount;
    }

    public void setBudgetAmount(BigDecimal budgetAmount) {
        this.budgetAmount = budgetAmount;
    }

    public String getPurchaser() {
        return purchaser;
    }

    public void setPurchaser(String purchaser) {
        this.purchaser = purchaser;
    }

    public String getComplexity() {
        return complexity;
    }

    public void setComplexity(String complexity) {
        this.complexity = complexity;
    }

    public Integer getPlannedSlaDays() {
        return plannedSlaDays;
    }

    public void setPlannedSlaDays(Integer plannedSlaDays) {
        this.plannedSlaDays = plannedSlaDays;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getApprovalAssignmentDate() {
        return approvalAssignmentDate;
    }

    public void setApprovalAssignmentDate(String approvalAssignmentDate) {
        this.approvalAssignmentDate = approvalAssignmentDate;
    }

    public String getPurchaseCompletionDate() {
        return purchaseCompletionDate;
    }

    public void setPurchaseCompletionDate(String purchaseCompletionDate) {
        this.purchaseCompletionDate = purchaseCompletionDate;
    }

    public Integer getSlaCommentCount() {
        return slaCommentCount;
    }

    public void setSlaCommentCount(Integer slaCommentCount) {
        this.slaCommentCount = slaCommentCount;
    }
}
