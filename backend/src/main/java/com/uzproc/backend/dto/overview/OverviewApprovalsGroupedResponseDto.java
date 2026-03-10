package com.uzproc.backend.dto.overview;

import java.util.List;

/**
 * Ответ сводной таблицы согласований, сгруппированных по произвольному ключу.
 */
public class OverviewApprovalsGroupedResponseDto {

    private List<OverviewApprovalsGroupedRowDto> rows;
    private int totalCount;
    private Double totalAvgDurationDays;

    public List<OverviewApprovalsGroupedRowDto> getRows() { return rows; }
    public void setRows(List<OverviewApprovalsGroupedRowDto> rows) { this.rows = rows; }

    public int getTotalCount() { return totalCount; }
    public void setTotalCount(int totalCount) { this.totalCount = totalCount; }

    public Double getTotalAvgDurationDays() { return totalAvgDurationDays; }
    public void setTotalAvgDurationDays(Double totalAvgDurationDays) { this.totalAvgDurationDays = totalAvgDurationDays; }
}
