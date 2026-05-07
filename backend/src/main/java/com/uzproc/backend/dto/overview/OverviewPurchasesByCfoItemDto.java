package com.uzproc.backend.dto.overview;

import java.math.BigDecimal;

public class OverviewPurchasesByCfoItemDto {

    private Long id;
    private String name;
    private String cfo;
    private String status;
    private BigDecimal budgetAmount;
    private String purchaseCompletionDate;
    private BigDecimal linkedContractAmount;
    private String linkedContractCounterparty;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCfo() { return cfo; }
    public void setCfo(String cfo) { this.cfo = cfo; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getBudgetAmount() { return budgetAmount; }
    public void setBudgetAmount(BigDecimal budgetAmount) { this.budgetAmount = budgetAmount; }

    public String getPurchaseCompletionDate() { return purchaseCompletionDate; }
    public void setPurchaseCompletionDate(String purchaseCompletionDate) { this.purchaseCompletionDate = purchaseCompletionDate; }

    public BigDecimal getLinkedContractAmount() { return linkedContractAmount; }
    public void setLinkedContractAmount(BigDecimal linkedContractAmount) { this.linkedContractAmount = linkedContractAmount; }

    public String getLinkedContractCounterparty() { return linkedContractCounterparty; }
    public void setLinkedContractCounterparty(String linkedContractCounterparty) { this.linkedContractCounterparty = linkedContractCounterparty; }
}
