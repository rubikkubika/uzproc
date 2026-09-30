package com.uzproc.backend.dto.delivery;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Строка сводки по ответственному за поставки: сколько всего поставок с разбивкой
 * по статусу поставки и по статусу оплаты, сколько просрочено и сколько поставлено за год.
 * Считается по всем поставкам, без ограничения вкладкой — клик по сводке переводит
 * таблицу на вкладку «Все», и числа сходятся с тем, что видно в таблице.
 */
public class DeliveryResponsibleSummaryItemDto {

    /** ФИО ответственного («Фамилия Имя»), либо «Не назначен» */
    private String responsible;
    /** Всего поставок у ответственного */
    private long totalCount;
    /** Разбивка по статусу поставки: ключ — отображаемое название статуса (колонка сводки) */
    private Map<String, Long> countByShipmentStatus = new LinkedHashMap<>();
    /** Разбивка по статусу оплаты: ключ — отображаемое название статуса (колонка сводки) */
    private Map<String, Long> countByPaymentStatus = new LinkedHashMap<>();
    /** Ещё не поставлено, а плановая дата поставки уже прошла */
    private long overdueCount;
    /** Поставлено за год: статус «Поставлено» и фактическая дата поставки в этом году */
    private long deliveredCount;
    /**
     * Поставлено за год с известным сроком поставки (дедлайн, а без него — плановая дата).
     * Знаменатель «% в срок» на дэшборде «Обзор → Дэшборды по поставкам → По ответственным».
     */
    private long measurableCount;
    /** Из них в срок: фактическая дата поставки не позже срока поставки */
    private long onTimeCount;

    public DeliveryResponsibleSummaryItemDto() {}

    public DeliveryResponsibleSummaryItemDto(String responsible) {
        this.responsible = responsible;
    }

    public String getResponsible() { return responsible; }
    public void setResponsible(String responsible) { this.responsible = responsible; }

    public long getTotalCount() { return totalCount; }
    public void setTotalCount(long totalCount) { this.totalCount = totalCount; }

    public Map<String, Long> getCountByShipmentStatus() { return countByShipmentStatus; }
    public void setCountByShipmentStatus(Map<String, Long> countByShipmentStatus) {
        this.countByShipmentStatus = countByShipmentStatus;
    }

    public Map<String, Long> getCountByPaymentStatus() { return countByPaymentStatus; }
    public void setCountByPaymentStatus(Map<String, Long> countByPaymentStatus) {
        this.countByPaymentStatus = countByPaymentStatus;
    }

    public long getOverdueCount() { return overdueCount; }
    public void setOverdueCount(long overdueCount) { this.overdueCount = overdueCount; }

    public long getDeliveredCount() { return deliveredCount; }
    public void setDeliveredCount(long deliveredCount) { this.deliveredCount = deliveredCount; }

    public long getMeasurableCount() { return measurableCount; }
    public void setMeasurableCount(long measurableCount) { this.measurableCount = measurableCount; }

    public long getOnTimeCount() { return onTimeCount; }
    public void setOnTimeCount(long onTimeCount) { this.onTimeCount = onTimeCount; }
}
