package com.uzproc.backend.dto.delivery.dashboard;

import java.util.List;

/**
 * Дэшборд «Дисциплина сроков»: гистограмма задержек, средняя задержка по месяцам,
 * топ-10 поставщиков по просрочкам.
 */
public record DeliveryDisciplineResponseDto(
        int year,
        /** Поставлено за год с известным сроком. */
        long measurableCount,
        /** Поставлено за год без дедлайна и плановой даты — в расчёт задержек не входят. */
        long unmeasurableCount,
        /** Из поставленных с известным сроком — с опозданием. */
        long lateCount,
        /** Средняя задержка опоздавших за год, календарные дни; null — опозданий нет. */
        Double averageDelayDays,
        List<DeliveryDelayBucketDto> buckets,
        /** 12 месяцев. */
        List<DeliveryDelayMonthDto> months,
        List<DeliverySupplierOverdueDto> topSuppliers
) {
}
