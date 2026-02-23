package com.uzproc.backend.entity.contract;

import com.uzproc.backend.entity.Cfo;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.supplier.Supplier;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "contracts")
public class Contract {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "guid", unique = true, nullable = true, updatable = false)
    private UUID guid;

    @Column(name = "inner_id", length = 255)
    private String innerId;

    @Column(name = "contract_creation_date")
    private LocalDateTime contractCreationDate;

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

    @Column(name = "document_form", length = 255)
    private String documentForm;

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
    private ContractStatus status;

    @Column(name = "state", length = 255)
    private String state;

    // Связь с PurchaseRequest по полю idPurchaseRequest. Одна заявка может быть связана с несколькими договорами.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_request_id", 
                referencedColumnName = "id_purchase_request", 
                insertable = false, 
                updatable = false)
    private PurchaseRequest purchaseRequest;

    @Column(name = "purchase_request_id")
    private Long purchaseRequestId;

    // Связь с основным договором (для спецификаций)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_contract_id", 
                referencedColumnName = "id", 
                insertable = false, 
                updatable = false)
    private Contract parentContract;

    @Column(name = "parent_contract_id")
    private Long parentContractId;

    @Column(name = "planned_delivery_start_date")
    private LocalDateTime plannedDeliveryStartDate;

    @Column(name = "planned_delivery_end_date")
    private LocalDateTime plannedDeliveryEndDate;

    @Column(name = "is_strategic_product")
    private Boolean isStrategicProduct;

    // Связь с пользователем (договорник), который подготовил договор
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prepared_by_id")
    private com.uzproc.backend.entity.user.User preparedBy;

    @Column(name = "prepared_by_id", insertable = false, updatable = false)
    private Long preparedById;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /** Исключить договор/спецификацию из расчёта статуса заявки (Договор подписан / Спецификация подписана). */
    @Column(name = "excluded_from_status_calculation")
    private Boolean excludedFromStatusCalculation;

    /** Комментарий к исключению договора из расчёта статуса. */
    @Column(name = "exclusion_comment", length = 2000)
    private String exclusionComment;

    /** Условия оплаты. Парсинг из колонки "График оплаты (Договор)" в Excel. */
    @Column(name = "payment_terms", length = 2000)
    private String paymentTerms;

    /** Поставщики (контрагенты). Парсинг из колонки "Контрагенты" в Excel. */
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "contract_suppliers",
            joinColumns = @JoinColumn(name = "contract_id"),
            inverseJoinColumns = @JoinColumn(name = "supplier_id")
    )
    private Set<Supplier> suppliers = new HashSet<>();

    public Contract() {
    }

    public Contract(Long id, UUID guid, LocalDateTime createdAt, LocalDateTime updatedAt) {
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

    public String getInnerId() {
        return innerId;
    }

    public void setInnerId(String innerId) {
        this.innerId = innerId;
    }

    public LocalDateTime getContractCreationDate() {
        return contractCreationDate;
    }

    public void setContractCreationDate(LocalDateTime contractCreationDate) {
        this.contractCreationDate = contractCreationDate;
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

    public String getDocumentForm() {
        return documentForm;
    }

    public void setDocumentForm(String documentForm) {
        this.documentForm = documentForm;
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

    public ContractStatus getStatus() {
        return status;
    }

    public void setStatus(ContractStatus status) {
        this.status = status;
    }

    public PurchaseRequest getPurchaseRequest() {
        return purchaseRequest;
    }

    public void setPurchaseRequest(PurchaseRequest purchaseRequest) {
        this.purchaseRequest = purchaseRequest;
    }

    public Long getPurchaseRequestId() {
        return purchaseRequestId;
    }

    public void setPurchaseRequestId(Long purchaseRequestId) {
        this.purchaseRequestId = purchaseRequestId;
    }

    public Contract getParentContract() {
        return parentContract;
    }

    public void setParentContract(Contract parentContract) {
        this.parentContract = parentContract;
    }

    public Long getParentContractId() {
        return parentContractId;
    }

    public void setParentContractId(Long parentContractId) {
        this.parentContractId = parentContractId;
    }

    public LocalDateTime getPlannedDeliveryStartDate() {
        return plannedDeliveryStartDate;
    }

    public void setPlannedDeliveryStartDate(LocalDateTime plannedDeliveryStartDate) {
        this.plannedDeliveryStartDate = plannedDeliveryStartDate;
    }

    public LocalDateTime getPlannedDeliveryEndDate() {
        return plannedDeliveryEndDate;
    }

    public void setPlannedDeliveryEndDate(LocalDateTime plannedDeliveryEndDate) {
        this.plannedDeliveryEndDate = plannedDeliveryEndDate;
    }

    public Boolean getIsStrategicProduct() {
        return isStrategicProduct;
    }

    public void setIsStrategicProduct(Boolean isStrategicProduct) {
        this.isStrategicProduct = isStrategicProduct;
    }

    public com.uzproc.backend.entity.user.User getPreparedBy() {
        return preparedBy;
    }

    public void setPreparedBy(com.uzproc.backend.entity.user.User preparedBy) {
        this.preparedBy = preparedBy;
    }

    public Long getPreparedById() {
        return preparedById;
    }

    public void setPreparedById(Long preparedById) {
        this.preparedById = preparedById;
    }

    public Boolean getExcludedFromStatusCalculation() {
        return excludedFromStatusCalculation;
    }

    public void setExcludedFromStatusCalculation(Boolean excludedFromStatusCalculation) {
        this.excludedFromStatusCalculation = excludedFromStatusCalculation;
    }

    public String getExclusionComment() {
        return exclusionComment;
    }

    public void setExclusionComment(String exclusionComment) {
        this.exclusionComment = exclusionComment;
    }

    public String getPaymentTerms() {
        return paymentTerms;
    }

    public void setPaymentTerms(String paymentTerms) {
        this.paymentTerms = paymentTerms;
    }

    public Set<Supplier> getSuppliers() {
        return suppliers;
    }

    public void setSuppliers(Set<Supplier> suppliers) {
        this.suppliers = suppliers != null ? suppliers : new HashSet<>();
    }
}

