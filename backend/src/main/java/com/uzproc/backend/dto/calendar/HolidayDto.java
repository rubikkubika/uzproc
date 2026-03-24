package com.uzproc.backend.dto.calendar;

import java.time.LocalDate;

public class HolidayDto {

    private LocalDate calendarDate;
    private String name;

    public HolidayDto() {
    }

    public HolidayDto(LocalDate calendarDate, String name) {
        this.calendarDate = calendarDate;
        this.name = name;
    }

    public LocalDate getCalendarDate() {
        return calendarDate;
    }

    public void setCalendarDate(LocalDate calendarDate) {
        this.calendarDate = calendarDate;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
