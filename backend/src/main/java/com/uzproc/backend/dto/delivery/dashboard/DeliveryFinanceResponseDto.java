package com.uzproc.backend.dto.delivery.dashboard;

import java.util.List;

/**
 * Дэшборд «Деньги и документы»: разбивка по статусу и схеме оплаты,
 * поставленные без ЭСФ по месяцам, нераспределённые оплаты.
 * Поставки года — фактическая дата поставки в году, а для непоставленных — плановая
 * (если нет обеих — дата поставки из отчёта).
 */
public record DeliveryFinanceResponseDto(
        int year,
        /** Поставок года. */
        long totalCount,
        List<DeliveryBreakdownItemDto> byPaymentStatus,
        List<DeliveryBreakdownItemDto> byPaymentScheme,
        /** 12 месяцев. */
        List<DeliveryEsfMonthDto> esfByMonth,
        /** Поставлено за год без даты ЭСФ. */
        long deliveredWithoutEsfCount,
        /** Оплат без типа (Аванс/По факту), привязанных к поставкам года; каждая оплата считается один раз. */
        long undistributedPaymentsCount,
        /** Поставок года, у которых есть хотя бы одна оплата без типа. */
        long deliveriesWithUndistributedCount
) {
}
