package com.uzproc.backend.dto.specificationfeedback;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Данные формы оценки по токену: связка ЦФО+месяц, снимок спецификаций и статус заполнения.
 */
public class SpecificationFeedbackFormDto {

    private String token;
    private String cfoName;
    private Integer periodYear;
    private Integer periodMonth;
    private long specificationCount;
    private BigDecimal totalAmount;
    private boolean submitted;

    /** Ранее сохранённые оценки (если форма уже заполнена). */
    private Double speedRating;
    private Double businessRating;
    private String comment;

    private List<Item> items;

    public SpecificationFeedbackFormDto() {
    }

    /** Снимок одной спецификации для отображения в форме. */
    public static class Item {
        private Long contractId;
        private String innerId;
        private String title;
        private String preparedBy;
        private BigDecimal budgetAmount;
        private String currency;
        private LocalDateTime synchronizationDate;

        public Item() {
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

    public long getSpecificationCount() {
        return specificationCount;
    }

    public void setSpecificationCount(long specificationCount) {
        this.specificationCount = specificationCount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public boolean isSubmitted() {
        return submitted;
    }

    public void setSubmitted(boolean submitted) {
        this.submitted = submitted;
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

    public List<Item> getItems() {
        return items;
    }

    public void setItems(List<Item> items) {
        this.items = items;
    }
}
