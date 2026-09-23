package com.uzproc.backend.dto.purchaseplan;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Таблица SLA драфта плана закупок на год.
 *
 * @param year         год драфта
 * @param rows         сроки по сложности 1–4
 * @param updatedAt    когда таблицу последний раз меняли (null — не менялась с момента создания)
 * @param updatedBy    кто последний раз менял таблицу
 * @param recalculated сколько позиций драфта пересчитано при сохранении (null — таблица не сохранялась)
 */
public record DraftSlaTableDto(Integer year, List<DraftSlaRowDto> rows, LocalDateTime updatedAt, String updatedBy,
                               Integer recalculated) {
}
