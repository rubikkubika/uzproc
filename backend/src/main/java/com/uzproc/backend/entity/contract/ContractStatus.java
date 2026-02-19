package com.uzproc.backend.entity.contract;

import com.fasterxml.jackson.annotation.JsonValue;

public enum ContractStatus {
    PROJECT("Проект"),
    ON_COORDINATION("На согласовании"),
    ON_REGISTRATION("На регистрации"),
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

