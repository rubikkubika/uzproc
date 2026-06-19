package com.uzproc.backend.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Настройки KPI-премии (цель, вес, буст до 130%) для блоков «Экономия», «SLA», «CSI».
 * Хранится единственной строкой (singleton, id = 1), общей для всех пользователей.
 */
@Entity
@Table(name = "kpi_settings")
public class KpiSettings {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "savings_target", nullable = false)
    private Double savingsTarget = 5.0;

    @Column(name = "savings_weight", nullable = false)
    private Double savingsWeight = 30.0;

    @Column(name = "savings_allow_boost", nullable = false)
    private Boolean savingsAllowBoost = true;

    @Column(name = "sla_target", nullable = false)
    private Double slaTarget = 80.0;

    @Column(name = "sla_weight", nullable = false)
    private Double slaWeight = 30.0;

    @Column(name = "sla_allow_boost", nullable = false)
    private Boolean slaAllowBoost = true;

    @Column(name = "csi_target", nullable = false)
    private Double csiTarget = 4.5;

    @Column(name = "csi_weight", nullable = false)
    private Double csiWeight = 40.0;

    @Column(name = "csi_allow_boost", nullable = false)
    private Boolean csiAllowBoost = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Double getSavingsTarget() { return savingsTarget; }
    public void setSavingsTarget(Double savingsTarget) { this.savingsTarget = savingsTarget; }

    public Double getSavingsWeight() { return savingsWeight; }
    public void setSavingsWeight(Double savingsWeight) { this.savingsWeight = savingsWeight; }

    public Boolean getSavingsAllowBoost() { return savingsAllowBoost; }
    public void setSavingsAllowBoost(Boolean savingsAllowBoost) { this.savingsAllowBoost = savingsAllowBoost; }

    public Double getSlaTarget() { return slaTarget; }
    public void setSlaTarget(Double slaTarget) { this.slaTarget = slaTarget; }

    public Double getSlaWeight() { return slaWeight; }
    public void setSlaWeight(Double slaWeight) { this.slaWeight = slaWeight; }

    public Boolean getSlaAllowBoost() { return slaAllowBoost; }
    public void setSlaAllowBoost(Boolean slaAllowBoost) { this.slaAllowBoost = slaAllowBoost; }

    public Double getCsiTarget() { return csiTarget; }
    public void setCsiTarget(Double csiTarget) { this.csiTarget = csiTarget; }

    public Double getCsiWeight() { return csiWeight; }
    public void setCsiWeight(Double csiWeight) { this.csiWeight = csiWeight; }

    public Boolean getCsiAllowBoost() { return csiAllowBoost; }
    public void setCsiAllowBoost(Boolean csiAllowBoost) { this.csiAllowBoost = csiAllowBoost; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
