package com.uzproc.backend.dto.overview;

import java.math.BigDecimal;

public class KpiSavingsByPurchaserDto {
    private String purchaser;
    private BigDecimal totalSavings;
    private BigDecimal totalBudget;
    private int count;

    public String getPurchaser() { return purchaser; }
    public void setPurchaser(String purchaser) { this.purchaser = purchaser; }

    public BigDecimal getTotalSavings() { return totalSavings; }
    public void setTotalSavings(BigDecimal totalSavings) { this.totalSavings = totalSavings; }

    public BigDecimal getTotalBudget() { return totalBudget; }
    public void setTotalBudget(BigDecimal totalBudget) { this.totalBudget = totalBudget; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }
}
