package com.uzproc.backend.dto.delivery;

/** Один день месяца в распределении поставок по плановой дате. */
public class DeliveryDeadlineDayDto {

    /** День месяца (1–31) */
    private int day;
    /** Количество поставок с плановой датой в этот день */
    private int count;

    public DeliveryDeadlineDayDto() {}

    public DeliveryDeadlineDayDto(int day, int count) {
        this.day = day;
        this.count = count;
    }

    public int getDay() { return day; }
    public void setDay(int day) { this.day = day; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }
}
