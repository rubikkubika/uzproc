package com.uzproc.backend.dto.delivery;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public class DeliveryDto {
    private Long id;
    private String innerId;
    private LocalDate date;
    /** Дата поставки. Вычисляется автоматически (read-only). */
    private LocalDate deliveryDeadline;
    /** Срок поставки в рабочих днях. */
    private Integer deliveryTermWorkingDays;
    private Long contractId;
    private String contractInnerId;
    private String contractName;
    /** Схема оплаты из договора (Contract.paymentScheme). */
    private String contractPaymentScheme;
    /** Условия оплаты из договора (Contract.paymentTerms). */
    private String contractPaymentTerms;
    /** Срок поставки из договора (Contract.deliveryTerm). */
    private String contractDeliveryTerm;
    private Long supplierId;
    private String supplierName;
    private String supplierInn;
    private BigDecimal amount;
    private String currency;
    /** Статус оплаты (бывший «Статус»): Проект / Аванс подготовлен / Аванс оплачен. */
    private String status;
    private String statusColor;
    /** Статус поставки (фактическая отгрузка): Ожидается / Поставлено / Просрочено. */
    private String shipmentStatus;
    private String shipmentStatusColor;
    private String paymentScheme;
    private List<Long> paymentIds = new ArrayList<>();
    /** Кол-во привязанных оплат. */
    private int paymentsCount;
    /** Все привязанные оплаты имеют тип (Аванс/По факту). Имеет смысл только при paymentsCount > 0. */
    private boolean paymentsDistributed;
    private String comment;
    private Long responsibleId;
    private String responsibleDisplayName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getInnerId() { return innerId; }
    public void setInnerId(String innerId) { this.innerId = innerId; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalDate getDeliveryDeadline() { return deliveryDeadline; }
    public void setDeliveryDeadline(LocalDate deliveryDeadline) { this.deliveryDeadline = deliveryDeadline; }

    public Integer getDeliveryTermWorkingDays() { return deliveryTermWorkingDays; }
    public void setDeliveryTermWorkingDays(Integer deliveryTermWorkingDays) { this.deliveryTermWorkingDays = deliveryTermWorkingDays; }

    public Long getContractId() { return contractId; }
    public void setContractId(Long contractId) { this.contractId = contractId; }

    public String getContractInnerId() { return contractInnerId; }
    public void setContractInnerId(String contractInnerId) { this.contractInnerId = contractInnerId; }

    public String getContractName() { return contractName; }
    public void setContractName(String contractName) { this.contractName = contractName; }

    public String getContractPaymentScheme() { return contractPaymentScheme; }
    public void setContractPaymentScheme(String contractPaymentScheme) { this.contractPaymentScheme = contractPaymentScheme; }

    public String getContractPaymentTerms() { return contractPaymentTerms; }
    public void setContractPaymentTerms(String contractPaymentTerms) { this.contractPaymentTerms = contractPaymentTerms; }

    public String getContractDeliveryTerm() { return contractDeliveryTerm; }
    public void setContractDeliveryTerm(String contractDeliveryTerm) { this.contractDeliveryTerm = contractDeliveryTerm; }

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public String getSupplierInn() { return supplierInn; }
    public void setSupplierInn(String supplierInn) { this.supplierInn = supplierInn; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getStatusColor() { return statusColor; }
    public void setStatusColor(String statusColor) { this.statusColor = statusColor; }

    public String getShipmentStatus() { return shipmentStatus; }
    public void setShipmentStatus(String shipmentStatus) { this.shipmentStatus = shipmentStatus; }

    public String getShipmentStatusColor() { return shipmentStatusColor; }
    public void setShipmentStatusColor(String shipmentStatusColor) { this.shipmentStatusColor = shipmentStatusColor; }

    public String getPaymentScheme() { return paymentScheme; }
    public void setPaymentScheme(String paymentScheme) { this.paymentScheme = paymentScheme; }

    public List<Long> getPaymentIds() { return paymentIds; }
    public void setPaymentIds(List<Long> paymentIds) { this.paymentIds = paymentIds; }

    public int getPaymentsCount() { return paymentsCount; }
    public void setPaymentsCount(int paymentsCount) { this.paymentsCount = paymentsCount; }

    public boolean isPaymentsDistributed() { return paymentsDistributed; }
    public void setPaymentsDistributed(boolean paymentsDistributed) { this.paymentsDistributed = paymentsDistributed; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public Long getResponsibleId() { return responsibleId; }
    public void setResponsibleId(Long responsibleId) { this.responsibleId = responsibleId; }

    public String getResponsibleDisplayName() { return responsibleDisplayName; }
    public void setResponsibleDisplayName(String responsibleDisplayName) { this.responsibleDisplayName = responsibleDisplayName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
