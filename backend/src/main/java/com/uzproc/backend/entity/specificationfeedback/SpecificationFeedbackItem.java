package com.uzproc.backend.entity.specificationfeedback;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Снимок одной спецификации, попавшей в приглашение на оценку (на момент отправки).
 */
@Entity
@Table(name = "specification_feedback_items")
public class SpecificationFeedbackItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invitation_id", nullable = false)
    private SpecificationFeedbackInvitation invitation;

    /** ID спецификации (contracts.id). */
    @Column(name = "contract_id")
    private Long contractId;

    @Column(name = "inner_id", length = 255)
    private String innerId;

    @Column(name = "title", length = 500)
    private String title;

    @Column(name = "prepared_by", length = 512)
    private String preparedBy;

    @Column(name = "budget_amount", precision = 18, scale = 2)
    private BigDecimal budgetAmount;

    @Column(name = "currency", length = 10)
    private String currency;

    @Column(name = "synchronization_date")
    private LocalDateTime synchronizationDate;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public SpecificationFeedbackItem() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public SpecificationFeedbackInvitation getInvitation() {
        return invitation;
    }

    public void setInvitation(SpecificationFeedbackInvitation invitation) {
        this.invitation = invitation;
    }

    public Long getContractId() {
        return contractId;
    }

    public void setContractId(Long contractId) {
        this.contractId = contractId;
    }

    public String getInnerId() {
        return innerId;
    }

    public void setInnerId(String innerId) {
        this.innerId = innerId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getPreparedBy() {
        return preparedBy;
    }

    public void setPreparedBy(String preparedBy) {
        this.preparedBy = preparedBy;
    }

    public BigDecimal getBudgetAmount() {
        return budgetAmount;
    }

    public void setBudgetAmount(BigDecimal budgetAmount) {
        this.budgetAmount = budgetAmount;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String currency) {
        this.currency = currency;
    }

    public LocalDateTime getSynchronizationDate() {
        return synchronizationDate;
    }

    public void setSynchronizationDate(LocalDateTime synchronizationDate) {
        this.synchronizationDate = synchronizationDate;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
