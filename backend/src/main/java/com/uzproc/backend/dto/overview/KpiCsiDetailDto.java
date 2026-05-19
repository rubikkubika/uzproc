package com.uzproc.backend.dto.overview;

/**
 * Деталь отзыва CSI для выбранного закупщика за месяц.
 */
public class KpiCsiDetailDto {
    private Long id;
    private Long purchaseRequestId;
    private Long idPurchaseRequest;
    private String purchaseRequestName;
    private String recipient;
    private Double speedRating;
    private Double qualityRating;
    private Double satisfactionRating;
    private Double uzprocRating;
    private Double avgRating;
    private String comment;
    private String createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getPurchaseRequestId() { return purchaseRequestId; }
    public void setPurchaseRequestId(Long purchaseRequestId) { this.purchaseRequestId = purchaseRequestId; }

    public Long getIdPurchaseRequest() { return idPurchaseRequest; }
    public void setIdPurchaseRequest(Long idPurchaseRequest) { this.idPurchaseRequest = idPurchaseRequest; }

    public String getPurchaseRequestName() { return purchaseRequestName; }
    public void setPurchaseRequestName(String purchaseRequestName) { this.purchaseRequestName = purchaseRequestName; }

    public String getRecipient() { return recipient; }
    public void setRecipient(String recipient) { this.recipient = recipient; }

    public Double getSpeedRating() { return speedRating; }
    public void setSpeedRating(Double speedRating) { this.speedRating = speedRating; }

    public Double getQualityRating() { return qualityRating; }
    public void setQualityRating(Double qualityRating) { this.qualityRating = qualityRating; }

    public Double getSatisfactionRating() { return satisfactionRating; }
    public void setSatisfactionRating(Double satisfactionRating) { this.satisfactionRating = satisfactionRating; }

    public Double getUzprocRating() { return uzprocRating; }
    public void setUzprocRating(Double uzprocRating) { this.uzprocRating = uzprocRating; }

    public Double getAvgRating() { return avgRating; }
    public void setAvgRating(Double avgRating) { this.avgRating = avgRating; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
