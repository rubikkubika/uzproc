package com.uzproc.backend.dto.tracker;

/** Шаг внутри этапа (согласующий/подэтап) в трек-ленте. */
public record TrackerStepDto(
        String plain,
        String off,
        String state,
        String date,
        int days
) {
}
