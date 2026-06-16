package com.uzproc.backend.dto.csifeedback;

/**
 * Агрегат по ЦФО: наименование ЦФО, количество оценок, средняя оценка за год.
 */
public class CsiFeedbackStatsByCfoDto {

    private String cfo;
    private int count;
    private Double avgRating;

    public CsiFeedbackStatsByCfoDto() {
    }

    public CsiFeedbackStatsByCfoDto(String cfo, int count, Double avgRating) {
        this.cfo = cfo;
        this.count = count;
        this.avgRating = avgRating;
    }

    public String getCfo() {
        return cfo;
    }

    public void setCfo(String cfo) {
        this.cfo = cfo;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public Double getAvgRating() {
        return avgRating;
    }

    public void setAvgRating(Double avgRating) {
        this.avgRating = avgRating;
    }
}
