package com.uzproc.backend.dto;

import com.uzproc.backend.entity.Company;
import com.uzproc.backend.entity.PlanPurchaser;
import com.uzproc.backend.entity.PurchasePlanItemStatus;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class PurchasePlanItemDto {
    private Long id;
    private UUID guid;
    private Integer year;
    private String company;
    private String cfo;
    private String purchaseSubject;
    private BigDecimal budgetAmount;
    private LocalDate contractEndDate;
    private LocalDate requestDate;
    private LocalDate newContractDate;
    private PlanPurchaser purchaser;
    private String product;
    private Boolean hasContract;
    private String currentKa;
    private BigDecimal currentAmount;
    private BigDecimal currentContractAmount;
    private BigDecimal currentContractBalance;
    private LocalDate currentContractEndDate;
    private Boolean autoRenewal;
    private String complexity;
    private String holding;
    private String category;
    private PurchasePlanItemStatus status;
    private String state;
    private Long purchaseRequestId;
    private String comment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Constructors
    public PurchasePlanItemDto() {
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

    public PlanPurchaser getPurchaser() {
        return purchaser;
    }

    public void setPurchaser(PlanPurchaser purchaser) {
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

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
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

    public PurchasePlanItemStatus getStatus() {
        return status;
    }

    public void setStatus(PurchasePlanItemStatus status) {
        this.status = status;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public Long getPurchaseRequestId() {
        return purchaseRequestId;
    }

    public void setPurchaseRequestId(Long purchaseRequestId) {
        this.purchaseRequestId = purchaseRequestId;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }
}

