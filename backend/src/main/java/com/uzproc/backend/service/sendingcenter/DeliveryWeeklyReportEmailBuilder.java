package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.entity.delivery.Delivery;
import com.uzproc.backend.service.delivery.DeliverySpecifications;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Формирует письмо недельного отчёта по поставкам — в стиле остальных писем системы:
 * приветствие, блок со сводкой за период и таблицы проблемных поставок со ссылками на карточки.
 * Блок «С начала года» — без таблиц: только цифры и ссылки, открывающие списки в разделе «Поставки».
 */
@Component
public class DeliveryWeeklyReportEmailBuilder {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private static final BigDecimal THOUSAND = new BigDecimal("1000");
    private static final BigDecimal MILLION = new BigDecimal("1000000");
    private static final BigDecimal BILLION = new BigDecimal("1000000000");

    /** Тема письма: период отчётной недели (с прошлой пятницы по текущий четверг). */
    public String buildSubject(LocalDate from, LocalDate to) {
        return "[uzProc] Отчёт по поставкам " + from.format(DATE_FORMAT) + " — " + to.format(DATE_FORMAT);
    }

    /**
     * HTML-контент письма (без обёртки — обёртка добавляется через EmailService.wrapWithStandardTemplate).
     *
     * @param week    блок за отчётную неделю
     * @param month   блок за текущий месяц
     * @param year    блок с начала года (сводка без таблиц)
     * @param baseUrl база ссылок на карточки поставок
     */
    public String buildContent(DeliveryWeeklyReportSection week,
                               DeliveryWeeklyReportSection month,
                               DeliveryWeeklyReportSection year,
                               String baseUrl) {
        return """
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
                Здравствуйте!
            </p>
            <h2 style="color: #333333; font-size: 20px; margin-bottom: 15px;">Отчёт по поставкам</h2>
            %s
            %s
            %s
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 16px;">
                С уважением,<br/>Ваша команда закупок
            </p>
            """.formatted(
                buildSection(week, baseUrl),
                buildSection(month, baseUrl),
                buildSummarySection(year, baseUrl)
        );
    }

    /** Один блок отчёта: сводка «поставлено» + таблицы просроченных и поставок без даты ЭСФ. */
    private String buildSection(DeliveryWeeklyReportSection section, String baseUrl) {
        return """
            <div style="margin-bottom: 28px;">
                <h3 style="color: #333333; font-size: 17px; margin: 0 0 10px 0;">%s</h3>
                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                    За период с <strong>%s</strong> по <strong>%s</strong> поставлено
                    <strong>%d</strong> поставок на общую сумму <strong>%s</strong>.
                </p>
                %s
                %s
            </div>
            """.formatted(
                escape(section.title()),
                section.from().format(DATE_FORMAT),
                section.to().format(DATE_FORMAT),
                section.delivered().size(),
                formatAmount(section.deliveredAmount()),
                buildOverdueTable(section, baseUrl),
                buildMissingEsfTable(section, baseUrl)
        );
    }

    /**
     * Блок-сводка без таблиц: сколько поставлено и на какую сумму, затем просрочка и поставки без ЭСФ —
     * каждая строкой с количеством, суммой и ссылкой «Открыть список» на отфильтрованный раздел «Поставки».
     */
    private String buildSummarySection(DeliveryWeeklyReportSection section, String baseUrl) {
        return """
            <div style="margin-bottom: 28px;">
                <h3 style="color: #333333; font-size: 17px; margin: 0 0 10px 0;">%s</h3>
                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                    За период с <strong>%s</strong> по <strong>%s</strong> поставлено
                    <strong>%d</strong> поставок на общую сумму <strong>%s</strong>.
                </p>
                %s
                %s
            </div>
            """.formatted(
                escape(section.title()),
                section.from().format(DATE_FORMAT),
                section.to().format(DATE_FORMAT),
                section.delivered().size(),
                formatAmount(section.deliveredAmount()),
                buildSummaryLine("Просрочено — не заполнена фактическая дата поставки",
                        section.overdue(), section.overdueAmount(),
                        "Просроченных поставок за период нет",
                        sliceLink(baseUrl, DeliverySpecifications.REPORT_SLICE_OVERDUE, section)),
                buildSummaryLine("Нет ЭСФ — не заполнена дата ЭСФ",
                        section.missingEsf(), section.missingEsfAmount(),
                        "Поставок без даты ЭСФ за период нет",
                        sliceLink(baseUrl, DeliverySpecifications.REPORT_SLICE_NO_ESF, section))
        );
    }

