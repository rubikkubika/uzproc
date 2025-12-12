package com.uzproc.backend.entity;

import com.fasterxml.jackson.annotation.JsonValue;

public enum Company {
    UZUM_MARKET("Uzum Market"),
    UZUM_TECHNOLOGIES("Uzum Technologies");

    private final String displayName;

    Company(String displayName) {
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

