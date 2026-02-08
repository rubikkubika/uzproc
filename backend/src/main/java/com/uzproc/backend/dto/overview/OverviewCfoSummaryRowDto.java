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
