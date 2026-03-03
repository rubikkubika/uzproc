package com.uzproc.backend.dto.csifeedback;

/**
 * Агрегат по закупщику: ФИО, количество оценок, средняя оценка за год.
 */
public class CsiFeedbackStatsByPurchaserDto {

    private String purchaser;
    private int count;
    private Double avgRating;

    public CsiFeedbackStatsByPurchaserDto() {
    }

    public CsiFeedbackStatsByPurchaserDto(String purchaser, int count, Double avgRating) {
        this.purchaser = purchaser;
        this.count = count;
        this.avgRating = avgRating;
    }

    public String getPurchaser() {
        return purchaser;
    }

    public void setPurchaser(String purchaser) {
        this.purchaser = purchaser;
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
