package com.uzproc.backend.entity.delivery;

/**
 * Статус поставки. Хранится в БД через @Enumerated(STRING) — поле name().
 * Человекочитаемое название и цвет бейджа отдаются фронту через DeliveryStatusDto.
 */
public enum DeliveryStatus {
    PROJECT("Проект", "gray"),
    ADVANCE_PREPARED("Аванс подготовлен", "blue"),
    ADVANCE_PAID("Аванс оплачен", "green");

    private final String displayName;
    private final String color;

    DeliveryStatus(String displayName, String color) {
        this.displayName = displayName;
        this.color = color;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getColor() {
        return color;
    }

    public static DeliveryStatus fromDisplayName(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        for (DeliveryStatus s : values()) {
            if (s.displayName.equalsIgnoreCase(trimmed) || s.name().equalsIgnoreCase(trimmed)) {
                return s;
            }
        }
        return null;
    }
}
