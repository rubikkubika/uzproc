package com.uzproc.backend.dto.overview;

import java.util.List;

/**
 * Ответ API обзор → вкладка SLA: год и блоки по группам статусов.
 */
public class OverviewSlaResponseDto {
    private Integer year;
    private List<OverviewSlaBlockDto> statusBlocks;

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public List<OverviewSlaBlockDto> getStatusBlocks() {
        return statusBlocks;
    }

    public void setStatusBlocks(List<OverviewSlaBlockDto> statusBlocks) {
        this.statusBlocks = statusBlocks;
    }
}
