package com.uzproc.backend.dto.overview;

public class KpiCsiByPurchaserDto {
    private String purchaser;
    private int count;
    private Double avgRating;

    public String getPurchaser() { return purchaser; }
    public void setPurchaser(String purchaser) { this.purchaser = purchaser; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }

    public Double getAvgRating() { return avgRating; }
    public void setAvgRating(Double avgRating) { this.avgRating = avgRating; }
}
