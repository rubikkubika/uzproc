package com.uzproc.backend.dto.delivery.dashboard;

import java.time.LocalDate;
import java.util.List;

/**
 * Дэшборд «Пульс поставок»: KPI за год и помесячный график.
 * Определения показателей — в DeliveryDashboardService.
 */
public record DeliveryPulseResponseDto(
        int year,
        /** Дата расчёта «на сегодня» (просрочка, ближайшие 7 дней). */
        LocalDate today,
        /** Поставлено за год (статус «Поставлено», фактическая дата в году). */
        long deliveredCount,
        List<DeliveryCurrencyAmountDto> deliveredAmounts,
        /** Просрочено на сегодня, все годы: не поставлено, плановая дата уже прошла. */
        long overdueCount,
        List<DeliveryCurrencyAmountDto> overdueAmounts,
        /** Поставлено за год без даты ЭСФ. */
        long deliveredWithoutEsfCount,
        /** Ожидается в ближайшие 7 дней: не поставлено, плановая дата в [сегодня; сегодня + 7]. */
        long expectedNext7Count,
        List<DeliveryCurrencyAmountDto> expectedNext7Amounts,
        /** Закрыто за год: «Поставлено» + «Оплачено», фактическая дата в году. */
        long closedCount,
        /** Поставлено в срок за год. */
        long onTimeCount,
        /** Поставлено за год с известным сроком (знаменатель % в срок). */
        long measurableCount,
        /** % в срок за год; null — нет поставок с известным сроком. */
        Double onTimePercentage,
        /** 12 месяцев. */
        List<DeliveryPulseMonthDto> months
) {
}