    /** Строка сводки: заголовок, количество и сумма + ссылка на список (если список не пуст). */
    private String buildSummaryLine(String title, List<Delivery> deliveries, BigDecimal totalAmount,
                                    String emptyText, String url) {
        if (deliveries.isEmpty()) {
            return """
                <p style="color: #333333; font-size: 14px; font-weight: 600; margin: 0 0 6px 0;">%s</p>
                <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 14px 0;">%s</p>
                """.formatted(escape(title), escape(emptyText));
        }
        return """
            <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 0 0 14px 0;">
                <strong>%s</strong> — %d на сумму %s<br/>
                <a href="%s" style="color: #2563eb; text-decoration: none;">Открыть список →</a>
            </p>
            """.formatted(escape(title), deliveries.size(), formatAmount(totalAmount), escape(url));
    }

    /** Ссылка на раздел «Поставки», отфильтрованный по срезу отчёта за период блока. */
    private String sliceLink(String baseUrl, String slice, DeliveryWeeklyReportSection section) {
        String base = baseUrl != null ? baseUrl.replaceAll("/+$", "") : "";
        return base + "/?tab=delivery&reportSlice=" + slice
                + "&reportFrom=" + section.from() + "&reportTo=" + section.to();
    }

    /** Таблица просроченных поставок: было запланировано, но фактическая дата не заполнена. */
    private String buildOverdueTable(DeliveryWeeklyReportSection section, String baseUrl) {
        return buildTable(
                "Запланировано, но просрочено — не заполнена фактическая дата поставки",
                section.overdue(),
                section.overdueAmount(),
                "Дедлайн",
                "Просроченных поставок за период нет",
                baseUrl,
                DeliveryWeeklyReportEmailBuilder::deadline
        );
    }

    /** Таблица поставленного без даты ЭСФ. */
    private String buildMissingEsfTable(DeliveryWeeklyReportSection section, String baseUrl) {
        return buildTable(
                "Не заполнена дата ЭСФ",
                section.missingEsf(),
                section.missingEsfAmount(),
                "Дата поставки",
                "Поставок без даты ЭСФ за период нет",
                baseUrl,
                Delivery::getActualDeliveryDate
        );
    }

    /** Общая разметка таблицы проблемных поставок: сумма, предмет, дата и ссылка на карточку. */
    private String buildTable(String title,
                              List<Delivery> deliveries,
                              BigDecimal totalAmount,
                              String dateColumnTitle,
                              String emptyText,
                              String baseUrl,
                              DeliveryDateAccessor dateAccessor) {
        if (deliveries.isEmpty()) {
            return """
                <p style="color: #333333; font-size: 14px; font-weight: 600; margin: 0 0 6px 0;">%s</p>
                <p style="color: #999999; font-size: 13px; line-height: 1.6; margin: 0 0 18px 0;">%s</p>
                """.formatted(escape(title), escape(emptyText));
        }

        StringBuilder rows = new StringBuilder();
        for (Delivery delivery : deliveries) {
            LocalDate date = dateAccessor.get(delivery);
            rows.append("<tr>")
                .append(tdRight(formatAmount(delivery.getAmount()) + " " + nvl(delivery.getCurrency())))
                .append(td(subject(delivery)))
                .append(td(supplierName(delivery)))
                .append(td(date != null ? date.format(DATE_FORMAT) : ""))
                .append(tdLink(deliveryLink(delivery, baseUrl)))
                .append("</tr>");
        }

        return """
            <p style="color: #333333; font-size: 14px; font-weight: 600; margin: 0 0 6px 0;">%s — %d на сумму %s</p>
            <table style="width: 100%%; border-collapse: collapse; font-size: 12px; color: #333333; margin-bottom: 18px;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        %s%s%s%s%s
                    </tr>
                </thead>
                <tbody>
                    %s
                </tbody>
            </table>
            """.formatted(
                escape(title),
                deliveries.size(),
                formatAmount(totalAmount),
                th("Сумма"), th("Предмет"), th("КА"), th(dateColumnTitle), th("Поставка"),
                rows.toString()
        );
    }

