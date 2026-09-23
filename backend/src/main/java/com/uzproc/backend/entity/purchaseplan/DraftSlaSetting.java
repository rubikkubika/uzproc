package com.uzproc.backend.entity.purchaseplan;

import com.uzproc.backend.entity.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.time.LocalDateTime;

/**
 * Строка таблицы SLA драфта плана закупок: срок по сложности на год драфта.
 * Срок от даты заявки до заключения нового договора = SLA закупки + SLA договора (рабочие дни).
 */
@Entity
@Table(name = "draft_sla_settings")
public class DraftSlaSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "year", nullable = false)
    private Integer year;

    /** Сложность закупки 1–4 */
    @Column(name = "complexity", nullable = false)
    private Integer complexity;

    /** SLA закупки, рабочих дней */
    @Column(name = "procurement_days", nullable = false)
    private Integer procurementDays;

    /** SLA договора, рабочих дней */
    @Column(name = "contract_days", nullable = false)
    private Integer contractDays;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by_id")
    private User updatedBy;

    public DraftSlaSetting() {
    }

    public DraftSlaSetting(Integer year, Integer complexity, Integer procurementDays, Integer contractDays) {
        this.year = year;
        this.complexity = complexity;
        this.procurementDays = procurementDays;
        this.contractDays = contractDays;
    }

    /** Общий срок: SLA закупки + SLA договора */
    public int getTotalDays() {
        return (procurementDays != null ? procurementDays : 0) + (contractDays != null ? contractDays : 0);
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public Integer getComplexity() {
        return complexity;
    }

    public void setComplexity(Integer complexity) {
        this.complexity = complexity;
    }

    public Integer getProcurementDays() {
        return procurementDays;
    }

    public void setProcurementDays(Integer procurementDays) {
        this.procurementDays = procurementDays;
    }

    public Integer getContractDays() {
        return contractDays;
    }

    public void setContractDays(Integer contractDays) {
        this.contractDays = contractDays;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public User getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(User updatedBy) {
        this.updatedBy = updatedBy;
    }
}
