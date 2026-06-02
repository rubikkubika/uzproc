package com.uzproc.backend.dto.contract;

import java.util.ArrayList;
import java.util.List;

/**
 * Ответ дашборда «Кол-во документов» по договорам: год, строки (договорники),
 * месячные итоги и общий итог.
 */
public class ContractDocumentCountByPersonMonthResponseDto {
    private int year;
    private List<ContractDocumentCountByPersonRowDto> rows = new ArrayList<>();
    private List<Long> monthlyTotals;
    private long total;

    public ContractDocumentCountByPersonMonthResponseDto() {
        this.monthlyTotals = new ArrayList<>();
        for (int i = 0; i < 12; i++) this.monthlyTotals.add(0L);
    }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public List<ContractDocumentCountByPersonRowDto> getRows() { return rows; }
    public void setRows(List<ContractDocumentCountByPersonRowDto> rows) { this.rows = rows; }

    public List<Long> getMonthlyTotals() { return monthlyTotals; }
    public void setMonthlyTotals(List<Long> monthlyTotals) { this.monthlyTotals = monthlyTotals; }

    public long getTotal() { return total; }
    public void setTotal(long total) { this.total = total; }
}
