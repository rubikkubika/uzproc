package com.uzproc.backend.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "purchase_requests")
public class PurchaseRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "guid", unique = true, nullable = false, updatable = false)
    private UUID guid;

    @Column(name = "purchase_plan_year")
    private Integer purchasePlanYear;

    @Column(name = "company", length = 255)
    private String company;

    @Column(name = "cfo", length = 255)
    private String cfo;

    @Column(name = "mcc", length = 255)
    private String mcc;

    @Column(name = "purchase_initiator", length = 255)
    private String purchaseInitiator;

    @Column(name = "purchase_subject", length = 500)
    private String purchaseSubject;

    @Column(name = "budget_amount", precision = 15, scale = 2)
    private BigDecimal budgetAmount;

    @Column(name = "cost_type", length = 255)
    private String costType;

    @Column(name = "contract_type", length = 255)
    private String contractType;

    @Column(name = "contract_duration_months")
    private Integer contractDurationMonths;

    @Column(name = "is_planned")
    private Boolean isPlanned;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PurchaseRequest() {
    }

    public PurchaseRequest(Long id, UUID guid, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.guid = guid;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    @PrePersist
    protected void onCreate() {
        if (guid == null) {
            guid = UUID.randomUUID();
        }
        if (isPlanned == null) {
            isPlanned = false;
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public UUID getGuid() {
        return guid;
    }

    public void setGuid(UUID guid) {
        this.guid = guid;
    }

    public Integer getPurchasePlanYear() {
        return purchasePlanYear;
    }

    public void setPurchasePlanYear(Integer purchasePlanYear) {
        this.purchasePlanYear = purchasePlanYear;
    }

    public String getCompany() {
        return company;
    }

    public void setCompany(String company) {
        this.company = company;
    }

    public String getCfo() {
        return cfo;
    }

    public void setCfo(String cfo) {
        this.cfo = cfo;
    }

    public String getMcc() {
        return mcc;
    }

    public void setMcc(String mcc) {
        this.mcc = mcc;
    }

    public String getPurchaseInitiator() {
        return purchaseInitiator;
    }

    public void setPurchaseInitiator(String purchaseInitiator) {
        this.purchaseInitiator = purchaseInitiator;
    }

    public String getPurchaseSubject() {
        return purchaseSubject;
    }

    public void setPurchaseSubject(String purchaseSubject) {
        this.purchaseSubject = purchaseSubject;
    }

    public BigDecimal getBudgetAmount() {
        return budgetAmount;
    }

    public void setBudgetAmount(BigDecimal budgetAmount) {
        this.budgetAmount = budgetAmount;
    }

    public String getCostType() {
        return costType;
    }

    public void setCostType(String costType) {
        this.costType = costType;
    }

    public String getContractType() {
        return contractType;
    }

    public void setContractType(String contractType) {
        this.contractType = contractType;
    }

    public Integer getContractDurationMonths() {
        return contractDurationMonths;
    }

    public void setContractDurationMonths(Integer contractDurationMonths) {
        this.contractDurationMonths = contractDurationMonths;
    }

    public Boolean getIsPlanned() {
        return isPlanned;
    }

    public void setIsPlanned(Boolean isPlanned) {
        this.isPlanned = isPlanned;
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
