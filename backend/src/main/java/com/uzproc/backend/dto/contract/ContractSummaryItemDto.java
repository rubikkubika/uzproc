package com.uzproc.backend.dto.contract;

import java.util.HashMap;
import java.util.Map;

public class ContractSummaryItemDto {
    private String preparedBy;
    private long count;
    private Map<String, Long> countByDocumentForm = new HashMap<>();

    public ContractSummaryItemDto() {}

    public ContractSummaryItemDto(String preparedBy, long count) {
        this.preparedBy = preparedBy;
        this.count = count;
    }

    public String getPreparedBy() { return preparedBy; }
    public void setPreparedBy(String preparedBy) { this.preparedBy = preparedBy; }

    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }

    public Map<String, Long> getCountByDocumentForm() { return countByDocumentForm; }
    public void setCountByDocumentForm(Map<String, Long> countByDocumentForm) {
        this.countByDocumentForm = countByDocumentForm;
    }
}
