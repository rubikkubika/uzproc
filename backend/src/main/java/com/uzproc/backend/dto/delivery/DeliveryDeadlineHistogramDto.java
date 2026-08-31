package com.uzproc.backend.dto.delivery;

import java.util.List;

/**
 * Распределение поставок по дням месяца: столбцы — непоставленные поставки по плановой дате
 * (plannedDeliveryDate), галочки над столбцами — поставленные по фактической дате поставки.
 * Используется столбчатой диаграммой над таблицей поставок.
 */
public class DeliveryDeadlineHistogramDto {

    /** Год, за который построено распределение */
    private int year;
    /** Месяц (1–12) */
    private int month;
    /** Число дней в месяце — столько столбцов рисует диаграмма */
    private int daysInMonth;
    /** Всего непоставленных поставок с плановой датой в этом месяце */
    private int total;
    /** Всего поставленных поставок с фактической датой поставки в этом месяце */
    private int deliveredTotal;
    /** Количество поставок по каждому дню месяца, по одному элементу на день */
    private List<DeliveryDeadlineDayDto> days;

    public DeliveryDeadlineHistogramDto() {}

    public DeliveryDeadlineHistogramDto(int year, int month, int daysInMonth, int total,
                                        int deliveredTotal, List<DeliveryDeadlineDayDto> days) {
        this.year = year;
        this.month = month;
        this.daysInMonth = daysInMonth;
        this.total = total;
        this.deliveredTotal = deliveredTotal;
        this.days = days;
    }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public int getMonth() { return month; }
    public void setMonth(int month) { this.month = month; }

    public int getDaysInMonth() { return daysInMonth; }
    public void setDaysInMonth(int daysInMonth) { this.daysInMonth = daysInMonth; }

    public int getTotal() { return total; }
    public void setTotal(int total) { this.total = total; }

    public int getDeliveredTotal() { return deliveredTotal; }
    public void setDeliveredTotal(int deliveredTotal) { this.deliveredTotal = deliveredTotal; }

    public List<DeliveryDeadlineDayDto> getDays() { return days; }
    public void setDays(List<DeliveryDeadlineDayDto> days) { this.days = days; }
}
