package com.uzproc.backend.entity.contract;

import com.fasterxml.jackson.annotation.JsonValue;

public enum CustomerOrganization {
    UZUM_MARKET("Uzum Market"),
    UZUM_OOO("Uzum (OOO)"),
    UZUM_TEZKOR("Uzum Tezkor");

    private final String displayName;

    CustomerOrganization(String displayName) {
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
     * Определяет организацию заказчика по значению из Excel-колонки "Организация".
     * Примеры входных значений:
     *   "ИП ООО "UZUM MARKET"" → UZUM_MARKET
     *   "ООО UZUM"              → UZUM_OOO
     *   "Mchj "UZUM TEZKOR""   → UZUM_TEZKOR
     */
    public static CustomerOrganization fromExcelValue(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String upper = value.toUpperCase().trim();
        if (upper.contains("UZUM MARKET") || upper.contains("UZUM_MARKET")) {
            return UZUM_MARKET;
        }
        if (upper.contains("TEZKOR")) {
            return UZUM_TEZKOR;
        }
        if (upper.contains("UZUM")) {
            return UZUM_OOO;
        }
        return null;
    }
}
