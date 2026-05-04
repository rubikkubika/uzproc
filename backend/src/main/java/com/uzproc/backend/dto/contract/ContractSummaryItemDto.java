package com.uzproc.backend.dto.contract;

public class ContractSummaryItemDto {
    private String preparedBy;
    private long count;

    public ContractSummaryItemDto() {}

    public ContractSummaryItemDto(String preparedBy, long count) {
        this.preparedBy = preparedBy;
        this.count = count;
    }

    public String getPreparedBy() { return preparedBy; }
    public void setPreparedBy(String preparedBy) { this.preparedBy = preparedBy; }

    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }
}
