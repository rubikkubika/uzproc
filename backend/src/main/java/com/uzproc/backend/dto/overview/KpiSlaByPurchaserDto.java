package com.uzproc.backend.dto.overview;

public class KpiSlaByPurchaserDto {
    private String purchaser;
    private int totalCompleted;
    private int metSla;
    private Double percentage;

    public String getPurchaser() { return purchaser; }
    public void setPurchaser(String purchaser) { this.purchaser = purchaser; }

    public int getTotalCompleted() { return totalCompleted; }
    public void setTotalCompleted(int totalCompleted) { this.totalCompleted = totalCompleted; }

    public int getMetSla() { return metSla; }
    public void setMetSla(int metSla) { this.metSla = metSla; }

    public Double getPercentage() { return percentage; }
    public void setPercentage(Double percentage) { this.percentage = percentage; }
}
