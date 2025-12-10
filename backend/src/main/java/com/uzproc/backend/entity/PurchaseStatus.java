package com.uzproc.backend.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PurchaseStatus {
    PROJECT("Проект");

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

