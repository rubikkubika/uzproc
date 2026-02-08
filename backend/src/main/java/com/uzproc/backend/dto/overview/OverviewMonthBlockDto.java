package com.uzproc.backend.dto.overview;

import java.util.List;

/**
 * Данные одного месяца для вкладки «Обзор» → план закупок.
 */
public class OverviewMonthBlockDto {
    private int year;
    private int month;
    private OverviewPlanVersionDto version;
    private List<OverviewPlanItemDto> items;
    private int positionsCount;
    private List<OverviewPlanItemDto> itemsMarket;
    private int positionsMarketCount;
    private int positionsLinkedToRequestCount;
    private int positionsExcludedCount;
    private int requestsPurchaseCreatedInMonthCount;
    private List<OverviewCfoSummaryRowDto> summaryByCfo;

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public int getMonth() {
        return month;
    }

    public void setMonth(int month) {
        this.month = month;
    }

    public OverviewPlanVersionDto getVersion() {
        return version;
    }

    public void setVersion(OverviewPlanVersionDto version) {
        this.version = version;
    }

    public List<OverviewPlanItemDto> getItems() {
        return items;
    }

    public void setItems(List<OverviewPlanItemDto> items) {
        this.items = items;
    }

    public int getPositionsCount() {
        return positionsCount;
    }

    public void setPositionsCount(int positionsCount) {
        this.positionsCount = positionsCount;
    }

    public List<OverviewPlanItemDto> getItemsMarket() {
        return itemsMarket;
    }

    public void setItemsMarket(List<OverviewPlanItemDto> itemsMarket) {
        this.itemsMarket = itemsMarket;
    }

    public int getPositionsMarketCount() {
        return positionsMarketCount;
    }

    public void setPositionsMarketCount(int positionsMarketCount) {
        this.positionsMarketCount = positionsMarketCount;
    }

    public int getPositionsLinkedToRequestCount() {
        return positionsLinkedToRequestCount;
    }

    public void setPositionsLinkedToRequestCount(int positionsLinkedToRequestCount) {
        this.positionsLinkedToRequestCount = positionsLinkedToRequestCount;
    }

    public int getPositionsExcludedCount() {
        return positionsExcludedCount;
    }

    public void setPositionsExcludedCount(int positionsExcludedCount) {
        this.positionsExcludedCount = positionsExcludedCount;
    }

    public int getRequestsPurchaseCreatedInMonthCount() {
        return requestsPurchaseCreatedInMonthCount;
    }

    public void setRequestsPurchaseCreatedInMonthCount(int requestsPurchaseCreatedInMonthCount) {
        this.requestsPurchaseCreatedInMonthCount = requestsPurchaseCreatedInMonthCount;
    }

    public List<OverviewCfoSummaryRowDto> getSummaryByCfo() {
        return summaryByCfo;
    }

    public void setSummaryByCfo(List<OverviewCfoSummaryRowDto> summaryByCfo) {
        this.summaryByCfo = summaryByCfo;
    }
}
