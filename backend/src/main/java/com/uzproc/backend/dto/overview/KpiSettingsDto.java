package com.uzproc.backend.dto.overview;

/**
 * Полный набор настроек KPI-премии: по блокам «Экономия», «SLA», «CSI».
 */
public class KpiSettingsDto {

    private KpiBlockSettingsDto savings;
    private KpiBlockSettingsDto sla;
    private KpiBlockSettingsDto csi;

    public KpiSettingsDto() {}

    public KpiSettingsDto(KpiBlockSettingsDto savings, KpiBlockSettingsDto sla, KpiBlockSettingsDto csi) {
        this.savings = savings;
        this.sla = sla;
        this.csi = csi;
    }

    public KpiBlockSettingsDto getSavings() { return savings; }
    public void setSavings(KpiBlockSettingsDto savings) { this.savings = savings; }

    public KpiBlockSettingsDto getSla() { return sla; }
    public void setSla(KpiBlockSettingsDto sla) { this.sla = sla; }

    public KpiBlockSettingsDto getCsi() { return csi; }
    public void setCsi(KpiBlockSettingsDto csi) { this.csi = csi; }
}
