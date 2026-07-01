package com.uzproc.backend.entity.specificationfeedback;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Заполненная оценка работы закупок по спецификациям — одна на приглашение (ЦФО + месяц).
 * Две оценки: скорость обработки и работа исполнителя (бизнес-ориентированность) + комментарий.
 */
@Entity
@Table(name = "specification_feedback")
public class SpecificationFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invitation_id", nullable = false, unique = true)
    private SpecificationFeedbackInvitation invitation;

    @Column(name = "speed_rating")
    private Double speedRating;

    @Column(name = "business_rating")
    private Double businessRating;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public SpecificationFeedback() {
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

    public Double getSpeedRating() {
        return speedRating;
    }

    public void setSpeedRating(Double speedRating) {
        this.speedRating = speedRating;
    }

    public Double getBusinessRating() {
        return businessRating;
    }

    public void setBusinessRating(Double businessRating) {
        this.businessRating = businessRating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
