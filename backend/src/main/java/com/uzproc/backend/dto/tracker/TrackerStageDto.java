package com.uzproc.backend.dto.tracker;

import java.util.List;

/** Крупный этап закупки в трек-ленте. */
public record TrackerStageDto(
        String name,
        String off,
        String state,
        String date,
        String note,
        List<TrackerStepDto> steps
) {
}
