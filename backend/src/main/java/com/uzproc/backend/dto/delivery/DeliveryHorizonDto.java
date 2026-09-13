package com.uzproc.backend.dto.delivery;

import java.time.LocalDate;
import java.util.List;

/**
 * Горизонт непоставленных поставок относительно сегодняшнего дня: «Просрочено», «Сегодня»,
 * «Ближайшие 7 дней», «Позже», «Без даты». Считается по тем же фильтрам, что и список.
 */
public class DeliveryHorizonDto {

    /** Сегодняшняя дата сервера — от неё отсчитаны группы */
    private LocalDate today;
    /** Граница группы «Ближайшие дни» в днях от сегодня (включительно) */
    private int weekDays;
    private List<Group> groups;

    public DeliveryHorizonDto() {}

    public DeliveryHorizonDto(LocalDate today, int weekDays, List<Group> groups) {
        this.today = today;
        this.weekDays = weekDays;
        this.groups = groups;
    }

    public LocalDate getToday() { return today; }
    public void setToday(LocalDate today) { this.today = today; }

    public int getWeekDays() { return weekDays; }
    public void setWeekDays(int weekDays) { this.weekDays = weekDays; }

    public List<Group> getGroups() { return groups; }
    public void setGroups(List<Group> groups) { this.groups = groups; }

    /** Одна группа горизонта: количество и разбивка по плановым датам (по возрастанию). */
    public static class Group {
        /** over | today | week | later | nodate */
        private String key;
        private long count;
        private List<Day> days;

        public Group() {}

        public Group(String key, long count, List<Day> days) {
            this.key = key;
            this.count = count;
            this.days = days;
        }

        public String getKey() { return key; }
        public void setKey(String key) { this.key = key; }

        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }

        public List<Day> getDays() { return days; }
        public void setDays(List<Day> days) { this.days = days; }
    }

    /** Количество непоставленных поставок с плановой датой в этот день. */
    public static class Day {
        private LocalDate date;
        private long count;

        public Day() {}

        public Day(LocalDate date, long count) {
            this.date = date;
            this.count = count;
        }

        public LocalDate getDate() { return date; }
        public void setDate(LocalDate date) { this.date = date; }

        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
    }
}
