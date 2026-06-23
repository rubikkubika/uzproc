package com.uzproc.backend.dto.contract;

import java.util.List;

/**
 * Ответ дашборда «Средний срок согласования по месяцам» ТОЛЬКО по сегменту Маркет,
 * с разбивкой по типу документа:
 *  — «Договор + ДС» (document_form: «Договор» и «Дополнительное соглашение»);
 *  — «Спецификации» (document_form: «Спецификация»).
 * По оси X — месяцы года создания договора, по оси Y — средний срок согласования (рабочие дни).
 */
public class ContractApprovalDurationByMonthMarketResponseDto {

    private int year;
    private List<MonthRow> months;

    public ContractApprovalDurationByMonthMarketResponseDto() {
    }

    public ContractApprovalDurationByMonthMarketResponseDto(int year, List<MonthRow> months) {
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

    /** Данные одного месяца: средний срок и количество документов по каждой группе типов документа. */
    public static class MonthRow {
        private int month;
        private Double contractDsAvgDays;
        private long contractDsCount;
        private Double specAvgDays;
        private long specCount;

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

        public Double getContractDsAvgDays() {
            return contractDsAvgDays;
        }

        public void setContractDsAvgDays(Double contractDsAvgDays) {
            this.contractDsAvgDays = contractDsAvgDays;
        }

        public long getContractDsCount() {
            return contractDsCount;
        }

        public void setContractDsCount(long contractDsCount) {
            this.contractDsCount = contractDsCount;
        }

        public Double getSpecAvgDays() {
            return specAvgDays;
        }

        public void setSpecAvgDays(Double specAvgDays) {
            this.specAvgDays = specAvgDays;
        }

        public long getSpecCount() {
            return specCount;
        }

        public void setSpecCount(long specCount) {
            this.specCount = specCount;
        }
    }
}
