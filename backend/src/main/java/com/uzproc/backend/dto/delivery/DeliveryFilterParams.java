package com.uzproc.backend.dto.delivery;

/**
 * Параметры фильтрации списка поставок. Spring заполняет объект из query-параметров запроса,
 * поэтому имена полей совпадают с именами параметров, которые шлёт фронт.
 * Один и тот же набор используется списком, счётчиками вкладок, диаграммой «По дням» и горизонтом.
 */
public class DeliveryFilterParams {

    private String innerId;
    private String contractInnerId;
    private String contractPurchaseRequestId;
    private String supplierName;
    /** Статус оплаты (DeliveryStatus): name() / название либо NONE */
    private String status;
    private String currency;
    private String comment;
    private String responsibleName;
    private Integer dateYear;
    private Boolean dateNull;
    private String paymentScheme;
    /** Статус поставки (ShipmentStatus): name() / название либо NONE */
    private String shipmentStatus;
    private String reportStatus;
    /** none | undistributed | undistributed:N | distributed */
    private String paymentsStatus;
    /** all | in-work | closed | closed-review */
    private String tab;
    /** Выбранный день (ISO): непоставленные с плановой датой в этот день + поставленные с фактом в этот день */
    private String plannedDeliveryDate;
    /** Срез «Просрочено» из сводки */
    private Boolean overdue;
    /** Срез «Поставлено за год» из сводки */
    private Integer deliveredYear;
    /** Группа горизонта: over | today | week | later | nodate */
    private String horizon;
    /** Сигнал строки: overdue | discrepancy | undistributed | no-esf | closed | no-date */
    private String signal;
    /** ЭСФ: present | missing */
    private String esf;
    /** Расхождение со статусом ручного отчёта: yes | no */
    private String discrepancy;
    /** Диапазон плановой даты (ISO), границы включительно */
    private String plannedFrom;
    private String plannedTo;

    /**
     * Копия без выбора дня и группы горизонта — по ней считаются диаграмма «По дням» и горизонт:
     * они показывают те же записи, что таблица, но не сужаются собственным выбором.
     */
    public DeliveryFilterParams withoutDaySelection() {
        DeliveryFilterParams copy = new DeliveryFilterParams();
        copy.innerId = innerId;
        copy.contractInnerId = contractInnerId;
        copy.contractPurchaseRequestId = contractPurchaseRequestId;
        copy.supplierName = supplierName;
        copy.status = status;
        copy.currency = currency;
        copy.comment = comment;
        copy.responsibleName = responsibleName;
        copy.dateYear = dateYear;
        copy.dateNull = dateNull;
        copy.paymentScheme = paymentScheme;
        copy.shipmentStatus = shipmentStatus;
        copy.reportStatus = reportStatus;
        copy.paymentsStatus = paymentsStatus;
        copy.tab = tab;
        copy.overdue = overdue;
        copy.deliveredYear = deliveredYear;
        copy.signal = signal;
        copy.esf = esf;
        copy.discrepancy = discrepancy;
        copy.plannedFrom = plannedFrom;
        copy.plannedTo = plannedTo;
        return copy;
    }

    public String getInnerId() { return innerId; }
    public void setInnerId(String innerId) { this.innerId = innerId; }

    public String getContractInnerId() { return contractInnerId; }
    public void setContractInnerId(String contractInnerId) { this.contractInnerId = contractInnerId; }

    public String getContractPurchaseRequestId() { return contractPurchaseRequestId; }
    public void setContractPurchaseRequestId(String contractPurchaseRequestId) { this.contractPurchaseRequestId = contractPurchaseRequestId; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }

    public String getResponsibleName() { return responsibleName; }
    public void setResponsibleName(String responsibleName) { this.responsibleName = responsibleName; }

    public Integer getDateYear() { return dateYear; }
    public void setDateYear(Integer dateYear) { this.dateYear = dateYear; }

    public Boolean getDateNull() { return dateNull; }
    public void setDateNull(Boolean dateNull) { this.dateNull = dateNull; }

    public String getPaymentScheme() { return paymentScheme; }
    public void setPaymentScheme(String paymentScheme) { this.paymentScheme = paymentScheme; }

    public String getShipmentStatus() { return shipmentStatus; }
    public void setShipmentStatus(String shipmentStatus) { this.shipmentStatus = shipmentStatus; }

    public String getReportStatus() { return reportStatus; }
    public void setReportStatus(String reportStatus) { this.reportStatus = reportStatus; }

    public String getPaymentsStatus() { return paymentsStatus; }
    public void setPaymentsStatus(String paymentsStatus) { this.paymentsStatus = paymentsStatus; }

    public String getTab() { return tab; }
    public void setTab(String tab) { this.tab = tab; }

    public String getPlannedDeliveryDate() { return plannedDeliveryDate; }
    public void setPlannedDeliveryDate(String plannedDeliveryDate) { this.plannedDeliveryDate = plannedDeliveryDate; }

    public Boolean getOverdue() { return overdue; }
    public void setOverdue(Boolean overdue) { this.overdue = overdue; }

    public Integer getDeliveredYear() { return deliveredYear; }
    public void setDeliveredYear(Integer deliveredYear) { this.deliveredYear = deliveredYear; }

    public String getHorizon() { return horizon; }
    public void setHorizon(String horizon) { this.horizon = horizon; }

    public String getSignal() { return signal; }
    public void setSignal(String signal) { this.signal = signal; }

    public String getEsf() { return esf; }
    public void setEsf(String esf) { this.esf = esf; }

    public String getDiscrepancy() { return discrepancy; }
    public void setDiscrepancy(String discrepancy) { this.discrepancy = discrepancy; }

    public String getPlannedFrom() { return plannedFrom; }
    public void setPlannedFrom(String plannedFrom) { this.plannedFrom = plannedFrom; }

    public String getPlannedTo() { return plannedTo; }
    public void setPlannedTo(String plannedTo) { this.plannedTo = plannedTo; }
}
