package com.uzproc.backend.entity.purchase;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "purchase_approvals", 
       uniqueConstraints = {
           @UniqueConstraint(
               columnNames = {"purchase_request_id", "stage", "role"},
               name = "unique_approval_per_purchase"
           )
       })
public class PurchaseApproval {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "purchase_request_id", nullable = false)
    private Long purchaseRequestId;

    // Связь с Purchase по полю purchaseRequestId
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_request_id", 
                referencedColumnName = "purchase_request_id", 
                insertable = false, 
                updatable = false)
    private Purchase purchase;

    @Column(name = "stage", nullable = false, length = 255)
    private String stage;

    @Column(name = "role", nullable = false, length = 255)
    private String role;

    @Column(name = "assignment_date")
    private LocalDateTime assignmentDate;

    @Column(name = "completion_date")
    private LocalDateTime completionDate;

    @Column(name = "days_in_work")
    private Integer daysInWork;

    @Column(name = "completion_result", length = 500)
    private String completionResult;

    @Column(name = "is_strategic_product")
    private Boolean isStrategicProduct;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    // Constructors
    public PurchaseApproval() {
    }

    public PurchaseApproval(Long purchaseRequestId, String stage, String role) {
        this.purchaseRequestId = purchaseRequestId;
        this.stage = stage;
        this.role = role;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPurchaseRequestId() {
        return purchaseRequestId;
    }

    public void setPurchaseRequestId(Long purchaseRequestId) {
        this.purchaseRequestId = purchaseRequestId;
    }

    public Purchase getPurchase() {
        return purchase;
    }

    public void setPurchase(Purchase purchase) {
        this.purchase = purchase;
        if (purchase != null && purchase.getPurchaseRequestId() != null) {
            this.purchaseRequestId = purchase.getPurchaseRequestId();
        }
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

    public Boolean getIsStrategicProduct() {
        return isStrategicProduct;
    }

    public void setIsStrategicProduct(Boolean isStrategicProduct) {
        this.isStrategicProduct = isStrategicProduct;
    }
}


