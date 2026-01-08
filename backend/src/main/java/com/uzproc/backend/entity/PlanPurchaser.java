package com.uzproc.backend.entity;

import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Enum для временных закупщиков плана закупок
 */
public enum PlanPurchaser {
    NASTYA("Настя"),
    ABDULAZIZ("Абдулазиз"),
    ELENA("Елена");

    private final String displayName;

    PlanPurchaser(String displayName) {
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

    /**
     * Находит enum по отображаемому имени
     * Поддерживает различные варианты написания для конвертации старых данных
     */
    public static PlanPurchaser fromDisplayName(String displayName) {
        if (displayName == null) {
            return null;
        }
        String normalized = displayName.trim();
        
        // Точное совпадение
        for (PlanPurchaser purchaser : values()) {
            if (purchaser.displayName.equals(normalized)) {
                return purchaser;
            }
        }
        
        // Конвертация старых значений
        // "Настя Абдулазиз" -> "Настя" (приоритет Насте)
        if (normalized.contains("Настя") || normalized.contains("настя")) {
            return NASTYA;
        }
        if (normalized.contains("Абдулазиз") || normalized.contains("абдулазиз")) {
            return ABDULAZIZ;
        }
        if (normalized.contains("Елена") || normalized.contains("елена")) {
            return ELENA;
        }
        
        return null;
    }
}

