package com.uzproc.backend.service.mrpresentation;

import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Locale;
import java.util.stream.Collectors;

/**
 * Форматирование значений презентации: суммы, оценки, даты, имена, склонения.
 */
final class MrFormat {

    private MrFormat() {
    }

    /** Курс пересчёта сумм в доллары для карточек экономии. */
    private static final double USD_TO_UZS_RATE = 12000;
    private static final ZoneId ZONE = ZoneId.of("Asia/Tashkent");
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("dd.MM.yyyy, HH:mm");
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    /** Округление как у JS toFixed: по точному двоичному значению числа. */
    static String fixed(double value, int digits) {
        return new BigDecimal(value).setScale(digits, RoundingMode.HALF_UP).toPlainString();
    }

    /** Сумма в долларах компактно: «5.6 млн $», «308 тыс $». */
    static String money(double valueUzs) {
        double v = valueUzs / USD_TO_UZS_RATE;
        if (v == 0) {
            return "0 $";
        }
        double abs = Math.abs(v);
        if (abs >= 1_000_000_000) {
            return fixed(v / 1_000_000_000, 1) + " млрд $";
        }
        if (abs >= 1_000_000) {
            return fixed(v / 1_000_000, 1) + " млн $";
        }
        if (abs >= 1_000) {
            return fixed(v / 1_000, 0) + " тыс $";
        }
        return fixed(v, 0) + " $";
    }

    /** Сумма в сумах компактно: «167.4 млн», «4.3 млрд». */
    static String amountShort(Double value) {
        if (value == null) {
            return "—";
        }
        double abs = Math.abs(value);
        if (abs >= 1_000_000_000) {
            return fixed(value / 1_000_000_000, 1) + " млрд";
        }
        if (abs >= 1_000_000) {
            return fixed(value / 1_000_000, 1) + " млн";
        }
        if (abs >= 1_000) {
            return fixed(value / 1_000, 0) + " тыс";
        }
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.forLanguageTag("ru"));
        symbols.setGroupingSeparator(' ');
        return new DecimalFormat("#,##0", symbols).format(Math.round(value));
    }

    /** Оценка с одним знаком после запятой. */
    static String rating(Double value) {
        return value != null ? fixed(value, 1) : "—";
    }

    /** Процент без дробной части. */
    static String percent(Double value) {
        return value != null ? Math.round(value) + "%" : "—";
    }

    /** Дата и время: «03.08.2026, 07:09». */
    static String dateTime(String iso) {
        LocalDateTime value = parse(iso);
        return value != null ? value.format(DATE_TIME) : "";
    }

    /** Дата без времени: «03.08.2026». */
    static String date(String iso) {
        LocalDateTime value = parse(iso);
        return value != null ? value.format(DATE) : "";
    }

    /** Время без пояса считаем местным (так его хранит БД); с поясом — приводим к Ташкенту. */
    private static LocalDateTime parse(String iso) {
        if (iso == null || iso.isBlank()) {
            return null;
        }
        try {
            return LocalDateTime.parse(iso);
        } catch (Exception ignored) {
            // не локальное время — пробуем со смещением
        }
        try {
            return OffsetDateTime.parse(iso).atZoneSameInstant(ZONE).toLocalDateTime();
        } catch (Exception ignored) {
            return null;
        }
    }

    static String monthName(int month) {
        return month >= 1 && month <= 12 ? MrTheme.MONTH_FULL[month - 1] : "";
    }

    static String monthNameCapitalized(int month) {
        String name = monthName(month);
        return name.isEmpty() ? "" : name.substring(0, 1).toUpperCase(Locale.ROOT) + name.substring(1);
    }

    /** Имя файла презентации. */
    static String fileName(int year, int month) {
        return "УО " + monthName(month) + " " + year + ".pdf";
    }

    /** Подпись периода данных: «2026 · январь — август». */
    static String dataPeriodLabel(int year, Integer fromMonth, Integer toMonth) {
        if (fromMonth == null || toMonth == null) {
            return String.valueOf(year);
        }
        if (fromMonth.equals(toMonth)) {
            return year + " · " + monthName(fromMonth);
        }
        return year + " · " + monthName(fromMonth) + " — " + monthName(toMonth);
    }

    /** Футер контентных слайдов: «Uzum E-com · УО сентябрь 2026». */
    static String footerLabel(int month, int year) {
        return MrTheme.COMPANY_TITLE + " · УО " + monthName(month) + " " + year;
    }

    /** Обрезка длинного текста по числу символов с многоточием. */
    static String truncate(String text, int maxChars) {
        if (text == null) {
            return "";
        }
        String clean = text.replaceAll("\\s+", " ").trim();
        return clean.length() > maxChars ? clean.substring(0, maxChars - 1) + "…" : clean;
    }

    /** Имя без должности и подразделения в скобках; логины-почты остаются целиком. */
    static String personDisplayName(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String withoutPosition = value.split("\\(")[0].trim();
        if (withoutPosition.isEmpty()) {
            withoutPosition = value.trim();
        }
        if (withoutPosition.contains("@")) {
            return withoutPosition;
        }
        return firstWords(withoutPosition, 2);
    }

    /** Закупщик: только первые два слова; пусто — «—». */
    static String purchaserDisplayName(String name) {
        if (name == null || name.isBlank()) {
            return "—";
        }
        String result = firstWords(name.trim(), 2);
        return result.isEmpty() ? "—" : result;
    }

    private static String firstWords(String value, int count) {
        return Arrays.stream(value.split("\\s+")).filter(w -> !w.isEmpty()).limit(count)
                .collect(Collectors.joining(" "));
    }

    /** Название ЦФО без служебного префикса сегмента: «M - Construction» → «Construction». */
    static String cfoDisplayName(String cfo) {
        if (cfo == null || cfo.isEmpty()) {
            return "";
        }
        String stripped = cfo.replaceFirst("^[A-Za-zА-Яа-я]{1,3}\\s*[-–—]\\s*", "").trim();
        return stripped.isEmpty() ? cfo.trim() : stripped;
    }

    /** Склонение слова «закупка». */
    static String purchasesLabel(long count) {
        return count + " " + plural(count, "закупка", "закупки", "закупок");
    }

    /** Склонение слова «оценка». */
    static String ratingsLabel(long count) {
        return count + " " + plural(count, "оценка", "оценки", "оценок");
    }

    private static String plural(long count, String one, String few, String many) {
        long mod10 = count % 10;
        long mod100 = count % 100;
        if (mod10 == 1 && mod100 != 11) {
            return one;
        }
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
            return few;
        }
        return many;
    }

    /* ─── Чтение JSON ───────────────────────────────────────────────────── */

    static Double number(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value != null && value.isNumber() ? value.asDouble() : null;
    }

    static double numberOr(JsonNode node, String field, double fallback) {
        Double value = number(node, field);
        return value != null ? value : fallback;
    }

    static String text(JsonNode node, String field) {
        JsonNode value = node == null ? null : node.get(field);
        return value != null && !value.isNull() ? value.asText() : null;
    }
}
