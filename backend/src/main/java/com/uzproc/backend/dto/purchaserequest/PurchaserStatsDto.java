package com.uzproc.backend.dto.purchaserequest;

import java.math.BigDecimal;

public class PurchaserStatsDto {
    private String purchaser;
    private Long totalPurchases;
    private Long activePurchases;
    private Long completedPurchases;
    private Long averageDays;
    private BigDecimal totalAmount;

    public PurchaserStatsDto() {
    }

    public PurchaserStatsDto(String purchaser, Long totalPurchases, Long activePurchases, 
                            Long completedPurchases, Long averageDays, BigDecimal totalAmount) {
        this.purchaser = purchaser;
        this.totalPurchases = totalPurchases;
        this.activePurchases = activePurchases;
        this.completedPurchases = completedPurchases;
        this.averageDays = averageDays;
        this.totalAmount = totalAmount;
    }

    public String getPurchaser() {
        return purchaser;
    }

    public void setPurchaser(String purchaser) {
        this.purchaser = purchaser;
    }

    public Long getTotalPurchases() {
        return totalPurchases;
    }

    public void setTotalPurchases(Long totalPurchases) {
        this.totalPurchases = totalPurchases;
    }

    public Long getActivePurchases() {
        return activePurchases;
    }

    public void setActivePurchases(Long activePurchases) {
        this.activePurchases = activePurchases;
    }

    public Long getCompletedPurchases() {
        return completedPurchases;
    }

    public void setCompletedPurchases(Long completedPurchases) {
        this.completedPurchases = completedPurchases;
    }

    public Long getAverageDays() {
        return averageDays;
    }

    public void setAverageDays(Long averageDays) {
        this.averageDays = averageDays;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }
}

