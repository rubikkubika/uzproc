package com.uzproc.backend.dto.delivery;

import java.util.List;

/**
 * Сводка поставок по ответственным: строки — ФИО, колонки — статусы поставки и статусы оплаты.
 * Аналог сводки по исполнителям в договорах и по закупщикам в заявках.
 */
public class DeliveryResponsibleSummaryDto {

    /** Год, за который посчитано «Поставлено» */
    private int year;
    /** Статусы поставки, по которым есть данные — колонки первой группы (в порядке enum) */
    private List<String> shipmentStatuses;
    /** Статусы оплаты, по которым есть данные — колонки второй группы (в порядке enum) */
    private List<String> paymentStatuses;
    /** Строки сводки, отсортированы по убыванию общего количества поставок */
    private List<DeliveryResponsibleSummaryItemDto> items;

    public DeliveryResponsibleSummaryDto() {}

    public DeliveryResponsibleSummaryDto(int year, List<String> shipmentStatuses, List<String> paymentStatuses,
                                         List<DeliveryResponsibleSummaryItemDto> items) {
        this.year = year;
        this.shipmentStatuses = shipmentStatuses;
        this.paymentStatuses = paymentStatuses;
        this.items = items;
    }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public List<String> getShipmentStatuses() { return shipmentStatuses; }
    public void setShipmentStatuses(List<String> shipmentStatuses) { this.shipmentStatuses = shipmentStatuses; }

    public List<String> getPaymentStatuses() { return paymentStatuses; }
    public void setPaymentStatuses(List<String> paymentStatuses) { this.paymentStatuses = paymentStatuses; }

    public List<DeliveryResponsibleSummaryItemDto> getItems() { return items; }
    public void setItems(List<DeliveryResponsibleSummaryItemDto> items) { this.items = items; }
}
