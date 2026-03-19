package com.uzproc.backend.dto.arrival;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class ArrivalDto {
    private Long id;
    private LocalDate date;
    private String number;
    private Long supplierId;
    private String supplierName;
    private String supplierInn;
    private String invoice;
    private String warehouse;
    private String operationType;
    private String department;
    private LocalDate incomingDate;
    private String incomingNumber;
    private BigDecimal amount;
    private String currency;
    private String comment;
    private Long responsibleId;
    private String responsibleDisplayName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public ArrivalDto() {
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getNumber() { return number; }
    public void setNumber(String number) { this.number = number; }

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public String getSupplierInn() { return supplierInn; }
    public void setSupplierInn(String supplierInn) { this.supplierInn = supplierInn; }

    public String getInvoice() { return invoice; }
    public void setInvoice(String invoice) { this.invoice = invoice; }

    public String getWarehouse() { return warehouse; }
    public void setWarehouse(String warehouse) { this.warehouse = warehouse; }

    public String getOperationType() { return operationType; }
    public void setOperationType(String operationType) { this.operationType = operationType; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public LocalDate getIncomingDate() { return incomingDate; }
    public void setIncomingDate(LocalDate incomingDate) { this.incomingDate = incomingDate; }

    public String getIncomingNumber() { return incomingNumber; }
    public void setIncomingNumber(String incomingNumber) { this.incomingNumber = incomingNumber; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

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
