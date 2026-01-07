package com.uzproc.backend.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PurchaseRequestStatus {
    ON_APPROVAL("Заявка на согласовании"),
    ON_APPROVAL_FINAL("Заявка на утверждении"),
    APPROVED("Заявка утверждена"),
    COORDINATED("Согласована"),
    NOT_COORDINATED("Не согласована"),
    NOT_APPROVED("Не утверждена"),
    PROJECT("Проект"),
    SPECIFICATION_CREATED("Спецификация создана"),
    PURCHASE_CREATED("Закупка создана");

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

