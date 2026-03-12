package com.uzproc.backend.dto.overview;

/**
 * Строка сводки «по документам»: срок согласования одного договора
 * от первого назначения до последнего фактического завершения.
 */
public class OverviewContractDurationRowDto {

    private String innerId;
    private String documentForm;
    private long durationDays;
    private boolean procurement;

    public String getInnerId() { return innerId; }
    public void setInnerId(String innerId) { this.innerId = innerId; }

    public String getDocumentForm() { return documentForm; }
    public void setDocumentForm(String documentForm) { this.documentForm = documentForm; }

    public long getDurationDays() { return durationDays; }
    public void setDurationDays(long durationDays) { this.durationDays = durationDays; }

    public boolean isProcurement() { return procurement; }
    public void setProcurement(boolean procurement) { this.procurement = procurement; }
}
