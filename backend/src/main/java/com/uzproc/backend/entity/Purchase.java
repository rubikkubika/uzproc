package com.uzproc.backend.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "purchases")
public class Purchase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "guid", unique = true, nullable = true, updatable = false)
    private UUID guid;

    @Column(name = "purchase_number")
    private Long purchaseNumber;

    @Column(name = "purchase_creation_date")
    private LocalDateTime purchaseCreationDate;

    @Column(name = "inner_id", length = 255)
    private String innerId;

    @Column(name = "name", length = 500)
    private String name;

    @Column(name = "title", length = 500)
    private String title;

    // Связь с Cfo
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cfo_id")
    private Cfo cfo;

    @Column(name = "mcc", length = 255)
    private String mcc;

    @Column(name = "purchase_initiator", length = 255)
    private String purchaseInitiator;

    @Column(name = "purchase_subject", length = 500)
    private String purchaseSubject;

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

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 50)
    private PurchaseStatus status;

    @Column(name = "state", length = 255)
    private String state;

    @Column(name = "expense_item", length = 255)
    private String expenseItem;

    @Column(name = "is_strategic_product")
    private Boolean isStrategicProduct;

    // Связь многие-ко-многим с Contract через внутренний номер договора
    // Используем @ElementCollection для хранения списка contract_inner_id
    // Это правильный подход для связи через не-первичный ключ (inner_id)
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
        name = "purchase_contracts",
        joinColumns = @JoinColumn(name = "purchase_id")
    )
    @Column(name = "contract_inner_id", length = 255)
    private java.util.Set<String> contractInnerIds;

    // Связь с PurchaseRequest по полю idPurchaseRequest
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_request_id", 
                referencedColumnName = "id_purchase_request", 
                insertable = false, 
                updatable = false)
    private PurchaseRequest purchaseRequest;

    @Column(name = "purchase_request_id")
    private Long purchaseRequestId;

    // Обратная связь с PurchaseApproval (одна закупка может иметь много согласований)
    @OneToMany(mappedBy = "purchase", fetch = FetchType.LAZY)
    private java.util.List<PurchaseApproval> approvals;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Purchase() {
    }

    public Purchase(Long id, UUID guid, LocalDateTime createdAt, LocalDateTime updatedAt) {
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

    public Long getPurchaseNumber() {
        return purchaseNumber;
    }

    public void setPurchaseNumber(Long purchaseNumber) {
        this.purchaseNumber = purchaseNumber;
    }

    public LocalDateTime getPurchaseCreationDate() {
        return purchaseCreationDate;
    }

    public void setPurchaseCreationDate(LocalDateTime purchaseCreationDate) {
        this.purchaseCreationDate = purchaseCreationDate;
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

    public Long getPurchaseRequestId() {
        return purchaseRequestId;
    }

    public void setPurchaseRequestId(Long purchaseRequestId) {
        this.purchaseRequestId = purchaseRequestId;
    }

    public PurchaseRequest getPurchaseRequest() {
        return purchaseRequest;
    }

    public void setPurchaseRequest(PurchaseRequest purchaseRequest) {
        this.purchaseRequest = purchaseRequest;
        if (purchaseRequest != null && purchaseRequest.getIdPurchaseRequest() != null) {
            this.purchaseRequestId = purchaseRequest.getIdPurchaseRequest();
        }
    }

    public java.util.List<PurchaseApproval> getApprovals() {
        return approvals;
    }

    public void setApprovals(java.util.List<PurchaseApproval> approvals) {
        this.approvals = approvals;
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

    public Set<String> getContractInnerIds() {
        if (contractInnerIds == null) {
            contractInnerIds = new HashSet<>();
        }
        return contractInnerIds;
    }

    public void setContractInnerIds(Set<String> contractInnerIds) {
        this.contractInnerIds = contractInnerIds;
    }

    /**
     * Добавляет внутренний номер договора к закупке
     */
    public void addContractInnerId(String contractInnerId) {
        if (contractInnerId != null && !contractInnerId.trim().isEmpty()) {
            getContractInnerIds().add(contractInnerId.trim());
        }
    }

    /**
     * Удаляет внутренний номер договора из закупки
     */
    public void removeContractInnerId(String contractInnerId) {
        if (contractInnerIds != null && contractInnerId != null) {
            contractInnerIds.remove(contractInnerId.trim());
        }
    }

    /**
     * Очищает все связи с договорами
     */
    public void clearContractInnerIds() {
        if (contractInnerIds != null) {
            contractInnerIds.clear();
        }
    }

    // Обратная совместимость: методы для работы с одним договором
    @Deprecated
    public String getContractInnerId() {
        Set<String> innerIds = getContractInnerIds();
        if (!innerIds.isEmpty()) {
            return innerIds.iterator().next();
        }
        return null;
    }

    @Deprecated
    public void setContractInnerId(String contractInnerId) {
        clearContractInnerIds();
        if (contractInnerId != null && !contractInnerId.trim().isEmpty()) {
            contractInnerIds.add(contractInnerId.trim());
        }
    }

    public PurchaseStatus getStatus() {
        return status;
    }

    public void setStatus(PurchaseStatus status) {
        this.status = status;
    }

    public Boolean getIsStrategicProduct() {
        return isStrategicProduct;
    }

    public void setIsStrategicProduct(Boolean isStrategicProduct) {
        this.isStrategicProduct = isStrategicProduct;
    }
}





