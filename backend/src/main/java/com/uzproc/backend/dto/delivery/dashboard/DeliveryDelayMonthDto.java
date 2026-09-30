package com.uzproc.backend.dto.delivery.dashboard;

/**
 * Средняя задержка по месяцу фактической поставки.
 *
 * @param month              месяц (1–12)
 * @param measurableCount    поставлено в месяце с известным сроком
 * @param lateCount          из них с опозданием
 * @param averageDelayDays   средняя задержка опоздавших, календарные дни; null — опозданий нет
 */
public record DeliveryDelayMonthDto(int month, long measurableCount, long lateCount, Double averageDelayDays) {
}
