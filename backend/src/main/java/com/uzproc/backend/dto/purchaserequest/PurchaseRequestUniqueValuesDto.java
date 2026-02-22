package com.uzproc.backend.dto.purchaserequest;

import java.util.List;

/**
 * Уникальные значения полей заявок для фильтров (лёгкий эндпоинт без загрузки полных записей).
 * ЦФО загружаются отдельно из /api/cfos/names.
 */
public class PurchaseRequestUniqueValuesDto {

    private List<String> purchaseRequestInitiator;
    private List<String> purchaser;
    private List<String> status;
    private List<String> statusGroup;
    private List<String> costType;
    private List<String> contractType;

    public PurchaseRequestUniqueValuesDto() {
    }

    public PurchaseRequestUniqueValuesDto(
            List<String> purchaseRequestInitiator,
            List<String> purchaser,
            List<String> status,
            List<String> statusGroup,
            List<String> costType,
            List<String> contractType) {
        this.purchaseRequestInitiator = purchaseRequestInitiator;
        this.purchaser = purchaser;
        this.status = status;
        this.statusGroup = statusGroup;
        this.costType = costType;
        this.contractType = contractType;
    }

    public List<String> getPurchaseRequestInitiator() {
        return purchaseRequestInitiator;
    }

    public void setPurchaseRequestInitiator(List<String> purchaseRequestInitiator) {
        this.purchaseRequestInitiator = purchaseRequestInitiator;
    }

    public List<String> getPurchaser() {
        return purchaser;
    }

    public void setPurchaser(List<String> purchaser) {
        this.purchaser = purchaser;
    }

    public List<String> getStatus() {
        return status;
    }

    public void setStatus(List<String> status) {
        this.status = status;
    }

    public List<String> getStatusGroup() {
        return statusGroup;
    }

    public void setStatusGroup(List<String> statusGroup) {
        this.statusGroup = statusGroup;
    }

    public List<String> getCostType() {
        return costType;
    }

    public void setCostType(List<String> costType) {
        this.costType = costType;
    }

    public List<String> getContractType() {
        return contractType;
    }

    public void setContractType(List<String> contractType) {
        this.contractType = contractType;
    }
}
