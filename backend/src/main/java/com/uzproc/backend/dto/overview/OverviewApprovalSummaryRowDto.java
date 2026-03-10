package com.uzproc.backend.dto.overview;

/**
 * Строка сводной таблицы согласований по году и роли.
 * Используется для вкладки «Согласования» страницы «Обзор».
 */
public class OverviewApprovalSummaryRowDto {

    /** Роль согласующего */
    private String role;

    /** Год (по дате завершения согласования) */
    private int year;

    /** Количество завершённых согласований */
    private int count;

    /** Среднее количество рабочих дней (от даты назначения до даты фактического завершения) */
    private Double avgDurationDays;

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public int getYear() {
        return year;
    }

    public void setYear(int year) {
        this.year = year;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public Double getAvgDurationDays() {
        return avgDurationDays;
    }

    public void setAvgDurationDays(Double avgDurationDays) {
        this.avgDurationDays = avgDurationDays;
    }
}
