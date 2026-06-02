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
    private List<Long> advancePaymentIds;
    private List<Long> factPaymentIds;

    public Long getContractId() { return contractId; }
    public void setContractId(Long contractId) { this.contractId = contractId; }

    public String getPaymentScheme() { return paymentScheme; }
    public void setPaymentScheme(String paymentScheme) { this.paymentScheme = paymentScheme; }

    public List<Long> getAdvancePaymentIds() { return advancePaymentIds; }
    public void setAdvancePaymentIds(List<Long> advancePaymentIds) { this.advancePaymentIds = advancePaymentIds; }

    public List<Long> getFactPaymentIds() { return factPaymentIds; }
    public void setFactPaymentIds(List<Long> factPaymentIds) { this.factPaymentIds = factPaymentIds; }
}
