package com.uzproc.backend.dto.purchaserequest;

import java.time.LocalDateTime;

public class PurchaseRequestApprovalDto {
    private Long id;
    private Long idPurchaseRequest;
    private String stage;
    private String role;
    private LocalDateTime assignmentDate;
    private LocalDateTime completionDate;
    private Integer daysInWork;
    private String completionResult;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Constructors
    public PurchaseRequestApprovalDto() {
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

    public LocalDateTime getAssignmentDate() {
        return assignmentDate;
    }

    public void setAssignmentDate(LocalDateTime assignmentDate) {
        this.assignmentDate = assignmentDate;
    }

    public LocalDateTime getCompletionDate() {
        return completionDate;
    }

    public void setCompletionDate(LocalDateTime completionDate) {
        this.completionDate = completionDate;
    }

    public Integer getDaysInWork() {
        return daysInWork;
    }

    public void setDaysInWork(Integer daysInWork) {
        this.daysInWork = daysInWork;
    }

    public String getCompletionResult() {
        return completionResult;
    }

    public void setCompletionResult(String completionResult) {
        this.completionResult = completionResult;
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

