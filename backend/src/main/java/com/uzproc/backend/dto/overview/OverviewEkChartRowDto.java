package com.uzproc.backend.dto.overview;

import java.math.BigDecimal;

/**
 * Строка для диаграммы ЕК (вкладка Обзор): по ЦФО — кол-во заявок (тип закупка),
 * кол-во закупок у единственного источника, сумма бюджетов, сумма у единственного источника, % по суммам.
 * currency — преобладающая валюта в заявках ЦФО (или "mixed" при разных валютах).
 */
public class OverviewEkChartRowDto {
    private String cfo;
    /** Преобладающая валюта в заявках этого ЦФО; "mixed" если валют несколько. */
    private String currency;
    /** Всего заявок (тип закупка) в учёте за год назначения на закупщика. */
    private int totalCount;
    /** Заявок, у которых связанная закупка имеет способ закупки (mcc) «Закупка у единственного источника». */
    private int singleSupplierCount;
    /** Сумма бюджетов всех учтённых заявок. */
    private BigDecimal totalAmount;
    /** Сумма бюджетов заявок у единственного источника. */
    private BigDecimal singleSupplierAmount;
    /** Процент от всех закупок в суммах: singleSupplierAmount / totalAmount * 100. */
    private BigDecimal percentByAmount;

    public String getCfo() {
        return cfo;
    }

    public void setCfo(String cfo) {
        this.cfo = cfo;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public int getTotalCount() {
        return totalCount;
    }

    public void setTotalCount(int totalCount) {
        this.totalCount = totalCount;
    }

    public int getSingleSupplierCount() {
        return singleSupplierCount;
    }

    public void setSingleSupplierCount(int singleSupplierCount) {
        this.singleSupplierCount = singleSupplierCount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public BigDecimal getSingleSupplierAmount() {
        return singleSupplierAmount;
    }

    public void setSingleSupplierAmount(BigDecimal singleSupplierAmount) {
        this.singleSupplierAmount = singleSupplierAmount;
    }

    public BigDecimal getPercentByAmount() {
        return percentByAmount;
    }

    public void setPercentByAmount(BigDecimal percentByAmount) {
        this.percentByAmount = percentByAmount;
    }
}
