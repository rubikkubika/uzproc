package com.uzproc.backend.dto.overview;

import java.util.List;

/**
 * Ответ API обзор → вкладка «План закупок»: данные по запрошенным месяцам.
 */
public class OverviewPurchasePlanMonthsResponseDto {
    private int year;
    private List<OverviewMonthBlockDto> months;

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public List<OverviewMonthBlockDto> getMonths() {
        return months;
    }

    public void setMonths(List<OverviewMonthBlockDto> months) {
        this.months = months;
    }
}
