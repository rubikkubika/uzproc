package com.uzproc.backend.dto.delivery.dashboard;

import java.util.List;

/**
 * Сегмент разбивки поставок (статус оплаты, схема оплаты).
 *
 * @param key     ключ сегмента (имя enum, подпись схемы или NONE)
 * @param label   подпись
 * @param count   количество поставок
 * @param amounts суммы по валютам
 */
public record DeliveryBreakdownItemDto(String key, String label, long count, List<DeliveryCurrencyAmountDto> amounts) {
}
