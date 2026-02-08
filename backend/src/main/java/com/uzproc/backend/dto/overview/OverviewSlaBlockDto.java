package com.uzproc.backend.dto.overview;

import java.util.List;

/**
 * Один блок SLA (заявки по группе статусов) на вкладке «Обзор».
 */
public class OverviewSlaBlockDto {
    private String statusGroup;
    private List<OverviewSlaRequestDto> requests;

    public OverviewSlaBlockDto() {
    }

    public OverviewSlaBlockDto(String statusGroup, List<OverviewSlaRequestDto> requests) {
        this.statusGroup = statusGroup;
        this.requests = requests;
    }

    public String getStatusGroup() {
        return statusGroup;
    }

    public void setStatusGroup(String statusGroup) {
        this.statusGroup = statusGroup;
    }

    public List<OverviewSlaRequestDto> getRequests() {
        return requests;
    }

    public void setRequests(List<OverviewSlaRequestDto> requests) {
        this.requests = requests;
    }
}
