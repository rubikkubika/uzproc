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

    @Column(name = "guid", unique = true, nullable = true, updatable = false)
    private UUID guid;

    @Column(name = "id_purchase_request")
    private Long idPurchaseRequest;

    @Column(name = "purchase_request_creation_date")
    private LocalDateTime purchaseRequestCreationDate;

    @Column(name = "inner_id", length = 255)
    private String innerId;

    @Column(name = "name", length = 500)
    private String name;

    @Column(name = "title", length = 500)
    private String title;

    @Column(name = "purchase_request_plan_year")
    private Integer purchaseRequestPlanYear;

    @Column(name = "company", length = 255)
    private String company;

    // Связь с Cfo
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cfo_id")
    private Cfo cfo;

    @Column(name = "mcc", length = 255)
    private String mcc;

    @Column(name = "purchase_request_initiator", length = 255)
    private String purchaseRequestInitiator;

    @Column(name = "purchaser", length = 255)
    private String purchaser;

    @Column(name = "purchase_request_subject", length = 500)
    private String purchaseRequestSubject;

    @Column(name = "budget_amount", precision = 15, scale = 2)
    private BigDecimal budgetAmount;

    @Column(name = "currency", length = 10)
    private String currency;

    @Column(name = "cost_type", length = 255)
    private String costType;

    @Column(name = "contract_type", length = 255)
    private String contractType;

    @Column(name = "contract_duration_months")
    private Integer contractDurationMonths;

    @Column(name = "is_planned")
    private Boolean isPlanned;

    @Column(name = "requires_purchase")
    private Boolean requiresPurchase;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50)
    private PurchaseRequestStatus status;

    @Column(name = "state", length = 255)
    private String state;

    @Column(name = "expense_item", length = 255)
    private String expenseItem;

    @Column(name = "exclude_from_in_work")
    private Boolean excludeFromInWork;

    // Обратная связь с Purchase (одна заявка может иметь много закупок)
    @OneToMany(mappedBy = "purchaseRequest", fetch = FetchType.LAZY)
    private java.util.List<Purchase> purchases;

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

    public Integer getPurchaseRequestPlanYear() {
        return purchaseRequestPlanYear;
    }

    public void setPurchaseRequestPlanYear(Integer purchaseRequestPlanYear) {
        this.purchaseRequestPlanYear = purchaseRequestPlanYear;
    }

    public String getCompany() {
        return company;
    }

    public void setCompany(String company) {
        this.company = company;
    }

    public Cfo getCfo() {
        return cfo;
    }

    public void setCfo(Cfo cfo) {
        this.cfo = cfo;
    }

    public String getMcc() {
        return mcc;
    }

    public void setMcc(String mcc) {
        this.mcc = mcc;
    }

    public String getPurchaseRequestInitiator() {
        return purchaseRequestInitiator;
    }

    public void setPurchaseRequestInitiator(String purchaseRequestInitiator) {
        this.purchaseRequestInitiator = purchaseRequestInitiator;
    }

    public String getPurchaser() {
        return purchaser;
    }

    public void setPurchaser(String purchaser) {
        this.purchaser = purchaser;
    }

    public String getPurchaseRequestSubject() {
        return purchaseRequestSubject;
    }

    public void setPurchaseRequestSubject(String purchaseRequestSubject) {
        this.purchaseRequestSubject = purchaseRequestSubject;
    }

    public BigDecimal getBudgetAmount() {
        return budgetAmount;
    }

    public void setBudgetAmount(BigDecimal budgetAmount) {
        this.budgetAmount = budgetAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
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

    public Long getIdPurchaseRequest() {
        return idPurchaseRequest;
    }

    public void setIdPurchaseRequest(Long idPurchaseRequest) {
        this.idPurchaseRequest = idPurchaseRequest;
    }

    public LocalDateTime getPurchaseRequestCreationDate() {
        return purchaseRequestCreationDate;
    }

    public void setPurchaseRequestCreationDate(LocalDateTime purchaseRequestCreationDate) {
        this.purchaseRequestCreationDate = purchaseRequestCreationDate;
    }

    public String getInnerId() {
        return innerId;
    }

    public void setInnerId(String innerId) {
        this.innerId = innerId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public Boolean getRequiresPurchase() {
        return requiresPurchase;
    }

    public void setRequiresPurchase(Boolean requiresPurchase) {
        this.requiresPurchase = requiresPurchase;
    }

    public PurchaseRequestStatus getStatus() {
        return status;
    }

    public void setStatus(PurchaseRequestStatus status) {
        this.status = status;
    }

    public String getState() {
        return state;
    }

    public void setState(String state) {
        this.state = state;
    }

    public String getExpenseItem() {
        return expenseItem;
    }

    public void setExpenseItem(String expenseItem) {
        this.expenseItem = expenseItem;
    }

    public Boolean getExcludeFromInWork() {
        return excludeFromInWork;
    }

    public void setExcludeFromInWork(Boolean excludeFromInWork) {
        this.excludeFromInWork = excludeFromInWork;
    }

    public java.util.List<Purchase> getPurchases() {
        return purchases;
    }

    public void setPurchases(java.util.List<Purchase> purchases) {
        this.purchases = purchases;
    }
}
