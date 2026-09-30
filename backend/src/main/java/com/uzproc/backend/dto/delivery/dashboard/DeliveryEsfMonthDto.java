package com.uzproc.backend.dto.delivery.dashboard;

/**
 * Поставленные за месяц и сколько из них без ЭСФ.
 *
 * @param month          месяц (1–12) фактической поставки
 * @param deliveredCount поставлено в месяце
 * @param withoutEsfCount из них без даты ЭСФ
 */
public record DeliveryEsfMonthDto(int month, long deliveredCount, long withoutEsfCount) {
}
