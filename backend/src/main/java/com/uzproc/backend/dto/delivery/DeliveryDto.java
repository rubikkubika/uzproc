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
    private Long contractId;
    private String contractInnerId;
    private String contractName;
    private Long supplierId;
    private String supplierName;
    private String supplierInn;
    private BigDecimal amount;
    private String currency;
    private String status;
    private String paymentScheme;
    private List<Long> paymentIds = new ArrayList<>();
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

    public Long getContractId() { return contractId; }
    public void setContractId(Long contractId) { this.contractId = contractId; }

    public String getContractInnerId() { return contractInnerId; }
    public void setContractInnerId(String contractInnerId) { this.contractInnerId = contractInnerId; }

    public String getContractName() { return contractName; }
    public void setContractName(String contractName) { this.contractName = contractName; }

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

    public String getPaymentScheme() { return paymentScheme; }
    public void setPaymentScheme(String paymentScheme) { this.paymentScheme = paymentScheme; }

    public List<Long> getPaymentIds() { return paymentIds; }
    public void setPaymentIds(List<Long> paymentIds) { this.paymentIds = paymentIds; }

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
