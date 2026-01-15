package com.uzproc.backend.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "csi_feedback")
public class CsiFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Связь с PurchaseRequest
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_request_id", nullable = false)
    private PurchaseRequest purchaseRequest;

    // Вопрос: Пользовались ли системой узпрок
    @Column(name = "used_uzproc")
    private Boolean usedUzproc;

    // Рейтинг узпрок (0.5 - 5.0)
    @Column(name = "uzproc_rating")
    private Double uzprocRating;

    // Оценка скорости проведения закупки (0.5 - 5.0)
    @Column(name = "speed_rating")
    private Double speedRating;

    // Оценка качества результата (0.5 - 5.0)
    @Column(name = "quality_rating")
    private Double qualityRating;

    // Оценка работы закупщика (0.5 - 5.0)
    @Column(name = "satisfaction_rating")
    private Double satisfactionRating;

    // Комментарий
    @Column(name = "comment", columnDefinition = "text")
    private String comment;

    // Получатель письма (email или username того, кому была отправлена ссылка)
    @Column(name = "recipient", length = 255)
    private String recipient;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public CsiFeedback() {
    }

    public CsiFeedback(PurchaseRequest purchaseRequest) {
        this.purchaseRequest = purchaseRequest;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public PurchaseRequest getPurchaseRequest() {
        return purchaseRequest;
    }

    public void setPurchaseRequest(PurchaseRequest purchaseRequest) {
        this.purchaseRequest = purchaseRequest;
    }

    public Boolean getUsedUzproc() {
        return usedUzproc;
    }

    public void setUsedUzproc(Boolean usedUzproc) {
        this.usedUzproc = usedUzproc;
    }

    public Double getUzprocRating() {
        return uzprocRating;
    }

    public void setUzprocRating(Double uzprocRating) {
        this.uzprocRating = uzprocRating;
    }

    public Double getSpeedRating() {
        return speedRating;
    }

    public void setSpeedRating(Double speedRating) {
        this.speedRating = speedRating;
    }

    public Double getQualityRating() {
        return qualityRating;
    }

    public void setQualityRating(Double qualityRating) {
        this.qualityRating = qualityRating;
    }

    public Double getSatisfactionRating() {
        return satisfactionRating;
    }

    public void setSatisfactionRating(Double satisfactionRating) {
        this.satisfactionRating = satisfactionRating;
    }

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public String getRecipient() {
        return recipient;
    }

    public void setRecipient(String recipient) {
        this.recipient = recipient;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
