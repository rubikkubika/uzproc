package com.uzproc.backend.dto.overview;

import java.math.BigDecimal;
import java.util.List;

/**
 * Ответ для вкладки «Экономия» на странице обзора.
 */
public class OverviewSavingsResponseDto {
    private int year;
    private BigDecimal totalBudget;
    private int totalBudgetCount;
    private BigDecimal totalSavings;
    private BigDecimal savingsFromMedian;
    private BigDecimal savingsFromExistingContract;
    private BigDecimal savingsUntyped;
    private int totalCount;
    private int fromMedianCount;
    private int fromExistingContractCount;
    private int untypedCount;
    private List<OverviewSavingsMonthDto> byMonth;
    private List<OverviewSavingsByCfoDto> byCfo;
    private List<OverviewSavingsByPurchaserDto> byPurchaser;

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public BigDecimal getTotalBudget() { return totalBudget; }
    public void setTotalBudget(BigDecimal totalBudget) { this.totalBudget = totalBudget; }

    public int getTotalBudgetCount() { return totalBudgetCount; }
    public void setTotalBudgetCount(int totalBudgetCount) { this.totalBudgetCount = totalBudgetCount; }

    public BigDecimal getTotalSavings() { return totalSavings; }
    public void setTotalSavings(BigDecimal totalSavings) { this.totalSavings = totalSavings; }

    public BigDecimal getSavingsFromMedian() { return savingsFromMedian; }
    public void setSavingsFromMedian(BigDecimal savingsFromMedian) { this.savingsFromMedian = savingsFromMedian; }

    public BigDecimal getSavingsFromExistingContract() { return savingsFromExistingContract; }
    public void setSavingsFromExistingContract(BigDecimal savingsFromExistingContract) { this.savingsFromExistingContract = savingsFromExistingContract; }

    public BigDecimal getSavingsUntyped() { return savingsUntyped; }
    public void setSavingsUntyped(BigDecimal savingsUntyped) { this.savingsUntyped = savingsUntyped; }

    public int getTotalCount() { return totalCount; }
    public void setTotalCount(int totalCount) { this.totalCount = totalCount; }

    public int getFromMedianCount() { return fromMedianCount; }
    public void setFromMedianCount(int fromMedianCount) { this.fromMedianCount = fromMedianCount; }

    public int getFromExistingContractCount() { return fromExistingContractCount; }
    public void setFromExistingContractCount(int fromExistingContractCount) { this.fromExistingContractCount = fromExistingContractCount; }

    public int getUntypedCount() { return untypedCount; }
    public void setUntypedCount(int untypedCount) { this.untypedCount = untypedCount; }

    public List<OverviewSavingsMonthDto> getByMonth() { return byMonth; }
    public void setByMonth(List<OverviewSavingsMonthDto> byMonth) { this.byMonth = byMonth; }

    public List<OverviewSavingsByCfoDto> getByCfo() { return byCfo; }
    public void setByCfo(List<OverviewSavingsByCfoDto> byCfo) { this.byCfo = byCfo; }

    public List<OverviewSavingsByPurchaserDto> getByPurchaser() { return byPurchaser; }
    public void setByPurchaser(List<OverviewSavingsByPurchaserDto> byPurchaser) { this.byPurchaser = byPurchaser; }
}
