package com.uzproc.backend.dto.contract;

/**
 * Выполнение SLA по месяцу подписания документа.
 */
public record ContractSlaMonthDto(
        /** Месяц (1–12). */
        int month,
        /** Подписано документов в месяце. */
        int totalSigned,
        /** Из них без нарушения SLA. */
        int metSla,
        /** Процент (0–100), либо null если в месяце нет подписанных. */
        Double percentage
) {
}
