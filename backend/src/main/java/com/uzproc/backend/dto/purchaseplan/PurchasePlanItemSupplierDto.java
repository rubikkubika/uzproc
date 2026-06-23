package com.uzproc.backend.dto.purchaseplan;

import com.uzproc.backend.dto.supplier.SupplierContactDto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTO связи позиции плана закупок с поставщиком (контрагентом).
 * Содержит id связи и основные данные поставщика для отображения в модальном окне.
 */
public class PurchasePlanItemSupplierDto {
    private Long id;              // id связи (для удаления)
    private Long purchasePlanItemId;
    private Long supplierId;
    private String type;
    private String kpp;
    private String inn;
    private String code;
    private String name;
    private List<SupplierContactDto> contacts; // карточки контактов поставщика
    private LocalDateTime createdAt;

    public PurchasePlanItemSupplierDto() {
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPurchasePlanItemId() {
        return purchasePlanItemId;
    }

    public void setPurchasePlanItemId(Long purchasePlanItemId) {
        this.purchasePlanItemId = purchasePlanItemId;
    }

    public Long getSupplierId() {
        return supplierId;
    }

    public void setSupplierId(Long supplierId) {
        this.supplierId = supplierId;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getKpp() {
        return kpp;
    }

    public void setKpp(String kpp) {
        this.kpp = kpp;
    }

    public String getInn() {
        return inn;
    }

    public void setInn(String inn) {
        this.inn = inn;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<SupplierContactDto> getContacts() {
        return contacts;
    }

    public void setContacts(List<SupplierContactDto> contacts) {
        this.contacts = contacts;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
