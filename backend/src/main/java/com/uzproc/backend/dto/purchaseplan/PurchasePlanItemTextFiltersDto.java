package com.uzproc.backend.dto.purchaseplan;

/**
 * Текстовые фильтры колонок плана закупок, которые ищут вхождение подстроки
 * в строковом представлении значения (числа, даты и UUID приводятся к тексту).
 *
 * Значения приходят query-параметрами и связываются Spring через {@code @ModelAttribute},
 * поэтому новые колонки добавляются одним полем без расширения сигнатур сервиса.
 * Спецзначение «-» (или «null») означает «показать записи с пустым значением».
 */
public class PurchasePlanItemTextFiltersDto {

    /** ID позиции плана */
    private String id;
    /** GUID позиции плана */
    private String guid;
    /** Продукция */
    private String product;
    /** Контрагент действующего договора */
    private String currentKa;
    /** Уровень сложности закупки */
    private String complexity;
    /** Дата заявки (ISO: 2027 / 2027-01 / 2027-01-20) */
    private String requestDate;
    /** Дата завершения закупки (ISO) */
    private String newContractDate;
    /** Сумма текущего */
    private String currentAmount;
    /** Сумма текущего договора */
    private String currentContractAmount;
    /** Остаток текущего договора */
    private String currentContractBalance;
    /** Дата создания позиции (ISO) */
    private String createdAt;
    /** Дата обновления позиции (ISO) */
    private String updatedAt;
    /** «Проверено закупщиком» (драфт): «true» — только проверенные, «false» — только непроверенные */
    private String purchaserChecked;

    public String getPurchaserChecked() {
        return purchaserChecked;
    }

    public void setPurchaserChecked(String purchaserChecked) {
        this.purchaserChecked = purchaserChecked;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getGuid() {
        return guid;
    }

    public void setGuid(String guid) {
        this.guid = guid;
    }

    public String getProduct() {
        return product;
    }

    public void setProduct(String product) {
        this.product = product;
    }

    public String getCurrentKa() {
        return currentKa;
    }

    public void setCurrentKa(String currentKa) {
        this.currentKa = currentKa;
    }

    public String getComplexity() {
        return complexity;
    }

    public void setComplexity(String complexity) {
        this.complexity = complexity;
    }

    public String getRequestDate() {
        return requestDate;
    }

    public void setRequestDate(String requestDate) {
        this.requestDate = requestDate;
    }

    public String getNewContractDate() {
        return newContractDate;
    }

    public void setNewContractDate(String newContractDate) {
        this.newContractDate = newContractDate;
    }

    public String getCurrentAmount() {
        return currentAmount;
    }

    public void setCurrentAmount(String currentAmount) {
        this.currentAmount = currentAmount;
    }

    public String getCurrentContractAmount() {
        return currentContractAmount;
    }

    public void setCurrentContractAmount(String currentContractAmount) {
        this.currentContractAmount = currentContractAmount;
    }

    public String getCurrentContractBalance() {
        return currentContractBalance;
    }

    public void setCurrentContractBalance(String currentContractBalance) {
        this.currentContractBalance = currentContractBalance;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    @Override
    public String toString() {
        return "PurchasePlanItemTextFiltersDto{" +
                "id='" + id + '\'' +
                ", guid='" + guid + '\'' +
                ", product='" + product + '\'' +
                ", currentKa='" + currentKa + '\'' +
                ", complexity='" + complexity + '\'' +
                ", requestDate='" + requestDate + '\'' +
                ", newContractDate='" + newContractDate + '\'' +
                ", currentAmount='" + currentAmount + '\'' +
                ", currentContractAmount='" + currentContractAmount + '\'' +
                ", currentContractBalance='" + currentContractBalance + '\'' +
                ", createdAt='" + createdAt + '\'' +
                ", updatedAt='" + updatedAt + '\'' +
                ", purchaserChecked='" + purchaserChecked + '\'' +
                '}';
    }
}
