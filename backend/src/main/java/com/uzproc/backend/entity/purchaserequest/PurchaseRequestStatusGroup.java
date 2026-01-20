package com.uzproc.backend.entity.purchaserequest;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PurchaseRequestStatusGroup {
    PROJECT("Проект"),
    ON_COORDINATION("Заявка на согласовании"),
    NOT_COORDINATED("Заявка не согласована"),
    NOT_APPROVED("Заявка не утверждена"),
    PURCHASE_NOT_COORDINATED("Закупка не согласована"),
    AT_BUYER("Заявка у закупщика"),
    SPECIFICATION_CREATED_ARCHIVE("Спецификация создана - Архив"),
    SPECIFICATION_IN_PROGRESS("Спецификация в работе"),
    SPECIFICATION_NOT_COORDINATED("Спецификация не согласована"),
    CONTRACT_IN_PROGRESS("Договор в работе"),
    SPECIFICATION_SIGNED("Спецификация подписана"),
    CONTRACT_SIGNED("Договор подписан");

    private final String displayName;

    PurchaseRequestStatusGroup(String displayName) {
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
