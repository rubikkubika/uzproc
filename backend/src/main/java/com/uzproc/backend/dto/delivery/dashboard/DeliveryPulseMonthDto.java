package com.uzproc.backend.dto.delivery.dashboard;

/**
 * Месяц графика «Пульс поставок».
 *
 * @param month             месяц (1–12)
 * @param deliveredCount    поставлено в месяце (по фактической дате поставки)
 * @param onTimeCount       из них в срок (фактическая дата ≤ дедлайна, а без дедлайна — ≤ плановой даты)
 * @param measurableCount   из них с известным сроком (есть дедлайн или плановая дата) — знаменатель % в срок
 * @param onTimePercentage  % поставленных в срок (0–100); null — в месяце нет поставок с известным сроком
 * @param overdueCount      просрочено на сегодня: не поставлено, плановая дата в этом месяце и уже прошла
 */
public record DeliveryPulseMonthDto(
        int month,
        long deliveredCount,
        long onTimeCount,
        long measurableCount,
        Double onTimePercentage,
        long overdueCount
) {
}
