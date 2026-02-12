package com.uzproc.backend.entity.payment;

import com.fasterxml.jackson.annotation.JsonValue;

public enum PaymentStatus {
    TO_PAY("К оплате"),
    REFUNDED("Оплата возвращена"),
    PAID("Оплачена");

    private final String displayName;

    PaymentStatus(String displayName) {
        this.displayName = displayName;
    }

    @JsonValue
    public String getDisplayName() {
        return displayName;
    }

    public static PaymentStatus fromDisplayName(String displayName) {
        if (displayName == null || displayName.isBlank()) return null;
        String trimmed = displayName.trim();
        for (PaymentStatus s : values()) {
            if (s.displayName.equals(trimmed)) return s;
        }
        for (PaymentStatus s : values()) {
            if (s.displayName.equalsIgnoreCase(trimmed)) return s;
        }
        return null;
    }

    @Override
    public String toString() {
        return displayName;
    }
}
