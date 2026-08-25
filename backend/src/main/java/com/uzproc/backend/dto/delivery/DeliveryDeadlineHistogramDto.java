package com.uzproc.backend.dto.delivery;

import java.util.List;

/**
 * Распределение поставок по дням месяца по плановой дате поставки (deliveryDeadline).
 * Используется столбчатой диаграммой над таблицей поставок.
 */
public class DeliveryDeadlineHistogramDto {

    /** Год, за который построено распределение */
    private int year;
    /** Месяц (1–12) */
    private int month;
    /** Число дней в месяце — столько столбцов рисует диаграмма */
    private int daysInMonth;
    /** Всего поставок с плановой датой в этом месяце */
    private int total;
    /** Количество поставок по каждому дню месяца, по одному элементу на день */
    private List<DeliveryDeadlineDayDto> days;

    public DeliveryDeadlineHistogramDto() {}

    public DeliveryDeadlineHistogramDto(int year, int month, int daysInMonth, int total,
                                        List<DeliveryDeadlineDayDto> days) {
        this.year = year;
        this.month = month;
        this.daysInMonth = daysInMonth;
        this.total = total;
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

    public List<DeliveryDeadlineDayDto> getDays() { return days; }
    public void setDays(List<DeliveryDeadlineDayDto> days) { this.days = days; }
}
