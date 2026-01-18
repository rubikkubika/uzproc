package com.uzproc.backend.entity.purchaserequest;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PurchaseRequestStatus {
    ON_APPROVAL("Заявка на согласовании"),
    ON_APPROVAL_FINAL("Заявка у закупщика"),
    APPROVED("Заявка утверждена"),
    COORDINATED("Согласована"),
    NOT_COORDINATED("Заявка не согласована"),
    NOT_APPROVED("Заявка не утверждена"),
    PROJECT("Проект"),
    SPECIFICATION_CREATED("Спецификация создана"),
    SPECIFICATION_CREATED_ARCHIVE("Спецификация создана - Архив"),
    SPECIFICATION_ON_COORDINATION("Спецификация на согласовании"),
    SPECIFICATION_SIGNED("Спецификация подписана"),
    SPECIFICATION_NOT_COORDINATED("Спецификация не согласована"),
    PURCHASE_CREATED("Закупка создана"),
    PURCHASE_NOT_COORDINATED("Закупка не согласована"),
    PURCHASE_COMPLETED("Закупка завершена"),
    CONTRACT_CREATED("Договор создан"),
    CONTRACT_SIGNED("Договор подписан");

    private final String displayName;

    PurchaseRequestStatus(String displayName) {
        this.displayName = displayName;
    }

    @JsonValue
    public String getDisplayName() {
        return displayName;
    }

    @Override
    public String toString() {
        return displayName;
    }
}

