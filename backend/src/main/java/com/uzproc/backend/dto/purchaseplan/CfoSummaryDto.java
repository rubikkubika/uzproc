package com.uzproc.backend.dto.purchaseplan;

import java.math.BigDecimal;

/**
 * Свод по ЦФО для плана закупок / драфта плана закупок.
 */
public class CfoSummaryDto {
    private String cfo;
    private Long count;
    private BigDecimal totalBudget;
    private BigDecimal totalComplexity;

    public CfoSummaryDto() {
    }

    public CfoSummaryDto(String cfo, Long count, BigDecimal totalBudget, BigDecimal totalComplexity) {
        this.cfo = cfo;
        this.count = count;
        this.totalBudget = totalBudget;
        this.totalComplexity = totalComplexity;
    }

    public String getCfo() {
        return cfo;
    }

    public void setCfo(String cfo) {
        this.cfo = cfo;
    }

    public Long getCount() {
        return count;
    }

    public void setCount(Long count) {
        this.count = count;
    }

    public BigDecimal getTotalBudget() {
        return totalBudget;
    }

    public void setTotalBudget(BigDecimal totalBudget) {
        this.totalBudget = totalBudget;
    }

    public BigDecimal getTotalComplexity() {
        return totalComplexity;
    }

    public void setTotalComplexity(BigDecimal totalComplexity) {
        this.totalComplexity = totalComplexity;
    }
}
