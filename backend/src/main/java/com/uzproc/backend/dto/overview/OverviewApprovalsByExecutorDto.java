package com.uzproc.backend.dto.overview;

/**
 * Сводка по исполнителю согласований договоров: ФИО, количество договоров, среднее количество рабочих дней.
 * Учитываются только договоры, связанные с заявкой на закупку.
 */
public class OverviewApprovalsByExecutorDto {
    /** Исполнитель (ФИО или «Не назначен») */
    private String executorName;
    /** Количество договоров по согласованиям исполнителя */
    private int contractCount;
    /** Среднее количество рабочих дней по согласованиям (день назначения не считаем; день выполнения считаем) */
    private Double averageDays;

    public String getExecutorName() {
        return executorName;
    }

    public void setExecutorName(String executorName) {
        this.executorName = executorName;
    }

    public int getContractCount() {
        return contractCount;
    }

    public void setContractCount(int contractCount) {
        this.contractCount = contractCount;
    }

    public Double getAverageDays() {
        return averageDays;
    }

    public void setAverageDays(Double averageDays) {
        this.averageDays = averageDays;
    }
}
