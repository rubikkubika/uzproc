package com.uzproc.backend.entity.delivery;

/**
 * Статус поставки (фактическая отгрузка/получение). Задаётся пользователем вручную.
 * Не путать с {@link DeliveryStatus}, который отражает статус оплаты.
 * Хранится в БД через @Enumerated(STRING) — поле name().
 */
public enum ShipmentStatus {
    EXPECTED("Ожидается", "blue"),
    DELIVERED("Поставлено", "green"),
    OVERDUE("Просрочено", "red");

    private final String displayName;
    private final String color;

    ShipmentStatus(String displayName, String color) {
        this.displayName = displayName;
        this.color = color;
    }

    public String getDisplayName() {
        return displayName;
    }

    public String getColor() {
        return color;
    }

    public static ShipmentStatus fromDisplayName(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        for (ShipmentStatus s : values()) {
            if (s.displayName.equalsIgnoreCase(trimmed) || s.name().equalsIgnoreCase(trimmed)) {
                return s;
            }
        }
        return null;
    }
}
