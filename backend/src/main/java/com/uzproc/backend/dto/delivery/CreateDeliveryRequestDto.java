package com.uzproc.backend.dto.delivery;

import java.util.List;

/**
 * Запрос на создание поставки.
 * Минимальный набор: договор (contractId) и схема оплаты (paymentScheme).
 * Опционально: списки оплат для двух блоков —
 *   advancePaymentIds — этим оплатам будет присвоен тип «Аванс» и они будут привязаны к поставке;
 *   factPaymentIds    — этим оплатам будет присвоен тип «По факту» и они будут привязаны к поставке.
 */
public class CreateDeliveryRequestDto {
    private Long contractId;
    private String paymentScheme;
    /** Конкретная схема оплаты из справочника (id). Тип (Аванс/По факту) берётся из неё. */
    private Long paymentSchemeId;
    private List<Long> advancePaymentIds;
    private List<Long> factPaymentIds;
    /** Срок поставки в рабочих днях. Если null — берётся из договора. */
    private Integer deliveryTermWorkingDays;

    public Long getContractId() { return contractId; }
    public void setContractId(Long contractId) { this.contractId = contractId; }

    public Long getPaymentSchemeId() { return paymentSchemeId; }
    public void setPaymentSchemeId(Long paymentSchemeId) { this.paymentSchemeId = paymentSchemeId; }

    public Integer getDeliveryTermWorkingDays() { return deliveryTermWorkingDays; }
    public void setDeliveryTermWorkingDays(Integer deliveryTermWorkingDays) { this.deliveryTermWorkingDays = deliveryTermWorkingDays; }

    public String getPaymentScheme() { return paymentScheme; }
    public void setPaymentScheme(String paymentScheme) { this.paymentScheme = paymentScheme; }

    public List<Long> getAdvancePaymentIds() { return advancePaymentIds; }
    public void setAdvancePaymentIds(List<Long> advancePaymentIds) { this.advancePaymentIds = advancePaymentIds; }

    public List<Long> getFactPaymentIds() { return factPaymentIds; }
    public void setFactPaymentIds(List<Long> factPaymentIds) { this.factPaymentIds = factPaymentIds; }
}
