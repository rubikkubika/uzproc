package com.uzproc.backend.dto.contract;

/**
 * Строка дашборда «Согласования договорных документов»:
 * разрез сегмент × тип документа × типовая/не типовая.
 */
public class ContractApprovalsDashboardRowDto {
    private String segment;
    private String documentForm;
    private Boolean typicalForm;
    private long count;
    private Double avgDurationDays;

    public ContractApprovalsDashboardRowDto() {}

    public String getSegment() { return segment; }
    public void setSegment(String segment) { this.segment = segment; }

    public String getDocumentForm() { return documentForm; }
    public void setDocumentForm(String documentForm) { this.documentForm = documentForm; }

    public Boolean getTypicalForm() { return typicalForm; }
    public void setTypicalForm(Boolean typicalForm) { this.typicalForm = typicalForm; }

    public long getCount() { return count; }
    public void setCount(long count) { this.count = count; }

    public Double getAvgDurationDays() { return avgDurationDays; }
    public void setAvgDurationDays(Double avgDurationDays) { this.avgDurationDays = avgDurationDays; }
}
