package com.uzproc.backend.dto.purchaseplan;

import java.math.BigDecimal;

public class PurchaserSummaryDto {
    private String purchaser;
    private Long count;
    private BigDecimal totalBudget;
    private BigDecimal totalComplexity;

    public PurchaserSummaryDto() {
    }

    public PurchaserSummaryDto(String purchaser, Long count, BigDecimal totalBudget, BigDecimal totalComplexity) {
        this.purchaser = purchaser;
        this.count = count;
        this.totalBudget = totalBudget;
        this.totalComplexity = totalComplexity;
    }

    public String getPurchaser() {
        return purchaser;
    }

    public void setPurchaser(String purchaser) {
        this.purchaser = purchaser;
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
