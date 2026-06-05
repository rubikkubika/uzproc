package com.uzproc.backend.dto.contract;

import com.uzproc.backend.dto.supplier.SupplierDto;
import com.uzproc.backend.entity.contract.ContractStatus;
import com.uzproc.backend.entity.contract.CustomerOrganization;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class ContractDto {
    private Long id;
    private UUID guid;
    private String innerId;
    private LocalDateTime contractCreationDate;
    private String name;
    private String title;
    private String cfo;
    private String purchaseMethod;
    private String documentForm;
    private BigDecimal budgetAmount;
    private String currency;
    private String costType;
    private String contractType;
    private Integer contractDurationMonths;
    private ContractStatus status;
    private String state;
    private Long purchaseRequestId;
    /** Первичный ключ id связанной заявки (для построения ссылки на страницу заявки). */
    private Long purchaseRequestSystemId;
    private Long parentContractId;
    private ContractDto parentContract;
    private LocalDateTime plannedDeliveryStartDate;
    private LocalDateTime plannedDeliveryEndDate;
    private String preparedBy;  // ФИО пользователя (договорника), который подготовил договор
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /** Исключить из расчёта статуса заявки (Договор подписан / Спецификация подписана). */
    private Boolean excludedFromStatusCalculation;
    /** Комментарий к исключению договора из расчёта статуса. */
    private String exclusionComment;

    /** Исключить договор из вкладки "В работе" на странице договоров. */
    private Boolean excludeFromInWork;

    /** Организация заказчика. */
    private CustomerOrganization customerOrganization;

    /** Внутренний номер связанной заявки (idPurchaseRequest). */
    private Long purchaseRequestInnerId;

    /** Условия оплаты (парсинг из «График оплаты (Договор)»). */
    private String paymentTerms;

    /** Схема оплаты (парсинг из «Схема оплаты (Договор)»). */
    private String paymentScheme;

    /** Срок поставки (парсинг из «Срок поставки (Договор)»). */
    private String deliveryTerm;

    /** Поставщики (контрагенты) по договору. */
    private List<SupplierDto> suppliers;

    /** Типовая форма (из колонки «Типовая форма (Договор)»). */
    private Boolean isTypicalForm;

    /** Дата утверждения ЗП (дата завершения закупки по этапам «Закупочная комиссия»). */
    private LocalDateTime purchaseCompletionDate;

    /** Рабочие дни подготовки договора: от даты начала (не считая) до даты первого согласования включительно. */
    private Integer preparationWorkingDays;
    /** Рабочие дни согласования договора: от даты первого согласования (не считая) до завершения последнего включительно. */
    private Integer approvalWorkingDays;
    /** Дата первого назначения на согласование договора (MIN assignment_date по stage 'Согласование%'). */
    private LocalDateTime firstApprovalAssignmentDate;
    /** Дата начала отсчёта подготовки (contractCreationDate | approvalAssignmentDate ЗП | purchaseCompletionDate). */
    private LocalDateTime preparationStartDate;
    /** requiresPurchase из связанной заявки (null если заявки нет). */
    private Boolean contractRequiresPurchase;
    /** Дата регистрации договора: дата выполнения согласования этапа «Регистрация» (MAX completion_date по stage 'регистрация%'). */
    private LocalDateTime registrationDate;
    /** Дата синхронизации договора: дата выполнения согласования этапа «Синхронизация» (MAX completion_date по stage 'синхронизация%'). */
    private LocalDateTime synchronizationDate;

    // Constructors
    public ContractDto() {
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

    public String getCfo() {
        return cfo;
    }

    public void setCfo(String cfo) {
        this.cfo = cfo;
    }

    public String getPurchaseMethod() {
        return purchaseMethod;
    }

    public void setPurchaseMethod(String purchaseMethod) {
        this.purchaseMethod = purchaseMethod;
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

    public ContractStatus getStatus() {
        return status;
    }

    public void setStatus(ContractStatus status) {
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

    public Long getPurchaseRequestSystemId() {
        return purchaseRequestSystemId;
    }

    public void setPurchaseRequestSystemId(Long purchaseRequestSystemId) {
        this.purchaseRequestSystemId = purchaseRequestSystemId;
    }

    public Long getParentContractId() {
        return parentContractId;
    }

    public void setParentContractId(Long parentContractId) {
        this.parentContractId = parentContractId;
    }

    public ContractDto getParentContract() {
        return parentContract;
    }

    public void setParentContract(ContractDto parentContract) {
        this.parentContract = parentContract;
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

    public String getPreparedBy() {
        return preparedBy;
    }

    public void setPreparedBy(String preparedBy) {
        this.preparedBy = preparedBy;
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

    public Boolean getExcludeFromInWork() {
        return excludeFromInWork;
    }

    public void setExcludeFromInWork(Boolean excludeFromInWork) {
        this.excludeFromInWork = excludeFromInWork;
    }

    public CustomerOrganization getCustomerOrganization() {
        return customerOrganization;
    }

    public void setCustomerOrganization(CustomerOrganization customerOrganization) {
        this.customerOrganization = customerOrganization;
    }

    public Long getPurchaseRequestInnerId() {
        return purchaseRequestInnerId;
    }

    public void setPurchaseRequestInnerId(Long purchaseRequestInnerId) {
        this.purchaseRequestInnerId = purchaseRequestInnerId;
    }

    public String getPaymentTerms() {
        return paymentTerms;
    }

    public void setPaymentTerms(String paymentTerms) {
        this.paymentTerms = paymentTerms;
    }

    public String getPaymentScheme() {
        return paymentScheme;
    }

    public void setPaymentScheme(String paymentScheme) {
        this.paymentScheme = paymentScheme;
    }

    public String getDeliveryTerm() {
        return deliveryTerm;
    }

    public void setDeliveryTerm(String deliveryTerm) {
        this.deliveryTerm = deliveryTerm;
    }

    public List<SupplierDto> getSuppliers() {
        return suppliers;
    }

    public void setSuppliers(List<SupplierDto> suppliers) {
        this.suppliers = suppliers;
    }

    public Boolean getIsTypicalForm() {
        return isTypicalForm;
    }

    public void setIsTypicalForm(Boolean isTypicalForm) {
        this.isTypicalForm = isTypicalForm;
    }

    public LocalDateTime getPurchaseCompletionDate() {
        return purchaseCompletionDate;
    }

    public void setPurchaseCompletionDate(LocalDateTime purchaseCompletionDate) {
        this.purchaseCompletionDate = purchaseCompletionDate;
    }

    public Integer getPreparationWorkingDays() {
        return preparationWorkingDays;
    }

    public void setPreparationWorkingDays(Integer preparationWorkingDays) {
        this.preparationWorkingDays = preparationWorkingDays;
    }

    public Integer getApprovalWorkingDays() {
        return approvalWorkingDays;
    }

    public void setApprovalWorkingDays(Integer approvalWorkingDays) {
        this.approvalWorkingDays = approvalWorkingDays;
    }

    public LocalDateTime getFirstApprovalAssignmentDate() {
        return firstApprovalAssignmentDate;
    }

    public void setFirstApprovalAssignmentDate(LocalDateTime firstApprovalAssignmentDate) {
        this.firstApprovalAssignmentDate = firstApprovalAssignmentDate;
    }

    public LocalDateTime getPreparationStartDate() {
        return preparationStartDate;
    }

    public void setPreparationStartDate(LocalDateTime preparationStartDate) {
        this.preparationStartDate = preparationStartDate;
    }

    public Boolean getContractRequiresPurchase() {
        return contractRequiresPurchase;
    }

    public void setContractRequiresPurchase(Boolean contractRequiresPurchase) {
        this.contractRequiresPurchase = contractRequiresPurchase;
    }

    public LocalDateTime getRegistrationDate() {
        return registrationDate;
    }

    public void setRegistrationDate(LocalDateTime registrationDate) {
        this.registrationDate = registrationDate;
    }

    public LocalDateTime getSynchronizationDate() {
        return synchronizationDate;
    }

    public void setSynchronizationDate(LocalDateTime synchronizationDate) {
        this.synchronizationDate = synchronizationDate;
    }
}

