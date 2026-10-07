package com.uzproc.backend.service.sendingcenter;

import org.springframework.stereotype.Component;

import java.time.YearMonth;

/** Тема и текст письма с презентацией управленческой отчётности. */
@Component
public class ManagementReportEmailBuilder {

    private static final String[] MONTHS = {
            "январь", "февраль", "март", "апрель", "май", "июнь",
            "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"
    };

    private static final String PARAGRAPH_STYLE =
            "color: #333333; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;";
    private static final String NOTE_STYLE =
            "color: #8a6d3b; background-color: #fcf8e3; border: 1px solid #faebcc; border-radius: 4px; "
                    + "font-size: 13px; line-height: 1.5; padding: 8px 12px; margin: 0 0 12px 0;";

    /** Подпись периода: «сентябрь 2026». */
    public String periodLabel(YearMonth period) {
        return MONTHS[period.getMonthValue() - 1] + " " + period.getYear();
    }

    public String buildSubject(YearMonth period) {
        return "Управленческая отчётность по закупкам за " + periodLabel(period);
    }

    /** Тема тестового письма. */
    public String buildTestSubject(YearMonth period) {
        return "[ТЕСТ] " + buildSubject(period);
    }

    /**
     * Краткое уведомление в теле письма.
     *
     * @param testNote пояснение для тестовой отправки; null — обычное письмо
     */
    public String buildContent(YearMonth period, int slideCount, String testNote) {
        StringBuilder html = new StringBuilder();
        if (testNote != null && !testNote.isBlank()) {
            html.append("<p style=\"").append(NOTE_STYLE).append("\">").append(escape(testNote)).append("</p>");
        }
        html.append("<p style=\"").append(PARAGRAPH_STYLE).append("\">Здравствуйте!</p>");
        html.append("<p style=\"").append(PARAGRAPH_STYLE).append("\">Во вложении — презентация управленческой отчётности ")
                .append("по закупкам за <strong>").append(escape(periodLabel(period))).append("</strong>");
        if (slideCount > 0) {
            html.append(" (PDF, слайдов: ").append(slideCount).append(")");
        }
        html.append(".</p>");
        html.append("<p style=\"").append(PARAGRAPH_STYLE).append("\">В отчёте: экономия, CSI и SLA, ")
                .append("обратная связь инициаторов, показатели договорной работы и оценки по спецификациям.</p>");
        html.append("<p style=\"color: #666666; font-size: 12px; line-height: 1.5; margin: 0;\">")
                .append("Письмо сформировано автоматически системой uzProc.</p>");
        return html.toString();
    }

    private static String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
