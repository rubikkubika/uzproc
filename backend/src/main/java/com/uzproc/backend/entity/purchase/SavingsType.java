package com.uzproc.backend.entity.purchase;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum SavingsType {
    FROM_MEDIAN("От медианы"),
    FROM_EXISTING_CONTRACT("От существующего договора");

    private final String displayName;

    SavingsType(String displayName) {
        this.displayName = displayName;
    }

    @JsonValue
    public String getDisplayName() {
        return displayName;
    }

    @JsonCreator
    public static SavingsType fromDisplayName(String displayName) {
        for (SavingsType type : values()) {
            if (type.displayName.equals(displayName)) {
                return type;
            }
        }
        return null;
    }

    @Override
    public String toString() {
        return displayName;
    }
}
