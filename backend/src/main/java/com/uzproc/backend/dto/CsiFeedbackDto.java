package com.uzproc.backend.dto;

import java.time.LocalDateTime;

public class CsiFeedbackDto {
    private Long id;
    private Long purchaseRequestId;
    private String purchaseRequestInnerId;
    private Boolean usedUzproc;
    private Double uzprocRating;
    private Double speedRating;
    private Double qualityRating;
    private Double satisfactionRating;
    private String comment;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public CsiFeedbackDto() {
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPurchaseRequestId() {
        return purchaseRequestId;
    }

    public void setPurchaseRequestId(Long purchaseRequestId) {
        this.purchaseRequestId = purchaseRequestId;
    }

    public String getPurchaseRequestInnerId() {
        return purchaseRequestInnerId;
    }

    public void setPurchaseRequestInnerId(String purchaseRequestInnerId) {
        this.purchaseRequestInnerId = purchaseRequestInnerId;
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
