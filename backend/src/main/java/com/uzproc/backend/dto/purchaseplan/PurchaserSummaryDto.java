package com.uzproc.backend.dto.purchaseplan;

import java.math.BigDecimal;

/**
 * Строка свода по закупщикам плана закупок.
 * count / totalBudget / totalComplexity — итоги по позициям с учётом всех фильтров таблицы (без «Исключена»).
 * Разбивка по статусам (inPlan*, linkedToRequest*, excluded*) считается без учёта фильтра «Статус»:
 * «В плане» — статус «В плане» без связанной заявки; «Связано с заявкой» — есть связанная заявка
 * и позиция не исключена; «Исключено» — статус «Исключена».
 */
public class PurchaserSummaryDto {
    private String purchaser;
    private Long count;
    private BigDecimal totalBudget;
    private BigDecimal totalComplexity;
    private Long inPlanCount = 0L;
    private BigDecimal inPlanBudget = BigDecimal.ZERO;
    private Long linkedToRequestCount = 0L;
    private BigDecimal linkedToRequestBudget = BigDecimal.ZERO;
    private Long excludedCount = 0L;
    private BigDecimal excludedBudget = BigDecimal.ZERO;

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

    public Long getInPlanCount() {
        return inPlanCount;
    }

    public void setInPlanCount(Long inPlanCount) {
        this.inPlanCount = inPlanCount;
    }

    public BigDecimal getInPlanBudget() {
        return inPlanBudget;
    }

    public void setInPlanBudget(BigDecimal inPlanBudget) {
        this.inPlanBudget = inPlanBudget;
    }

    public Long getLinkedToRequestCount() {
        return linkedToRequestCount;
    }

    public void setLinkedToRequestCount(Long linkedToRequestCount) {
        this.linkedToRequestCount = linkedToRequestCount;
    }

    public BigDecimal getLinkedToRequestBudget() {
        return linkedToRequestBudget;
    }

    public void setLinkedToRequestBudget(BigDecimal linkedToRequestBudget) {
        this.linkedToRequestBudget = linkedToRequestBudget;
    }

    public Long getExcludedCount() {
        return excludedCount;
    }

    public void setExcludedCount(Long excludedCount) {
        this.excludedCount = excludedCount;
    }

    public BigDecimal getExcludedBudget() {
        return excludedBudget;
    }

    public void setExcludedBudget(BigDecimal excludedBudget) {
        this.excludedBudget = excludedBudget;
    }
}
