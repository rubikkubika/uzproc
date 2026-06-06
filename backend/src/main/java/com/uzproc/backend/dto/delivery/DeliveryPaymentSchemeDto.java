package com.uzproc.backend.dto.delivery;

/**
 * DTO схемы оплаты поставки (справочник).
 */
public class DeliveryPaymentSchemeDto {
    private Long id;
    private String label;
    private Integer advancePercent;
    private Integer finalPercent;
    private Integer termDays;
    /** WORKING — рабочие (банковские) дни; CALENDAR — обычные. */
    private String dayType;
    /** PREPAYMENT — есть аванс; POSTPAYMENT — аванса нет. */
    private String paymentType;
    private Integer sortOrder;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLabel() { return label; }
    public void setLabel(String label) { this.label = label; }

    public Integer getAdvancePercent() { return advancePercent; }
    public void setAdvancePercent(Integer advancePercent) { this.advancePercent = advancePercent; }

    public Integer getFinalPercent() { return finalPercent; }
    public void setFinalPercent(Integer finalPercent) { this.finalPercent = finalPercent; }

    public Integer getTermDays() { return termDays; }
    public void setTermDays(Integer termDays) { this.termDays = termDays; }

    public String getDayType() { return dayType; }
    public void setDayType(String dayType) { this.dayType = dayType; }

    public String getPaymentType() { return paymentType; }
    public void setPaymentType(String paymentType) { this.paymentType = paymentType; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
