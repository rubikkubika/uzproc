package com.uzproc.backend.dto.purchaseplan;

/**
 * Строка таблицы SLA драфта: сроки по сложности в рабочих днях.
 *
 * @param complexity      сложность закупки 1–4
 * @param procurementDays SLA закупки
 * @param contractDays    SLA договора
 * @param totalDays       общий срок от даты заявки до нового договора (закупка + договор)
 */
public record DraftSlaRowDto(Integer complexity, Integer procurementDays, Integer contractDays, Integer totalDays) {
}
