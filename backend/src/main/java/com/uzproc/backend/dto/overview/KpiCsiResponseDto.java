package com.uzproc.backend.dto.overview;

import java.util.List;

public class KpiCsiResponseDto {
    private int year;
    private int month;
    private List<KpiCsiByPurchaserDto> byPurchaser;

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public int getMonth() { return month; }
    public void setMonth(int month) { this.month = month; }

    public List<KpiCsiByPurchaserDto> getByPurchaser() { return byPurchaser; }
    public void setByPurchaser(List<KpiCsiByPurchaserDto> byPurchaser) { this.byPurchaser = byPurchaser; }
}
