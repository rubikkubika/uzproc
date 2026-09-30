package com.uzproc.backend.dto.delivery.dashboard;

/**
 * Поставщик в топе по просрочкам.
 *
 * @param supplier           наименование поставщика либо «Не указан»
 * @param lateDeliveredCount поставлено за год с опозданием
 * @param openOverdueCount   не поставлено, плановая дата в году уже прошла
 * @param totalCount         всего просрочек (сумма двух предыдущих) — по нему сортировка
 * @param averageDelayDays   средняя задержка по этим поставкам, календарные дни
 * @param maxDelayDays       максимальная задержка, календарные дни
 */
public record DeliverySupplierOverdueDto(
        String supplier,
        long lateDeliveredCount,
        long openOverdueCount,
        long totalCount,
        Double averageDelayDays,
        long maxDelayDays
) {
}
