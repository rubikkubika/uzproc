package com.uzproc.backend.dto.delivery;

/** Один день месяца в распределении поставок по плановой дате. */
public class DeliveryDeadlineDayDto {

    /** День месяца (1–31) */
    private int day;
    /** Количество непоставленных поставок с плановой датой в этот день */
    private int count;
    /** Количество поставок со статусом «Поставлено» и фактической датой поставки в этот день */
    private int deliveredCount;

    public DeliveryDeadlineDayDto() {}

    public DeliveryDeadlineDayDto(int day, int count, int deliveredCount) {
        this.day = day;
        this.count = count;
        this.deliveredCount = deliveredCount;
    }

    public int getDay() { return day; }
    public void setDay(int day) { this.day = day; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }

    public int getDeliveredCount() { return deliveredCount; }
    public void setDeliveredCount(int deliveredCount) { this.deliveredCount = deliveredCount; }
}
