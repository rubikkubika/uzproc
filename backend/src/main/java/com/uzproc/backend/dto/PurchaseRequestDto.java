package com.uzproc.backend.dto;

import com.uzproc.backend.entity.PurchaseRequestStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

public class PurchaseRequestDto {
    private Long id;
    private UUID guid;
    private Long idPurchaseRequest;
    private LocalDateTime purchaseRequestCreationDate;
    private String innerId;
    private String name;
    private String title;
    private Integer purchaseRequestPlanYear;
    private String company;
    private String cfo;
    private String mcc;
    private String purchaseRequestInitiator;
    private String purchaser;
    private String purchaseRequestSubject;
    private BigDecimal budgetAmount;
    private String currency;
    private String costType;
    private String contractType;
    private Integer contractDurationMonths;
    private Boolean isPlanned;
    private Boolean requiresPurchase;
    private PurchaseRequestStatus status;
    private String state;
    private String expenseItem;
    private Boolean excludeFromInWork;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    // Количество рабочих дней в текущем статусе (только для закупок)
    private Long daysInStatus;
    // Количество рабочих дней с даты создания (только для закупок)
    private Long daysSinceCreation;
    // Список ID связанных закупок
    private java.util.List<Long> purchaseIds;
    // Флаг, указывающий есть ли связанная закупка со статусом "Завершена"
    private Boolean hasCompletedPurchase;
    // Список связанных договоров
    private java.util.List<ContractDto> contracts;
    // Ссылка на форму CSI обратной связи
    private String csiLink;
    // Флаг отправки приглашения на оценку CSI
    private Boolean csiInvitationSent;
    // Флаг, указывающий есть ли оценка CSI
    private Boolean hasFeedback;
    // Средняя оценка по всем вопросам (кроме узпрок)
    private Double averageRating;

    // Constructors
    public PurchaseRequestDto() {
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

    public Long getDaysInStatus() {
        return daysInStatus;
    }

    public void setDaysInStatus(Long daysInStatus) {
        this.daysInStatus = daysInStatus;
    }

    public Long getDaysSinceCreation() {
        return daysSinceCreation;
    }

    public void setDaysSinceCreation(Long daysSinceCreation) {
        this.daysSinceCreation = daysSinceCreation;
    }

    public java.util.List<Long> getPurchaseIds() {
        return purchaseIds;
    }

    public void setPurchaseIds(java.util.List<Long> purchaseIds) {
        this.purchaseIds = purchaseIds;
    }

    public Boolean getHasCompletedPurchase() {
        return hasCompletedPurchase;
    }

    public void setHasCompletedPurchase(Boolean hasCompletedPurchase) {
        this.hasCompletedPurchase = hasCompletedPurchase;
    }

    public java.util.List<ContractDto> getContracts() {
        return contracts;
    }

    public void setContracts(java.util.List<ContractDto> contracts) {
        this.contracts = contracts;
    }

    public String getCsiLink() {
        return csiLink;
    }

    public void setCsiLink(String csiLink) {
        this.csiLink = csiLink;
    }

    public Boolean getCsiInvitationSent() {
        return csiInvitationSent;
    }

    public void setCsiInvitationSent(Boolean csiInvitationSent) {
        this.csiInvitationSent = csiInvitationSent;
    }

    public Boolean getHasFeedback() {
        return hasFeedback;
    }

    public void setHasFeedback(Boolean hasFeedback) {
        this.hasFeedback = hasFeedback;
    }

    public Double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(Double averageRating) {
        this.averageRating = averageRating;
    }
}

