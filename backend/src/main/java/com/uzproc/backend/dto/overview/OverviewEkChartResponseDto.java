package com.uzproc.backend.dto.overview;

import java.util.List;

/**
 * Результат getEkChartData: разбивка по ЦФО за год назначения на закупщика.
 * yearType: "assignment" — по году назначения на закупщика, "creation" — по году создания заявки (fallback).
 * rows — по каждому ЦФО: сумма бюджетов, сумма у единственного источника, %.
 */
public class OverviewEkChartResponseDto {
    private String yearType;
    private List<OverviewEkChartRowDto> rows;

    public OverviewEkChartResponseDto(String yearType, List<OverviewEkChartRowDto> rows) {
        this.yearType = yearType;
        this.rows = rows != null ? rows : List.of();
    }

    public String getYearType() {
        return yearType;
    }

    public List<OverviewEkChartRowDto> getRows() {
        return rows;
    }
}
