package com.uzproc.backend.dto.overview;

import java.util.List;

/**
 * DTO ответа для вкладки «Сроки закупок».
 * Содержит список строк (по годам) со средними рабочими днями по каждому этапу.
 */
public class OverviewTimelinesResponseDto {

    /** Названия столбцов-этапов (в порядке отображения). */
    private List<String> stages;

    /** Строки таблицы: по одной на каждый год. */
    private List<OverviewTimelinesYearRowDto> rows;

    public OverviewTimelinesResponseDto() {
    }

    public OverviewTimelinesResponseDto(List<String> stages, List<OverviewTimelinesYearRowDto> rows) {
        this.stages = stages;
        this.rows = rows;
    }

    public List<String> getStages() {
        return stages;
    }

    public void setStages(List<String> stages) {
        this.stages = stages;
    }

    public List<OverviewTimelinesYearRowDto> getRows() {
        return rows;
    }

    public void setRows(List<OverviewTimelinesYearRowDto> rows) {
        this.rows = rows;
    }
}
