package com.uzproc.backend.dto.overview;

import java.util.List;

/**
 * Ответ сводки «по документам»: список договоров с их сроками согласования.
 */
public class OverviewContractDurationResponseDto {

    private List<OverviewContractDurationRowDto> rows;
    private int totalCount;
    private Double avgDurationDays;

    public List<OverviewContractDurationRowDto> getRows() { return rows; }
    public void setRows(List<OverviewContractDurationRowDto> rows) { this.rows = rows; }

    public int getTotalCount() { return totalCount; }
    public void setTotalCount(int totalCount) { this.totalCount = totalCount; }

    public Double getAvgDurationDays() { return avgDurationDays; }
    public void setAvgDurationDays(Double avgDurationDays) { this.avgDurationDays = avgDurationDays; }
}
