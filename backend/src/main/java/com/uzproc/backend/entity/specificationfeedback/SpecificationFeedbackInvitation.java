package com.uzproc.backend.entity.specificationfeedback;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Приглашение на оценку работы закупок по спецификациям — одно на связку (ЦФО, год, месяц).
 * Аналог CSI-приглашения на заявках, но с группировкой по набору спецификаций за месяц.
 */
@Entity
@Table(name = "specification_feedback_invitations")
public class SpecificationFeedbackInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Токен публичной ссылки на форму оценки. */
    @Column(name = "token", nullable = false, unique = true, length = 255)
    private String token;

    @Column(name = "cfo_name", nullable = false, length = 255)
    private String cfoName;

    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

    @Column(name = "period_month", nullable = false)
    private Integer periodMonth;

    /** Email руководителя ЦФО на момент отправки. */
    @Column(name = "recipient", length = 255)
    private String recipient;

    @Column(name = "leader_full_name", length = 512)
    private String leaderFullName;

    @Column(name = "specification_count", nullable = false)
    private Integer specificationCount = 0;

    @Column(name = "total_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /** Снимок спецификаций, попавших в приглашение. */
    @OneToMany(mappedBy = "invitation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("id ASC")
    private List<SpecificationFeedbackItem> items = new ArrayList<>();

    /** Заполненная оценка (null, пока руководитель не ответил). */
    @OneToOne(mappedBy = "invitation", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private SpecificationFeedback feedback;

    public SpecificationFeedbackInvitation() {
    }

    @PrePersist
    protected void onCreate() {
        if (token == null || token.isEmpty()) {
            token = UUID.randomUUID().toString();
        }
    }

    /** Заменяет снимок спецификаций (удаляет старые, добавляет новые). */
    public void replaceItems(List<SpecificationFeedbackItem> newItems) {
        this.items.clear();
        if (newItems != null) {
            for (SpecificationFeedbackItem item : newItems) {
                item.setInvitation(this);
                this.items.add(item);
            }
        }
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getCfoName() {
        return cfoName;
    }

    public void setCfoName(String cfoName) {
        this.cfoName = cfoName;
    }

    public Integer getPeriodYear() {
        return periodYear;
    }

    public void setPeriodYear(Integer periodYear) {
        this.periodYear = periodYear;
    }

    public Integer getPeriodMonth() {
        return periodMonth;
    }

    public void setPeriodMonth(Integer periodMonth) {
        this.periodMonth = periodMonth;
    }

    public String getRecipient() {
        return recipient;
    }

    public void setRecipient(String recipient) {
        this.recipient = recipient;
    }

    public String getLeaderFullName() {
        return leaderFullName;
    }

    public void setLeaderFullName(String leaderFullName) {
        this.leaderFullName = leaderFullName;
    }

    public Integer getSpecificationCount() {
        return specificationCount;
    }

    public void setSpecificationCount(Integer specificationCount) {
        this.specificationCount = specificationCount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public LocalDateTime getSentAt() {
        return sentAt;
    }

    public void setSentAt(LocalDateTime sentAt) {
        this.sentAt = sentAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public List<SpecificationFeedbackItem> getItems() {
        return items;
    }

    public SpecificationFeedback getFeedback() {
        return feedback;
    }

    public void setFeedback(SpecificationFeedback feedback) {
        this.feedback = feedback;
        if (feedback != null) {
            feedback.setInvitation(this);
        }
    }
}
