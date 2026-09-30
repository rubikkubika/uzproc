package com.uzproc.backend.dto.delivery.dashboard;

import java.math.BigDecimal;

/**
 * Сумма поставок в одной валюте. Суммы в разных валютах никогда не складываются —
 * дэшборды поставок отдают их списком «по валютам».
 *
 * @param currency код валюты (UZS, USD, …) либо «не указана»
 * @param amount   сумма поставок в этой валюте
 */
public record DeliveryCurrencyAmountDto(String currency, BigDecimal amount) {
}
