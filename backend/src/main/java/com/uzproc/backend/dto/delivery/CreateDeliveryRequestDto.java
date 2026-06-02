package com.uzproc.backend.dto.delivery;

import java.util.List;

/**
 * Запрос на создание поставки.
 * Минимальный набор: договор (contractId) и схема оплаты (paymentScheme).
 * Опционально: список привязываемых оплат (paymentIds).
 */
public class CreateDeliveryRequestDto {
    private Long contractId;
    private String paymentScheme;
    private List<Long> paymentIds;

    public Long getContractId() { return contractId; }
    public void setContractId(Long contractId) { this.contractId = contractId; }

    public String getPaymentScheme() { return paymentScheme; }
    public void setPaymentScheme(String paymentScheme) { this.paymentScheme = paymentScheme; }

    public List<Long> getPaymentIds() { return paymentIds; }
    public void setPaymentIds(List<Long> paymentIds) { this.paymentIds = paymentIds; }
}
