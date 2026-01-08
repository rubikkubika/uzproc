package com.uzproc.backend.dto;

import com.uzproc.backend.entity.PurchaseStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public class PurchaseDto {
    private Long id;
    private UUID guid;
    private Long purchaseNumber;
    private LocalDateTime purchaseCreationDate;
    private String innerId;
    private String name;
    private String title;
    private String cfo;
    private String mcc;
    private String purchaseInitiator;
    private String purchaseSubject;
    private BigDecimal budgetAmount;
    private String currency;
    private String costType;
    private String contractType;
    private Integer contractDurationMonths;
    private Long purchaseRequestId;
    private String purchaser;
    private PurchaseStatus status;
    private String state;
    private String expenseItem;
    private List<String> contractInnerIds; // Список внутренних номеров договоров
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // Новые поля для таблицы закупок
    private String purchaseMethod; // Способ закупки (mcc)
    private LocalDateTime purchaseRequestCreatedAt; // Дата создания заявки на закупку (связанной)
    private LocalDateTime approvalDate; // Дата утверждения (из блока согласования)
    private String purchaseRequestSubject; // Предмет заявки на закупку (наименование)

    // Constructors
    public PurchaseDto() {
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

    public String getPurchaser() {
        return purchaser;
    }

    public void setPurchaser(String purchaser) {
        this.purchaser = purchaser;
    }

    public PurchaseStatus getStatus() {
        return status;
    }

    public void setStatus(PurchaseStatus status) {
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

    public List<String> getContractInnerIds() {
        if (contractInnerIds == null) {
            contractInnerIds = new ArrayList<>();
        }
        return contractInnerIds;
    }

    public void setContractInnerIds(List<String> contractInnerIds) {
        this.contractInnerIds = contractInnerIds;
    }

    // Обратная совместимость
    @Deprecated
    public String getContractInnerId() {
        if (contractInnerIds != null && !contractInnerIds.isEmpty()) {
            return contractInnerIds.get(0);
        }
        return null;
    }

    @Deprecated
    public void setContractInnerId(String contractInnerId) {
        if (contractInnerIds == null) {
            contractInnerIds = new ArrayList<>();
        } else {
            contractInnerIds.clear();
        }
        if (contractInnerId != null && !contractInnerId.trim().isEmpty()) {
            contractInnerIds.add(contractInnerId.trim());
        }
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

    public String getPurchaseMethod() {
        return purchaseMethod;
    }

    public void setPurchaseMethod(String purchaseMethod) {
        this.purchaseMethod = purchaseMethod;
    }

    public LocalDateTime getPurchaseRequestCreatedAt() {
        return purchaseRequestCreatedAt;
    }

    public void setPurchaseRequestCreatedAt(LocalDateTime purchaseRequestCreatedAt) {
        this.purchaseRequestCreatedAt = purchaseRequestCreatedAt;
    }

    public LocalDateTime getApprovalDate() {
        return approvalDate;
    }

    public void setApprovalDate(LocalDateTime approvalDate) {
        this.approvalDate = approvalDate;
    }

    public String getPurchaseRequestSubject() {
        return purchaseRequestSubject;
    }

    public void setPurchaseRequestSubject(String purchaseRequestSubject) {
        this.purchaseRequestSubject = purchaseRequestSubject;
    }
}

