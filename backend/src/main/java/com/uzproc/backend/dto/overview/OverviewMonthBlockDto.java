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
    /** Заявки (закупка), связанные с планом (hasLinkedPlanItem=true), созданные в месяце */
    private int requestsPurchasePlannedCount;
    /** Заявки (закупка), несвязанные с планом (hasLinkedPlanItem=false), созданные в месяце */
    private int requestsPurchaseNonPlannedCount;
    /** Заявки (закупка) со статусом «Заявка не утверждена», созданные в месяце */
    private int requestsPurchaseUnapprovedCount;
    /** Заявки (закупка) в состоянии «Исключена» (state), созданные в месяце */
    private int requestsPurchaseExcludedCount;
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

    public int getRequestsPurchasePlannedCount() {
        return requestsPurchasePlannedCount;
    }

    public void setRequestsPurchasePlannedCount(int requestsPurchasePlannedCount) {
        this.requestsPurchasePlannedCount = requestsPurchasePlannedCount;
    }

    public int getRequestsPurchaseNonPlannedCount() {
        return requestsPurchaseNonPlannedCount;
    }

    public void setRequestsPurchaseNonPlannedCount(int requestsPurchaseNonPlannedCount) {
        this.requestsPurchaseNonPlannedCount = requestsPurchaseNonPlannedCount;
    }

    public int getRequestsPurchaseUnapprovedCount() {
        return requestsPurchaseUnapprovedCount;
    }

    public void setRequestsPurchaseUnapprovedCount(int requestsPurchaseUnapprovedCount) {
        this.requestsPurchaseUnapprovedCount = requestsPurchaseUnapprovedCount;
    }

    public int getRequestsPurchaseExcludedCount() {
        return requestsPurchaseExcludedCount;
    }

    public void setRequestsPurchaseExcludedCount(int requestsPurchaseExcludedCount) {
        this.requestsPurchaseExcludedCount = requestsPurchaseExcludedCount;
    }

    public List<OverviewCfoSummaryRowDto> getSummaryByCfo() {
        return summaryByCfo;
    }

    public void setSummaryByCfo(List<OverviewCfoSummaryRowDto> summaryByCfo) {
        this.summaryByCfo = summaryByCfo;
    }
}
