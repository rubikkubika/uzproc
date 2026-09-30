package com.uzproc.backend.dto.delivery.dashboard;

/**
 * Корзина гистограммы задержек.
 *
 * @param key              ключ корзины: on-time, 1-7, 8-30, 30-plus
 * @param label            подпись корзины
 * @param deliveredCount   поставлено за год с задержкой в этом диапазоне (для on-time — в срок)
 * @param openOverdueCount ещё не поставлено, плановая дата в году, просрочка на сегодня в этом диапазоне
 */
public record DeliveryDelayBucketDto(String key, String label, long deliveredCount, long openOverdueCount) {
}
