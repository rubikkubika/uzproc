package com.uzproc.backend.dto.overview;

import java.util.List;

public class KpiSlaResponseDto {
    private int year;
    private int month;
    private List<KpiSlaByPurchaserDto> byPurchaser;

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public int getMonth() { return month; }
    public void setMonth(int month) { this.month = month; }

    public List<KpiSlaByPurchaserDto> getByPurchaser() { return byPurchaser; }
    public void setByPurchaser(List<KpiSlaByPurchaserDto> byPurchaser) { this.byPurchaser = byPurchaser; }
}
