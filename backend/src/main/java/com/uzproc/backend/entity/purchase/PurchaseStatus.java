package com.uzproc.backend.entity.purchase;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PurchaseStatus {
    PROJECT("Проект"),
    NOT_COORDINATED("Не согласовано"),
    COMPLETED("Завершена");

    private final String displayName;

    PurchaseStatus(String displayName) {
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

