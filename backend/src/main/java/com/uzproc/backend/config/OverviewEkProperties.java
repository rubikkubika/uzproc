package com.uzproc.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.Map;

/**
 * Настройки вкладки ЕК (Обзор): базовая валюта и курсы для перевода сумм.
 * Курс — сколько единиц базовой валюты за 1 единицу валюты (например 1 USD = 100 RUB).
 */
@Component
@ConfigurationProperties(prefix = "app.overview.ek")
public class OverviewEkProperties {

    /** Базовая валюта, в которую приводятся суммы при разных валютах в заявках. */
    private String baseCurrency = "RUB";

    /** Курсы: код валюты -> курс к базовой (за 1 единицу валюты). */
    private Map<String, BigDecimal> exchangeRates = defaultRates();

    private static Map<String, BigDecimal> defaultRates() {
        Map<String, BigDecimal> m = new HashMap<>();
        m.put("RUB", BigDecimal.ONE);
        m.put("RUR", BigDecimal.ONE);
        m.put("USD", new BigDecimal("100"));
        m.put("EUR", new BigDecimal("105"));
        return m;
    }

    public String getBaseCurrency() {
        return baseCurrency;
    }

    public void setBaseCurrency(String baseCurrency) {
        this.baseCurrency = baseCurrency != null ? baseCurrency.trim().toUpperCase() : "RUB";
    }

    public Map<String, BigDecimal> getExchangeRates() {
        return exchangeRates;
    }

    public void setExchangeRates(Map<String, BigDecimal> exchangeRates) {
        this.exchangeRates = exchangeRates != null && !exchangeRates.isEmpty()
                ? exchangeRates
                : defaultRates();
    }

    /**
     * Курс валюты к базовой. Если валюта не задана или совпадает с базовой — 1.
     * Иначе — значение из exchangeRates или 1 при отсутствии.
     */
    public BigDecimal getRateToBase(String currency) {
        if (currency == null || currency.isBlank()) {
            return BigDecimal.ONE;
        }
        String key = currency.trim().toUpperCase();
        if (key.equals(getBaseCurrency())) {
            return BigDecimal.ONE;
        }
        BigDecimal rate = exchangeRates.get(key);
        if (rate == null) {
            rate = exchangeRates.get(currency.trim());
        }
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
