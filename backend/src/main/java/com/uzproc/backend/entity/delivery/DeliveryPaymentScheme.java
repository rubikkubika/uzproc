package com.uzproc.backend.entity.delivery;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Справочник схем оплаты поставок.
 * label — отображаемый ярлык (напр. «20/80/20 б.д.»).
 * advancePercent / finalPercent — аванс и доплата (доплата — сумма всех неавансовых долей).
 * termDays — срок доплаты в днях; dayType — WORKING (рабочие) или CALENDAR (обычные).
 * paymentType — PREPAYMENT (есть аванс) или POSTPAYMENT (аванса нет).
 */
@Entity
@Table(name = "delivery_payment_schemes")
public class DeliveryPaymentScheme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "label", nullable = false, length = 50)
    private String label;

    @Column(name = "advance_percent")
    private Integer advancePercent;

    @Column(name = "final_percent")
    private Integer finalPercent;

    @Column(name = "term_days")
    private Integer termDays;

    @Column(name = "day_type", length = 20)
    private String dayType;

    @Column(name = "payment_type", nullable = false, length = 20)
    private String paymentType;

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    public DeliveryPaymentScheme() {}

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

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
