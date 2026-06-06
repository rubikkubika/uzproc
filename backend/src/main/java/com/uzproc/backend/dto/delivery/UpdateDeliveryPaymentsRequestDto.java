package com.uzproc.backend.dto.delivery;

import java.util.List;

/**
 * Запрос на обновление схемы оплаты и распределения оплат существующей поставки.
 * Логика распределения совпадает с созданием поставки:
 *   advancePaymentIds — оплаты, которым присваивается тип «Аванс» и которые привязываются к поставке;
 *   factPaymentIds    — оплаты, которым присваивается тип «По факту» и которые привязываются к поставке.
 */
public class UpdateDeliveryPaymentsRequestDto {
    private String paymentScheme;
    /** Конкретная схема оплаты из справочника (id). Тип (Аванс/По факту) берётся из неё. */
    private Long paymentSchemeId;
    private List<Long> advancePaymentIds;
    private List<Long> factPaymentIds;
    /** Срок поставки в рабочих днях. */
    private Integer deliveryTermWorkingDays;

    public String getPaymentScheme() { return paymentScheme; }
    public void setPaymentScheme(String paymentScheme) { this.paymentScheme = paymentScheme; }

    public Long getPaymentSchemeId() { return paymentSchemeId; }
    public void setPaymentSchemeId(Long paymentSchemeId) { this.paymentSchemeId = paymentSchemeId; }

    public Integer getDeliveryTermWorkingDays() { return deliveryTermWorkingDays; }
    public void setDeliveryTermWorkingDays(Integer deliveryTermWorkingDays) { this.deliveryTermWorkingDays = deliveryTermWorkingDays; }

    public List<Long> getAdvancePaymentIds() { return advancePaymentIds; }
    public void setAdvancePaymentIds(List<Long> advancePaymentIds) { this.advancePaymentIds = advancePaymentIds; }

    public List<Long> getFactPaymentIds() { return factPaymentIds; }
    public void setFactPaymentIds(List<Long> factPaymentIds) { this.factPaymentIds = factPaymentIds; }
}
