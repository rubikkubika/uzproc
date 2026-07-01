package com.uzproc.backend.dto.specificationfeedback;

/**
 * Тело запроса на сохранение оценки по спецификациям (ЦФО+месяц).
 */
public class SpecificationFeedbackSubmitDto {

    private Double speedRating;
    private Double businessRating;
    private String comment;

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
}
