package com.uzproc.backend.dto.overview;

import java.util.List;

public class KpiSavingsResponseDto {
    private int year;
    private int month;
    private List<KpiSavingsByPurchaserDto> byPurchaser;

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public int getMonth() { return month; }
    public void setMonth(int month) { this.month = month; }

    public List<KpiSavingsByPurchaserDto> getByPurchaser() { return byPurchaser; }
    public void setByPurchaser(List<KpiSavingsByPurchaserDto> byPurchaser) { this.byPurchaser = byPurchaser; }
}
