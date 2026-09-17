package com.uzproc.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

/**
 * Настройки вкладки ЕК (Обзор): базовая валюта и курсы для перевода сумм.
 * Курс — сколько единиц базовой валюты за 1 единицу валюты (например 1 USD = 11 797 UZS).
 * Коды валют нормализуются: «СУМ», «СУММ», «SUM» → UZS; «RUR» → RUB.
 */
@Component
@ConfigurationProperties(prefix = "app.overview.ek")
public class OverviewEkProperties {

    /** Базовая валюта, в которую приводятся суммы при разных валютах в заявках. */
    private String baseCurrency = "UZS";

    /** Курсы: код валюты -> курс к базовой (за 1 единицу валюты). */
    private Map<String, BigDecimal> exchangeRates = defaultRates();

    private static Map<String, BigDecimal> defaultRates() {
        Map<String, BigDecimal> m = new HashMap<>();
        m.put("USD", new BigDecimal("11797.46"));
        m.put("EUR", new BigDecimal("13608.37"));
        m.put("RUB", new BigDecimal("139.77"));
        return m;
    }

    public String getBaseCurrency() {
        return baseCurrency;
    }

    public void setBaseCurrency(String baseCurrency) {
        String normalized = normalizeCurrency(baseCurrency);
        this.baseCurrency = normalized != null ? normalized : "UZS";
    }

    public Map<String, BigDecimal> getExchangeRates() {
        return exchangeRates;
    }

    public void setExchangeRates(Map<String, BigDecimal> exchangeRates) {
        if (exchangeRates == null || exchangeRates.isEmpty()) {
            this.exchangeRates = defaultRates();
            return;
        }
        Map<String, BigDecimal> normalized = new HashMap<>();
        exchangeRates.forEach((currency, rate) -> normalized.put(normalizeCurrency(currency), rate));
        this.exchangeRates = normalized;
    }

    /**
     * Приводит код валюты к единому виду: верхний регистр, синонимы сума («СУМ», «СУММ», «SUM») → UZS,
     * «RUR» → RUB. Пустое значение → null.
     */
    public static String normalizeCurrency(String currency) {
        if (currency == null || currency.isBlank()) {
            return null;
        }
        String code = currency.trim().toUpperCase();
        return switch (code) {
            case "СУМ", "СУММ", "SUM" -> "UZS";
            case "RUR" -> "RUB";
            default -> code;
        };
    }

    /**
     * Курс валюты к базовой. Если валюта не задана или совпадает с базовой — 1.
     * Иначе — значение из exchangeRates или 1 при отсутствии.
     */
    public BigDecimal getRateToBase(String currency) {
        if (currency == null || currency.isBlank()) {
            return BigDecimal.ONE;
        }
        String key = normalizeCurrency(currency);
        if (key.equals(getBaseCurrency())) {
            return BigDecimal.ONE;
        }
        BigDecimal rate = exchangeRates.get(key);
        return rate != null && rate.compareTo(BigDecimal.ZERO) > 0
                ? rate
                : BigDecimal.ONE;
    }

    /**
     * Переводит сумму из валюты в базовую: amount * rate.
     */
    public BigDecimal toBaseCurrency(BigDecimal amount, String currency) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return amount.multiply(getRateToBase(currency)).setScale(2, RoundingMode.HALF_UP);
    }
}
