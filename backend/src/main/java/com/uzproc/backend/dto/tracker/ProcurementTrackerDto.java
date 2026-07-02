package com.uzproc.backend.dto.tracker;

import java.util.List;

/**
 * Модель закупки для публичного «Трекера статуса закупок» (страница инициатора).
 * Поля названы так, чтобы JSON 1:1 соответствовал TS-типу Procurement на фронтенде.
 */
public record ProcurementTrackerDto(
        Long id,
        String title,
        String budget,
        String initiator,
        String buyer,
        String phone,
        String created,
        int stageIdx,
        boolean done,
        String forecast,
        String signed,
        String contractor,
        String contractSum,
        String plain,
        List<TrackerStageDto> stages
) {
}
