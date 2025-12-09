package com.uzproc.backend.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PurchaseRequestStatus {
    ON_APPROVAL("На согласовании"),
    ON_APPROVAL_FINAL("На утверждении"),
    APPROVED("Утверждена"),
    COORDINATED("Согласована"),
    NOT_COORDINATED("Не согласована"),
    NOT_APPROVED("Не утверждена"),
    PROJECT("Проект");

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

