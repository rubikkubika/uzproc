package com.uzproc.backend.dto.overview;

import java.util.List;

/**
 * Ответ API обзор → вкладка SLA: год, блоки по группам статусов, процент по месяцам и по закупщикам.
 */
public class OverviewSlaResponseDto {
    private Integer year;
    private List<OverviewSlaBlockDto> statusBlocks;
    /** Процент закупок, уложившихся в плановый SLA, по месяцу назначения (1–12). */
    private List<OverviewSlaPercentageByMonthDto> slaPercentageByMonth;
    /** Выполнение СЛА по году в разрезе закупщиков. */
    private List<OverviewSlaPercentageByPurchaserDto> slaPercentageByPurchaser;

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public List<OverviewSlaBlockDto> getStatusBlocks() {
        return statusBlocks;
    }

    public void setStatusBlocks(List<OverviewSlaBlockDto> statusBlocks) {
        this.statusBlocks = statusBlocks;
    }

    public List<OverviewSlaPercentageByMonthDto> getSlaPercentageByMonth() {
        return slaPercentageByMonth;
    }

    public void setSlaPercentageByMonth(List<OverviewSlaPercentageByMonthDto> slaPercentageByMonth) {
        this.slaPercentageByMonth = slaPercentageByMonth;
    }

    public List<OverviewSlaPercentageByPurchaserDto> getSlaPercentageByPurchaser() {
        return slaPercentageByPurchaser;
    }

    public void setSlaPercentageByPurchaser(List<OverviewSlaPercentageByPurchaserDto> slaPercentageByPurchaser) {
        this.slaPercentageByPurchaser = slaPercentageByPurchaser;
    }
}
