package com.uzproc.backend.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ContractStatus {
    PROJECT("Проект"),
    ON_COORDINATION("На согласовании"),
    SIGNED("Подписан"),
    NOT_COORDINATED("Не согласован");

    private final String displayName;

    ContractStatus(String displayName) {
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

