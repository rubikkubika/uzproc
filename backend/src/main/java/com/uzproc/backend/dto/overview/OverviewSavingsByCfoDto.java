package com.uzproc.backend.dto.overview;

import java.math.BigDecimal;

/**
 * Экономия по одному ЦФО.
 */
public class OverviewSavingsByCfoDto {
    private String cfo;
    private BigDecimal totalSavings;
    private BigDecimal savingsFromMedian;
    private BigDecimal savingsFromExistingContract;
    private BigDecimal savingsUntyped;
    private int count;

    public String getCfo() { return cfo; }
    public void setCfo(String cfo) { this.cfo = cfo; }

    public BigDecimal getTotalSavings() { return totalSavings; }
    public void setTotalSavings(BigDecimal totalSavings) { this.totalSavings = totalSavings; }

    public BigDecimal getSavingsFromMedian() { return savingsFromMedian; }
    public void setSavingsFromMedian(BigDecimal savingsFromMedian) { this.savingsFromMedian = savingsFromMedian; }

    public BigDecimal getSavingsFromExistingContract() { return savingsFromExistingContract; }
    public void setSavingsFromExistingContract(BigDecimal savingsFromExistingContract) { this.savingsFromExistingContract = savingsFromExistingContract; }

    public BigDecimal getSavingsUntyped() { return savingsUntyped; }
    public void setSavingsUntyped(BigDecimal savingsUntyped) { this.savingsUntyped = savingsUntyped; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }
}
