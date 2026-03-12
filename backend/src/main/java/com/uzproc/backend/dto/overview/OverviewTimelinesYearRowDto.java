package com.uzproc.backend.dto.overview;

import java.util.List;
import java.util.Map;

/**
 * Строка таблицы «Сроки закупок» — один год.
 */
public class OverviewTimelinesYearRowDto {

    /** Год. */
    private int year;

    /** Количество заявок, учтённых в расчёте для данного года. */
    private int requestCount;

    /** Средние рабочие дни по каждому этапу: ключ = название этапа, значение = среднее количество рабочих дней. */
    private Map<String, Double> avgDaysByStage;

    /** Разбивка по сложности (вложенные строки). */
    private List<OverviewTimelinesComplexityRowDto> byComplexity;

    public OverviewTimelinesYearRowDto() {
    }

    public OverviewTimelinesYearRowDto(int year, int requestCount, Map<String, Double> avgDaysByStage,
                                       List<OverviewTimelinesComplexityRowDto> byComplexity) {
        this.year = year;
        this.requestCount = requestCount;
        this.avgDaysByStage = avgDaysByStage;
        this.byComplexity = byComplexity;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public int getRequestCount() {
        return requestCount;
    }

    public void setRequestCount(int requestCount) {
        this.requestCount = requestCount;
    }

    public Map<String, Double> getAvgDaysByStage() {
        return avgDaysByStage;
    }

    public void setAvgDaysByStage(Map<String, Double> avgDaysByStage) {
        this.avgDaysByStage = avgDaysByStage;
    }

    public List<OverviewTimelinesComplexityRowDto> getByComplexity() {
        return byComplexity;
    }

    public void setByComplexity(List<OverviewTimelinesComplexityRowDto> byComplexity) {
        this.byComplexity = byComplexity;
    }
}
