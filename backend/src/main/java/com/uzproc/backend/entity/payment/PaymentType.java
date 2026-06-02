package com.uzproc.backend.entity.payment;

/**
 * Тип оплаты по отношению к поставке.
 */
public enum PaymentType {
    /** Аванс (предоплата) — оплата до поставки. */
    ADVANCE("Аванс"),
    /** По факту (постоплата) — оплата после поставки. */
    FACT("По факту");

    private final String displayName;

    PaymentType(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static PaymentType fromDisplayName(String displayName) {
        if (displayName == null) return null;
        String normalized = displayName.trim();
        for (PaymentType t : values()) {
            if (t.displayName.equalsIgnoreCase(normalized) || t.name().equalsIgnoreCase(normalized)) {
                return t;
            }
        }
        return null;
    }
}
