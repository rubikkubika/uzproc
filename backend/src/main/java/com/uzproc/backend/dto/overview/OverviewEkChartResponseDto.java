package com.uzproc.backend.dto.overview;

import java.util.List;

/**
 * Результат getEkChartData: разбивка по ЦФО за год назначения на закупщика.
 * yearType: "assignment" — по году назначения на закупщика, "creation" — по году создания заявки (fallback).
 * rows — по каждому ЦФО: сумма бюджетов, сумма у единственного источника, % (в базовой валюте при пересчёте по курсу).
 * baseCurrency — валюта, в которой приведены суммы (если был перевод по курсу).
 * amountsInBaseCurrency — true, если суммы переведены в базовую валюту по курсу (были разные валюты).
 */
public class OverviewEkChartResponseDto {
    private String yearType;
    private List<OverviewEkChartRowDto> rows;
    private String baseCurrency;
    private boolean amountsInBaseCurrency;

    public OverviewEkChartResponseDto(String yearType, List<OverviewEkChartRowDto> rows) {
        this(yearType, rows, null, false);
    }

    public OverviewEkChartResponseDto(String yearType, List<OverviewEkChartRowDto> rows,
                                     String baseCurrency, boolean amountsInBaseCurrency) {
        this.yearType = yearType;
        this.rows = rows != null ? rows : List.of();
        this.baseCurrency = baseCurrency;
        this.amountsInBaseCurrency = amountsInBaseCurrency;
    }

    public String getYearType() {
        return yearType;
    }

    public List<OverviewEkChartRowDto> getRows() {
        return rows;
    }

    public String getBaseCurrency() {
        return baseCurrency;
    }

    public boolean isAmountsInBaseCurrency() {
        return amountsInBaseCurrency;
    }
}
