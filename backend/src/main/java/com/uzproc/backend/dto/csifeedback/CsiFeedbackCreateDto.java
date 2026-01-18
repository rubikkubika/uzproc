package com.uzproc.backend.dto.csifeedback;

public class CsiFeedbackCreateDto {
    private String csiToken; // Токен для идентификации заявки
    private Boolean usedUzproc;
    private Double uzprocRating;
    private Double speedRating;
    private Double qualityRating;
    private Double satisfactionRating;
    private String comment;
    private String recipient; // Получатель письма (email или username)

    public CsiFeedbackCreateDto() {
    }

    // Getters and Setters
    public String getCsiToken() {
        return csiToken;
    }

    public void setCsiToken(String csiToken) {
        this.csiToken = csiToken;
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
}
