package com.uzproc.backend.dto.overview;

/**
 * Процент закупок, уложившихся в плановый SLA, по месяцу завершения закупки.
 */
public class OverviewSlaPercentageByMonthDto {
    /** Месяц (1–12) */
    private int month;
    /** Количество завершённых закупок, назначенных в этом месяце */
    private int totalCompleted;
    /** Из них уложились в плановый SLA */
    private int metSla;
    /** Процент (0–100), либо null если totalCompleted == 0 */
    private Double percentage;

    public int getMonth() {
        return month;
    }

    public void setMonth(int month) {
        this.month = month;
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
