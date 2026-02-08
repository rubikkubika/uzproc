package com.uzproc.backend.entity.purchaserequest;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Тип комментария заявки на закупку.
 */
public enum PurchaseRequestCommentType {
    SLA_COMMENT("Комментарий SLA");

    private final String displayName;

    PurchaseRequestCommentType(String displayName) {
        this.displayName = displayName;
    }

    @JsonValue
    public String getDisplayName() {
        return displayName;
    }

    /** Десериализация: принимает имя константы (SLA_COMMENT) или displayName (Комментарий SLA). */
    @JsonCreator
    public static PurchaseRequestCommentType fromString(String value) {
        if (value == null || value.isBlank()) return null;
        String v = value.trim();
        for (PurchaseRequestCommentType t : values()) {
            if (t.name().equals(v) || t.displayName.equals(v)) return t;
        }
        return null;
    }

    @Override
    public String toString() {
        return displayName;
    }
}
