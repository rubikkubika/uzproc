package com.uzproc.backend.dto.specificationfeedback;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Сводка оценок работы закупок по спецификациям для управленческой отчётности:
 * средние показатели и список оценённых ЦФО (с указанием, кто оценил).
 */
public class SpecificationFeedbackDashboardDto {

    private long count;
    private Double avgSpeed;
    private Double avgBusiness;
    private Double avgOverall;
    private List<Item> items;

    public SpecificationFeedbackDashboardDto() {
    }

    /** Одна оценка: ЦФО, месяц, кто оценил, значения. */
    public static class Item {
        private String cfoName;
        private Integer periodYear;
        private Integer periodMonth;
        /** Кто оценил — руководитель ЦФО. */
        private String ratedBy;
        private String recipient;
        private Double speedRating;
        private Double businessRating;
        private Double overall;
        private String comment;
        private Integer specificationCount;
        private BigDecimal totalAmount;
        private LocalDateTime ratedAt;

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

        public String getRatedBy() {
            return ratedBy;
        }

        public void setRatedBy(String ratedBy) {
            this.ratedBy = ratedBy;
        }

        public String getRecipient() {
            return recipient;
        }

        public void setRecipient(String recipient) {
            this.recipient = recipient;
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

        public Double getOverall() {
            return overall;
        }

        public void setOverall(Double overall) {
            this.overall = overall;
        }

        public String getComment() {
            return comment;
        }

        public void setComment(String comment) {
            this.comment = comment;
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

        public LocalDateTime getRatedAt() {
            return ratedAt;
        }

        public void setRatedAt(LocalDateTime ratedAt) {
            this.ratedAt = ratedAt;
        }
    }

    public long getCount() {
        return count;
    }

    public void setCount(long count) {
        this.count = count;
    }

    public Double getAvgSpeed() {
        return avgSpeed;
    }

    public void setAvgSpeed(Double avgSpeed) {
        this.avgSpeed = avgSpeed;
    }

    public Double getAvgBusiness() {
        return avgBusiness;
    }

    public void setAvgBusiness(Double avgBusiness) {
        this.avgBusiness = avgBusiness;
    }

    public Double getAvgOverall() {
        return avgOverall;
    }

    public void setAvgOverall(Double avgOverall) {
        this.avgOverall = avgOverall;
    }

    public List<Item> getItems() {
        return items;
    }

    public void setItems(List<Item> items) {
        this.items = items;
    }
}
