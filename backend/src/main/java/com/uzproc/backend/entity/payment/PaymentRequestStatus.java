package com.uzproc.backend.entity.payment;

import com.fasterxml.jackson.annotation.JsonValue;

/** Статус заявки (для отображения в оплатах). */
public enum PaymentRequestStatus {
    ON_APPROVAL("На согласовании"),
    REJECTED("Отклонен"),
    APPROVED("Утвержден"),
    DRAFT("Черновик");

    private final String displayName;

    PaymentRequestStatus(String displayName) {
        this.displayName = displayName;
    }

    @JsonValue
    public String getDisplayName() {
        return displayName;
    }

    public static PaymentRequestStatus fromDisplayName(String displayName) {
        if (displayName == null || displayName.isBlank()) return null;
        String trimmed = displayName.trim();
        for (PaymentRequestStatus s : values()) {
            if (s.displayName.equals(trimmed)) return s;
        }
        for (PaymentRequestStatus s : values()) {
            if (s.displayName.equalsIgnoreCase(trimmed)) return s;
        }
        return null;
    }

    @Override
    public String toString() {
        return displayName;
    }
}
