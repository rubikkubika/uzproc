package com.uzproc.backend.dto.purchaseplan;

import java.util.List;

/**
 * Уникальные значения для фильтров плана закупок (выпадающие списки).
 * Используется вместо загрузки 10000 записей для построения опций фильтров.
 */
public class UniqueFilterValuesDto {
    private List<String> company;
    private List<String> purchaserCompany;
    private List<String> purchaser;
    private List<String> category;
    private List<String> status;

    public UniqueFilterValuesDto() {
    }

    public UniqueFilterValuesDto(List<String> company, List<String> purchaserCompany,
                                 List<String> purchaser, List<String> category, List<String> status) {
        this.company = company;
        this.purchaserCompany = purchaserCompany;
        this.purchaser = purchaser;
        this.category = category;
        this.status = status;
    }

    public List<String> getCompany() {
        return company;
    }

    public void setCompany(List<String> company) {
        this.company = company;
    }

    public List<String> getPurchaserCompany() {
        return purchaserCompany;
    }

    public void setPurchaserCompany(List<String> purchaserCompany) {
        this.purchaserCompany = purchaserCompany;
    }

    public List<String> getPurchaser() {
        return purchaser;
    }

    public void setPurchaser(List<String> purchaser) {
        this.purchaser = purchaser;
    }

    public List<String> getCategory() {
        return category;
    }

    public void setCategory(List<String> category) {
        this.category = category;
    }

    public List<String> getStatus() {
        return status;
    }

    public void setStatus(List<String> status) {
        this.status = status;
    }
}
