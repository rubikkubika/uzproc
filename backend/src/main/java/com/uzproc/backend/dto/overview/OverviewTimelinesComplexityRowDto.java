package com.uzproc.backend.dto.overview;

import java.util.Map;

/**
 * Вложенная строка «Сроки закупок» — по сложности внутри года.
 */
public class OverviewTimelinesComplexityRowDto {

    /** Сложность (1-4) или "—" если не указана. */
    private String complexity;

    /** Количество заявок данной сложности. */
    private int requestCount;

    /** Средние рабочие дни по каждому этапу. */
    private Map<String, Double> avgDaysByStage;

    public OverviewTimelinesComplexityRowDto() {
    }

    public OverviewTimelinesComplexityRowDto(String complexity, int requestCount, Map<String, Double> avgDaysByStage) {
        this.complexity = complexity;
        this.requestCount = requestCount;
        this.avgDaysByStage = avgDaysByStage;
    }

    public String getComplexity() {
        return complexity;
    }

    public void setComplexity(String complexity) {
        this.complexity = complexity;
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
}
