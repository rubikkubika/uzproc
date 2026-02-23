package com.uzproc.backend.dto.overview;

/**
 * Выполнение СЛА по году в разрезе закупщиков: закупщик, завершено, в срок, процент.
 */
public class OverviewSlaPercentageByPurchaserDto {
    /** Закупщик (или «Не назначен» при пустом purchaser) */
    private String purchaser;
    /** Количество завершённых закупок за год по закупщику */
    private int totalCompleted;
    /** Из них уложились в плановый SLA */
    private int metSla;
    /** Процент (0–100), либо null если totalCompleted == 0 */
    private Double percentage;

    public String getPurchaser() {
        return purchaser;
    }

    public void setPurchaser(String purchaser) {
        this.purchaser = purchaser;
    }

    public int getTotalCompleted() {
        return totalCompleted;
    }

    public void setTotalCompleted(int totalCompleted) {
        this.totalCompleted = totalCompleted;
    }

    public int getMetSla() {
        return metSla;
    }

    public void setMetSla(int metSla) {
        this.metSla = metSla;
    }

    public Double getPercentage() {
        return percentage;
    }

    public void setPercentage(Double percentage) {
        this.percentage = percentage;
    }
}
