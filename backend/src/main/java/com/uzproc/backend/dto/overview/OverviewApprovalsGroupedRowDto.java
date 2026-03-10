package com.uzproc.backend.dto.overview;

/**
 * Строка сводной таблицы согласований, сгруппированных по произвольному ключу
 * (ФИО исполнителя, форма документа и т.д.).
 */
public class OverviewApprovalsGroupedRowDto {

    private String key;
    private int count;
    private Double avgDurationDays;
    /** Кол-во уникальных договоров (заполняется только для сводки «по виду документа»). */
    private Integer documentCount;
    /** Должность/роль исполнителя (заполняется только для сводки «по ФИО»). */
    private String department;

    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }

    public int getCount() { return count; }
    public void setCount(int count) { this.count = count; }

    public Double getAvgDurationDays() { return avgDurationDays; }
    public void setAvgDurationDays(Double avgDurationDays) { this.avgDurationDays = avgDurationDays; }

    public Integer getDocumentCount() { return documentCount; }
    public void setDocumentCount(Integer documentCount) { this.documentCount = documentCount; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
}
