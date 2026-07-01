package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.entity.specificationfeedback.SpecificationFeedbackInvitation;
import com.uzproc.backend.entity.specificationfeedback.SpecificationFeedbackItem;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

/**
 * Формирует письмо-приглашение руководителю ЦФО на оценку работы закупок по спецификациям
 * за месяц — по образцу письма оценки на заявках (CSI), но с перечнем спецификаций.
 */
@Component
public class SpecificationFeedbackEmailBuilder {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    private static final String[] MONTHS_RU = {
            "", "январь", "февраль", "март", "апрель", "май", "июнь",
            "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"
    };

    /** Тема письма. */
    public String buildSubject(SpecificationFeedbackInvitation invitation) {
        return "[uzProc] Оценка работы закупок по спецификациям — "
                + monthName(invitation.getPeriodMonth()) + " " + invitation.getPeriodYear()
                + " (ЦФО " + invitation.getCfoName() + ")";
    }

    /**
     * HTML-контент письма (без обёртки — обёртка добавляется через EmailService.wrapWithStandardTemplate).
     *
     * @param formUrl полная ссылка на форму оценки
     */
    public String buildContent(SpecificationFeedbackInvitation invitation, String formUrl) {
        String period = monthName(invitation.getPeriodMonth()) + " " + invitation.getPeriodYear();

        StringBuilder rows = new StringBuilder();
        for (SpecificationFeedbackItem item : invitation.getItems()) {
            rows.append("<tr>")
                .append(td(nvl(item.getPurchaseRequestNumber())))
                .append(td(nvl(item.getTitle())))
                .append(td(nvl(item.getPreparedBy())))
                .append(tdRight(formatAmountShort(item.getBudgetAmount()) + " " + nvl(item.getCurrency())))
                .append(td(item.getSynchronizationDate() != null
                        ? item.getSynchronizationDate().format(DATE_FORMAT) : ""))
                .append("</tr>");
        }

        return """
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
                Здравствуйте!
            </p>
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
                За период <strong>%s</strong> по ЦФО <strong>%s</strong> отдел закупок подписал
                <strong>%d</strong> спецификаций на сумму <strong>%s</strong>.
            </p>
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
                Чтобы отдел закупок работал быстрее и удобнее для вас, нам очень важно узнать ваше мнение.
                Пожалуйста, оцените работу закупок по этим спецификациям по ссылке:
            </p>
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
                Спасибо, что помогаете нам становиться лучше.
            </p>
            <p style="margin: 16px 0;">
                <a href="%s" style="display: inline-block; background-color: #2563eb; color: #ffffff;
                   text-decoration: none; padding: 10px 20px; border-radius: 6px; font-size: 14px;">
                   Оценить работу закупок
                </a>
            </p>
            <p style="color: #999999; font-size: 12px; line-height: 1.6; margin-bottom: 16px; word-break: break-all;">
                Или скопируйте ссылку: %s
            </p>
            <table style="width: 100%%; border-collapse: collapse; font-size: 12px; color: #333333;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        %s%s%s%s%s
                    </tr>
                </thead>
                <tbody>
                    %s
                </tbody>
            </table>
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 16px;">
                С уважением,<br/>Ваша команда закупок
            </p>
            """.formatted(
                period,
                invitation.getCfoName(),
                invitation.getSpecificationCount(),
                formatAmountShort(invitation.getTotalAmount()),
                formUrl,
                formUrl,
                th("№ заявки"), th("Предмет"), th("Исполнитель"), th("Сумма"), th("Дата подписания"),
                rows.toString()
            );
    }

    private String monthName(Integer month) {
        if (month == null || month < 1 || month > 12) {
            return "";
        }
        return MONTHS_RU[month];
    }

    private String th(String text) {
        return "<th style=\"text-align: left; padding: 6px 8px; border-bottom: 1px solid #dddddd;"
                + " font-weight: 600;\">" + escape(text) + "</th>";
    }

    private String td(String text) {
        return "<td style=\"padding: 6px 8px; border-bottom: 1px solid #eeeeee;\">" + escape(text) + "</td>";
    }

    private String tdRight(String text) {
        return "<td style=\"padding: 6px 8px; border-bottom: 1px solid #eeeeee; text-align: right;"
                + " white-space: nowrap;\">" + escape(text) + "</td>";
    }

    private String formatAmount(BigDecimal amount) {
        if (amount == null) {
            return "0,00";
        }
        // Явное форматирование, не зависящее от локали сервера:
        // разряды — неразрывный пробел, копейки — через запятую (две цифры).
        java.text.DecimalFormatSymbols symbols = new java.text.DecimalFormatSymbols(java.util.Locale.ROOT);
        symbols.setGroupingSeparator(' ');
        symbols.setDecimalSeparator(',');
        java.text.DecimalFormat df = new java.text.DecimalFormat("#,##0.00", symbols);
        return df.format(amount);
    }

    /** Сокращённый формат итоговой суммы: млн/млрд (две цифры после запятой). */
    private String formatAmountShort(BigDecimal amount) {
        if (amount == null) {
            return "0";
        }
        double v = amount.doubleValue();
        double abs = Math.abs(v);
        if (abs >= 1_000_000_000d) {
            return formatAmount(java.math.BigDecimal.valueOf(v / 1_000_000_000d)) + " млрд";
        }
        if (abs >= 1_000_000d) {
            return formatAmount(java.math.BigDecimal.valueOf(v / 1_000_000d)) + " млн";
        }
        return formatAmount(amount);
    }

    private String nvl(String s) {
        return s == null ? "" : s;
    }

    private String escape(String s) {
        if (s == null) {
            return "";
        }
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
