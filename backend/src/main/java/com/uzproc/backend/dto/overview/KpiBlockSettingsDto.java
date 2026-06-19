package com.uzproc.backend.dto.overview;

/**
 * Настройки одного KPI-блока: цель, вес в общей премии и разрешение буста до 130%.
 */
public class KpiBlockSettingsDto {

    private Double target;
    private Double weight;
    private Boolean allowBoost;

    public KpiBlockSettingsDto() {}

    public KpiBlockSettingsDto(Double target, Double weight, Boolean allowBoost) {
        this.target = target;
        this.weight = weight;
        this.allowBoost = allowBoost;
    }

    public Double getTarget() { return target; }
    public void setTarget(Double target) { this.target = target; }

    public Double getWeight() { return weight; }
    public void setWeight(Double weight) { this.weight = weight; }

    public Boolean getAllowBoost() { return allowBoost; }
    public void setAllowBoost(Boolean allowBoost) { this.allowBoost = allowBoost; }
}
