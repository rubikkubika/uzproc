package com.uzproc.backend.dto.delivery;

/**
 * Описание варианта статуса поставки для фронта.
 */
public class DeliveryStatusDto {
    private String name;
    private String displayName;
    private String color;

    public DeliveryStatusDto() {}

    public DeliveryStatusDto(String name, String displayName, String color) {
        this.name = name;
        this.displayName = displayName;
        this.color = color;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }
}
