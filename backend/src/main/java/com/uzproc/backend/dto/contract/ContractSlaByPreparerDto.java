package com.uzproc.backend.dto.contract;

/**
 * Выполнение SLA за год в разрезе договорных специалистов (подготовивших документ).
 */
public record ContractSlaByPreparerDto(
        String preparedBy,
        int totalSigned,
        int metSla,
        Double percentage
) {
}
