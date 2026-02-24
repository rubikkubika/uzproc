package com.uzproc.backend.dto.contract;

import java.time.LocalDateTime;

/**
 * DTO для согласования договора (contract_approvals).
 */
public class ContractApprovalDto {
    private Long id;
    private Long contractId;
    private String documentForm;
    private String stage;
    private String role;
    private String executorName;
    private LocalDateTime assignmentDate;
    private LocalDateTime plannedCompletionDate;
    private LocalDateTime completionDate;
    private String completionResult;
    private String commentText;
    private Boolean isWaiting;

    public ContractApprovalDto() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getContractId() {
        return contractId;
    }

    public void setContractId(Long contractId) {
        this.contractId = contractId;
    }

    public String getDocumentForm() {
        return documentForm;
    }

    public void setDocumentForm(String documentForm) {
        this.documentForm = documentForm;
    }

    public String getStage() {
        return stage;
    }

    public void setStage(String stage) {
        this.stage = stage;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getExecutorName() {
        return executorName;
    }

    public void setExecutorName(String executorName) {
        this.executorName = executorName;
    }

    public LocalDateTime getAssignmentDate() {
        return assignmentDate;
    }

    public void setAssignmentDate(LocalDateTime assignmentDate) {
        this.assignmentDate = assignmentDate;
    }

    public LocalDateTime getPlannedCompletionDate() {
        return plannedCompletionDate;
    }

    public void setPlannedCompletionDate(LocalDateTime plannedCompletionDate) {
        this.plannedCompletionDate = plannedCompletionDate;
    }

    public LocalDateTime getCompletionDate() {
        return completionDate;
    }

    public void setCompletionDate(LocalDateTime completionDate) {
        this.completionDate = completionDate;
    }

    public String getCompletionResult() {
        return completionResult;
    }

    public void setCompletionResult(String completionResult) {
        this.completionResult = completionResult;
    }

    public String getCommentText() {
        return commentText;
    }

    public void setCommentText(String commentText) {
        this.commentText = commentText;
    }

    public Boolean getIsWaiting() {
        return isWaiting;
    }

    public void setIsWaiting(Boolean isWaiting) {
        this.isWaiting = isWaiting;
    }
}
