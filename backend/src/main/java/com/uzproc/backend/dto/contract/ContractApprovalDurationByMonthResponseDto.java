package com.uzproc.backend.dto.contract;

import java.util.List;

/**
 * Ответ дашборда «Средний срок согласования по месяцам» в разрезе сегментов
 * (Маркет / Тезкор ООО / 1П). По оси X — месяцы года создания договора,
 * по оси Y — средний срок согласования (календарные дни).
 */
public class ContractApprovalDurationByMonthResponseDto {

    private int year;
    private List<MonthRow> months;

    public ContractApprovalDurationByMonthResponseDto() {
    }

    public ContractApprovalDurationByMonthResponseDto(int year, List<MonthRow> months) {
        this.year = year;
        this.months = months;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public List<MonthRow> getMonths() {
        return months;
    }

    public void setMonths(List<MonthRow> months) {
        this.months = months;
    }

    /** Данные одного месяца: средний срок и количество договоров по каждому сегменту. */
    public static class MonthRow {
        private int month;
        private Double marketAvgDays;
        private long marketCount;
        private Double tezkorOooAvgDays;
        private long tezkorOooCount;
        private Double p1AvgDays;
        private long p1Count;

        public MonthRow() {
        }

        public MonthRow(int month) {
            this.month = month;
        }

        public int getMonth() {
            return month;
        }

        public void setMonth(int month) {
            this.month = month;
        }

        public Double getMarketAvgDays() {
            return marketAvgDays;
        }

        public void setMarketAvgDays(Double marketAvgDays) {
            this.marketAvgDays = marketAvgDays;
        }

        public long getMarketCount() {
            return marketCount;
        }

        public void setMarketCount(long marketCount) {
            this.marketCount = marketCount;
        }

        public Double getTezkorOooAvgDays() {
            return tezkorOooAvgDays;
        }

        public void setTezkorOooAvgDays(Double tezkorOooAvgDays) {
            this.tezkorOooAvgDays = tezkorOooAvgDays;
        }

        public long getTezkorOooCount() {
            return tezkorOooCount;
        }

        public void setTezkorOooCount(long tezkorOooCount) {
            this.tezkorOooCount = tezkorOooCount;
        }

        public Double getP1AvgDays() {
            return p1AvgDays;
        }

        public void setP1AvgDays(Double p1AvgDays) {
            this.p1AvgDays = p1AvgDays;
        }

        public long getP1Count() {
            return p1Count;
        }

        public void setP1Count(long p1Count) {
            this.p1Count = p1Count;
        }
    }
}
