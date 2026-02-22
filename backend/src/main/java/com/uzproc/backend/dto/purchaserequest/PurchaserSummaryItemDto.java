package com.uzproc.backend.dto.purchaserequest;

import java.math.BigDecimal;

/**
 * Один элемент сводки по закупщику: заказы/закупки и бюджеты (только заявки «в работе»).
 * Используется эндпоинтом GET /purchase-requests/in-work-summary.
 */
public class PurchaserSummaryItemDto {
    private String purchaser;
    private long ordersCount;
    private long purchasesCount;
    private BigDecimal ordersBudget;
    private BigDecimal purchasesBudget;

    public PurchaserSummaryItemDto() {
    }

    public PurchaserSummaryItemDto(String purchaser, long ordersCount, long purchasesCount,
                                   BigDecimal ordersBudget, BigDecimal purchasesBudget) {
        this.purchaser = purchaser;
        this.ordersCount = ordersCount;
        this.purchasesCount = purchasesCount;
        this.ordersBudget = ordersBudget != null ? ordersBudget : BigDecimal.ZERO;
        this.purchasesBudget = purchasesBudget != null ? purchasesBudget : BigDecimal.ZERO;
    }

    public String getPurchaser() {
        return purchaser;
    }

    public void setPurchaser(String purchaser) {
        this.purchaser = purchaser;
    }

    public long getOrdersCount() {
        return ordersCount;
    }

    public void setOrdersCount(long ordersCount) {
        this.ordersCount = ordersCount;
    }

    public long getPurchasesCount() {
        return purchasesCount;
    }

    public void setPurchasesCount(long purchasesCount) {
        this.purchasesCount = purchasesCount;
    }

    public BigDecimal getOrdersBudget() {
        return ordersBudget;
    }

    public void setOrdersBudget(BigDecimal ordersBudget) {
        this.ordersBudget = ordersBudget;
    }

    public BigDecimal getPurchasesBudget() {
        return purchasesBudget;
    }

    public void setPurchasesBudget(BigDecimal purchasesBudget) {
        this.purchasesBudget = purchasesBudget;
    }
}
