package com.uzproc.backend.entity.arrival;

public enum ArrivalCurrency {
    SUM("сум"),
    RUB("руб"),
    USD("USD"),
    EUR("EUR");

    private final String displayName;

    ArrivalCurrency(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    /**
     * Парсит строку валюты из Excel в enum.
     */
    public static ArrivalCurrency fromString(String value) {
        if (value == null || value.trim().isEmpty()) return null;
        String v = value.trim().toLowerCase();
        for (ArrivalCurrency currency : values()) {
            if (currency.displayName.toLowerCase().equals(v) || currency.name().toLowerCase().equals(v)) {
                return currency;
            }
        }
        // Доп. варианты написания
        if (v.contains("сум") || v.contains("uzs")) return SUM;
        if (v.contains("руб") || v.contains("rub")) return RUB;
        if (v.contains("usd") || v.contains("долл")) return USD;
        if (v.contains("eur") || v.contains("евро")) return EUR;
        return null;
    }
}
