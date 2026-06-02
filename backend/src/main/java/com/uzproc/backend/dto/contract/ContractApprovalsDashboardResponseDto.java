package com.uzproc.backend.dto.contract;

import java.util.ArrayList;
import java.util.List;

/**
 * Ответ дашборда «Согласования договорных документов».
 */
public class ContractApprovalsDashboardResponseDto {
    private int year;
    private List<ContractApprovalsDashboardRowDto> rows = new ArrayList<>();
    private long totalCount;
    private Double totalAvgDurationDays;
    /** Список доступных договорников за год (для фильтра в UI), не зависит от выбранного фильтра. */
    private List<String> availablePreparedBy = new ArrayList<>();

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public List<ContractApprovalsDashboardRowDto> getRows() { return rows; }
    public void setRows(List<ContractApprovalsDashboardRowDto> rows) { this.rows = rows; }

    public long getTotalCount() { return totalCount; }
    public void setTotalCount(long totalCount) { this.totalCount = totalCount; }

    public Double getTotalAvgDurationDays() { return totalAvgDurationDays; }
    public void setTotalAvgDurationDays(Double totalAvgDurationDays) { this.totalAvgDurationDays = totalAvgDurationDays; }

    public List<String> getAvailablePreparedBy() { return availablePreparedBy; }
    public void setAvailablePreparedBy(List<String> availablePreparedBy) { this.availablePreparedBy = availablePreparedBy; }
}
