package com.uzproc.backend.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PurchasePlanItemStatus {
    PROJECT("Проект"),
    ACTUAL("В плане"),
    NOT_ACTUAL("Исключена"),
    REQUEST("Заявка");

    private final String displayName;

    PurchasePlanItemStatus(String displayName) {
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

