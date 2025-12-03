package com.uzproc.backend.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "purchase_plan_items")
public class PurchasePlanItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "guid", unique = true, nullable = true, updatable = false)
    private UUID guid;

    @Column(name = "year")
    private Integer year;

    @Column(name = "company", length = 255)
    private String company;

    @Column(name = "cfo", length = 255)
    private String cfo;

    @Column(name = "purchase_subject", length = 500)
    private String purchaseSubject;

    @Column(name = "budget_amount", precision = 15, scale = 2)
    private BigDecimal budgetAmount;

    @Column(name = "contract_end_date")
    private LocalDate contractEndDate;

    @Column(name = "request_date")
    private LocalDate requestDate;

    @Column(name = "new_contract_date")
    private LocalDate newContractDate;

    @Column(name = "purchaser", length = 255)
    private String purchaser;

    @Column(name = "product", length = 500)
    private String product;

    @Column(name = "has_contract")
    private Boolean hasContract;

    @Column(name = "current_ka", length = 255)
    private String currentKa;

    @Column(name = "current_amount", precision = 15, scale = 2)
    private BigDecimal currentAmount;

    @Column(name = "current_contract_amount", precision = 15, scale = 2)
    private BigDecimal currentContractAmount;

    @Column(name = "current_contract_balance", precision = 15, scale = 2)
    private BigDecimal currentContractBalance;

    @Column(name = "current_contract_end_date")
    private LocalDate currentContractEndDate;

    @Column(name = "auto_renewal")
    private Boolean autoRenewal;

    @Column(name = "complexity", length = 255)
    private String complexity;

    @Column(name = "holding", length = 255)
    private String holding;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public PurchasePlanItem() {
    }

    public PurchasePlanItem(Long id, UUID guid, LocalDateTime createdAt, LocalDateTime updatedAt) {
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
    }

    // Getters and Setters
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

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
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

    public LocalDate getContractEndDate() {
        return contractEndDate;
    }

    public void setContractEndDate(LocalDate contractEndDate) {
        this.contractEndDate = contractEndDate;
    }

    public LocalDate getRequestDate() {
        return requestDate;
    }

    public void setRequestDate(LocalDate requestDate) {
        this.requestDate = requestDate;
    }

    public LocalDate getNewContractDate() {
        return newContractDate;
    }

    public void setNewContractDate(LocalDate newContractDate) {
        this.newContractDate = newContractDate;
    }

    public String getPurchaser() {
        return purchaser;
    }

    public void setPurchaser(String purchaser) {
        this.purchaser = purchaser;
    }

    public String getProduct() {
        return product;
    }

    public void setProduct(String product) {
        this.product = product;
    }

    public Boolean getHasContract() {
        return hasContract;
    }

    public void setHasContract(Boolean hasContract) {
        this.hasContract = hasContract;
    }

    public String getCurrentKa() {
        return currentKa;
    }

    public void setCurrentKa(String currentKa) {
        this.currentKa = currentKa;
    }

    public BigDecimal getCurrentAmount() {
        return currentAmount;
    }

    public void setCurrentAmount(BigDecimal currentAmount) {
        this.currentAmount = currentAmount;
    }

    public BigDecimal getCurrentContractAmount() {
        return currentContractAmount;
    }

    public void setCurrentContractAmount(BigDecimal currentContractAmount) {
        this.currentContractAmount = currentContractAmount;
    }

    public BigDecimal getCurrentContractBalance() {
        return currentContractBalance;
    }

    public void setCurrentContractBalance(BigDecimal currentContractBalance) {
        this.currentContractBalance = currentContractBalance;
    }

    public LocalDate getCurrentContractEndDate() {
        return currentContractEndDate;
    }

    public void setCurrentContractEndDate(LocalDate currentContractEndDate) {
        this.currentContractEndDate = currentContractEndDate;
    }

    public Boolean getAutoRenewal() {
        return autoRenewal;
    }

    public void setAutoRenewal(Boolean autoRenewal) {
        this.autoRenewal = autoRenewal;
    }

    public String getComplexity() {
        return complexity;
    }

    public void setComplexity(String complexity) {
        this.complexity = complexity;
    }

    public String getHolding() {
        return holding;
    }

    public void setHolding(String holding) {
        this.holding = holding;
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

