package com.uzproc.backend.dto.contract;

import java.util.List;

/**
 * Ответ API дашборда «SLA договоров»: выполнение SLA по подписанным документам за год
 * и списки документов, подписанных в текущем месяце — с нарушением SLA и без нарушения.
 */
public record ContractSlaResponseDto(
        int year,
        /** Месяц, за который собраны списки documentsWithViolation / documentsWithoutViolation (1–12). */
        int currentMonth,
        /** Выполнение SLA по месяцам подписания (12 элементов). */
        List<ContractSlaMonthDto> slaByMonth,
        /** Выполнение SLA за год по договорным специалистам. */
        List<ContractSlaByPreparerDto> slaByPreparer,
        /** Всего подписано за год. */
        int totalSigned,
        /** Из них без нарушения SLA. */
        int metSla,
        /** Средний % SLA за год (0–100), либо null если за год нет подписанных. */
        Double averagePercentage,
        /** Подписанные в текущем месяце с нарушением SLA. */
        List<ContractSlaRowDto> documentsWithViolation,
        /** Подписанные в текущем месяце без нарушения SLA. */
        List<ContractSlaRowDto> documentsWithoutViolation
) {
}
