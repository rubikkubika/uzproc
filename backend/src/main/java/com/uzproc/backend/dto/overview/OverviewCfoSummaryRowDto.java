package com.uzproc.backend.dto.overview;

import java.math.BigDecimal;

/**
 * Строка сводки по ЦФО в блоке месяца на вкладке «Обзор».
 */
public class OverviewCfoSummaryRowDto {
    private String cfo;
    private int market;
    private int linked;
    private int excluded;
    private int requestsPurchase;
    /** Заявки (закупка) плановые по ЦФО */
    private int requestsPlanned;
    /** Заявки (закупка) внеплановые по ЦФО */
    private int requestsNonPlanned;
    /** Заявки (закупка) неутверждённые по ЦФО */
    private int requestsUnapproved;
    /** Заявки (закупка) отменённые (исключена из в работе) по ЦФО */
    private int requestsExcluded;
    private BigDecimal sumMarket;
    private BigDecimal sumRequests;

    public String getCfo() {
        return cfo;
    }

    public void setCfo(String cfo) {
        this.cfo = cfo;
    }

    public int getMarket() {
        return market;
    }

    public void setMarket(int market) {
        this.market = market;
    }

    public int getLinked() {
        return linked;
    }

    public void setLinked(int linked) {
        this.linked = linked;
    }

    public int getExcluded() {
        return excluded;
    }

    public void setExcluded(int excluded) {
        this.excluded = excluded;
    }

    public int getRequestsPurchase() {
        return requestsPurchase;
    }

    public void setRequestsPurchase(int requestsPurchase) {
        this.requestsPurchase = requestsPurchase;
    }

    public int getRequestsPlanned() {
        return requestsPlanned;
    }

    public void setRequestsPlanned(int requestsPlanned) {
        this.requestsPlanned = requestsPlanned;
    }

    public int getRequestsNonPlanned() {
        return requestsNonPlanned;
    }

    public void setRequestsNonPlanned(int requestsNonPlanned) {
        this.requestsNonPlanned = requestsNonPlanned;
    }

    public int getRequestsUnapproved() {
        return requestsUnapproved;
    }

    public void setRequestsUnapproved(int requestsUnapproved) {
        this.requestsUnapproved = requestsUnapproved;
    }

    public int getRequestsExcluded() {
        return requestsExcluded;
    }

    public void setRequestsExcluded(int requestsExcluded) {
        this.requestsExcluded = requestsExcluded;
    }

    public BigDecimal getSumMarket() {
        return sumMarket;
    }

    public void setSumMarket(BigDecimal sumMarket) {
        this.sumMarket = sumMarket;
    }

    public BigDecimal getSumRequests() {
        return sumRequests;
    }

    public void setSumRequests(BigDecimal sumRequests) {
        this.sumRequests = sumRequests;
    }
}
