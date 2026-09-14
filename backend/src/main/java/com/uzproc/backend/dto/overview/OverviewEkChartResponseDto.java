package com.uzproc.backend.dto.overview;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

/**
 * Результат getEkChartData: разбивка по ЦФО за год назначения на закупщика.
 * yearType: "assignment" — по году назначения на закупщика, "creation" — по году создания заявки (fallback).
 * rows — по каждому ЦФО: сумма бюджетов, сумма у единственного источника, % (в базовой валюте при пересчёте по курсу).
 * baseCurrency — валюта, в которой приведены суммы (если был перевод по курсу).
 * amountsInBaseCurrency — true, если суммы переведены в базовую валюту по курсу (были разные валюты).
 * exchangeRates — курсы пересчёта к базовой валюте (за 1 единицу валюты); только при пересчёте, без базовой валюты.
 */
public class OverviewEkChartResponseDto {
    private String yearType;
    private List<OverviewEkChartRowDto> rows;
    private String baseCurrency;
    private boolean amountsInBaseCurrency;
    private Map<String, BigDecimal> exchangeRates;

    public OverviewEkChartResponseDto(String yearType, List<OverviewEkChartRowDto> rows) {
        this(yearType, rows, null, false, Map.of());
    }

    public OverviewEkChartResponseDto(String yearType, List<OverviewEkChartRowDto> rows,
                                     String baseCurrency, boolean amountsInBaseCurrency,
                                     Map<String, BigDecimal> exchangeRates) {
        this.yearType = yearType;
        this.rows = rows != null ? rows : List.of();
        this.baseCurrency = baseCurrency;
        this.amountsInBaseCurrency = amountsInBaseCurrency;
        this.exchangeRates = exchangeRates != null ? exchangeRates : Map.of();
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

    public Map<String, BigDecimal> getExchangeRates() {
        return exchangeRates;
    }
}
