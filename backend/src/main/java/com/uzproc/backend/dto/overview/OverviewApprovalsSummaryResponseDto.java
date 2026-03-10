package com.uzproc.backend.dto.overview;

import java.util.List;

/**
 * Ответ сводной таблицы согласований: строки по ролям и итоговая строка.
 */
public class OverviewApprovalsSummaryResponseDto {

    private List<OverviewApprovalSummaryRowDto> rows;
    private int totalCount;
    private Double totalAvgDurationDays;

    public List<OverviewApprovalSummaryRowDto> getRows() {
        return rows;
    }

    public void setRows(List<OverviewApprovalSummaryRowDto> rows) {
        this.rows = rows;
    }

    public int getTotalCount() {
        return totalCount;
    }

    public void setTotalCount(int totalCount) {
        this.totalCount = totalCount;
    }

    public Double getTotalAvgDurationDays() {
        return totalAvgDurationDays;
    }

    public void setTotalAvgDurationDays(Double totalAvgDurationDays) {
        this.totalAvgDurationDays = totalAvgDurationDays;
    }
}
