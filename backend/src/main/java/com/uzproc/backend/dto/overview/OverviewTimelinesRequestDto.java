package com.uzproc.backend.dto.overview;

import com.uzproc.backend.dto.purchaserequest.PurchaseRequestDto;

import java.util.Map;

/**
 * Заявка на закупку с рабочими днями по каждому этапу для таблицы деталей «Сроки закупок».
 */
public class OverviewTimelinesRequestDto {

    private PurchaseRequestDto request;

    /** Рабочие дни по каждому этапу (null если этап не применим). */
    private Map<String, Long> daysByStage;

    public OverviewTimelinesRequestDto() {
    }

    public OverviewTimelinesRequestDto(PurchaseRequestDto request, Map<String, Long> daysByStage) {
        this.request = request;
        this.daysByStage = daysByStage;
    }

    public PurchaseRequestDto getRequest() {
        return request;
    }

    public void setRequest(PurchaseRequestDto request) {
        this.request = request;
    }

    public Map<String, Long> getDaysByStage() {
        return daysByStage;
    }

    public void setDaysByStage(Map<String, Long> daysByStage) {
        this.daysByStage = daysByStage;
    }
}
