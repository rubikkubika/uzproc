package com.uzproc.backend.dto.delivery;

import java.math.BigDecimal;

/**
 * Карточка договора в поиске для модального окна создания поставки.
 */
public class DeliveryContractSearchResultDto {
    private Long id;
    private String innerId;
    private String name;
    private String title;
    private String documentForm;
    private String supplierName;
    private BigDecimal budgetAmount;
    private String currency;
    private String paymentTerms;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getInnerId() { return innerId; }
    public void setInnerId(String innerId) { this.innerId = innerId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDocumentForm() { return documentForm; }
    public void setDocumentForm(String documentForm) { this.documentForm = documentForm; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public BigDecimal getBudgetAmount() { return budgetAmount; }
    public void setBudgetAmount(BigDecimal budgetAmount) { this.budgetAmount = budgetAmount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getPaymentTerms() { return paymentTerms; }
    public void setPaymentTerms(String paymentTerms) { this.paymentTerms = paymentTerms; }
}