    /** Дедлайн поставки; если он не заполнен — плановая дата. */
    private static LocalDate deadline(Delivery delivery) {
        return delivery.getDeliveryDeadline() != null
                ? delivery.getDeliveryDeadline() : delivery.getPlannedDeliveryDate();
    }

    /** Ссылка, открывающая карточку конкретной поставки. */
    private String deliveryLink(Delivery delivery, String baseUrl) {
        String base = baseUrl != null ? baseUrl.replaceAll("/+$", "") : "";
        return base + "/?tab=delivery&deliveryId=" + delivery.getId();
    }

    /** Контрагент (КА) — поставщик по поставке. */
    private String supplierName(Delivery delivery) {
        return delivery.getSupplier() != null ? nvl(delivery.getSupplier().getName()) : "";
    }

    /** Предмет: предмет договора, а если он пуст — наименование договора (как в таблице поставок). */
    private String subject(Delivery delivery) {
        if (delivery.getContract() == null) return "";
        String subject = delivery.getContract().getSubject();
        if (subject != null && !subject.trim().isEmpty()) return subject;
        String name = delivery.getContract().getName();
        return nvl(name != null ? name : delivery.getContract().getInnerId());
    }

    private String th(String text) {
        return "<th style=\"padding: 8px; border: 1px solid #e5e5e5; text-align: left; font-weight: 600;\">"
                + escape(text) + "</th>";
    }

    private String td(String text) {
        return "<td style=\"padding: 8px; border: 1px solid #e5e5e5;\">" + escape(text) + "</td>";
    }

    private String tdRight(String text) {
        return "<td style=\"padding: 8px; border: 1px solid #e5e5e5; text-align: right; white-space: nowrap;\">"
                + escape(text) + "</td>";
    }

    private String tdLink(String url) {
        return "<td style=\"padding: 8px; border: 1px solid #e5e5e5; white-space: nowrap;\">"
                + "<a href=\"" + escape(url) + "\" style=\"color: #2563eb; text-decoration: none;\">Открыть</a></td>";
    }

    /** Сумма в сокращённом виде: тыс. / млн / млрд (до двух знаков после запятой). */
    private String formatAmount(BigDecimal amount) {
        if (amount == null) return "0";
        BigDecimal abs = amount.abs();
        if (abs.compareTo(BILLION) >= 0) return scaled(amount, BILLION) + " млрд";
        if (abs.compareTo(MILLION) >= 0) return scaled(amount, MILLION) + " млн";
        if (abs.compareTo(THOUSAND) >= 0) return scaled(amount, THOUSAND) + " тыс.";
        return scaled(amount, BigDecimal.ONE);
    }

    /** Значение в выбранных единицах: не больше двух знаков, без хвостовых нулей. */
    private String scaled(BigDecimal amount, BigDecimal unit) {
        BigDecimal value = amount.divide(unit, 2, RoundingMode.HALF_UP).stripTrailingZeros();
        return value.toPlainString().replace('.', ',');
    }

    private String nvl(String value) {
        return value != null ? value : "";
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    /** Из какой даты поставки берётся колонка таблицы. */
    private interface DeliveryDateAccessor {
        LocalDate get(Delivery delivery);
    }
}
