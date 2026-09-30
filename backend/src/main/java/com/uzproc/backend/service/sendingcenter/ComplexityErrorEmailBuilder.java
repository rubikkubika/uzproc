package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.ComplexityErrorPurchaseDto;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Письмо «Ошибка сложности» — в стиле остальных писем системы: приветствие, пояснение,
 * кнопка «Создать запрос в 1С» и компактная таблица закупок со ссылками на карточки.
 */
@Component
public class ComplexityErrorEmailBuilder {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    /** Тема письма. */
    public String buildSubject(int year) {
        return "[uzProc] Не указана сложность закупок " + year + " — нужен запрос в поддержку 1С";
    }

    /**
     * HTML-контент письма (без обёртки — обёртка добавляется через EmailService.wrapWithStandardTemplate).
     *
     * @param purchaserName    ФИО закупщика (для приветствия); пусто — общее приветствие
     * @param year             год закупок
     * @param purchases        закупки без сложности
     * @param supportRequestUrl ссылка на создание запроса в поддержку 1С
     */
    public String buildContent(String purchaserName, int year,
                               List<ComplexityErrorPurchaseDto> purchases, String supportRequestUrl) {
        String greeting = purchaserName != null && !purchaserName.isBlank()
                ? "Здравствуйте, " + escape(purchaserName.trim()) + "!"
                : "Здравствуйте!";
        return """
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">%s</p>
            <h2 style="color: #333333; font-size: 20px; margin-bottom: 15px;">Не указана сложность закупок</h2>
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 12px;">
                По закупкам %d года из списка ниже (<strong>%d</strong>) в заявке не указана сложность.
                Без неё не рассчитываются плановые сроки закупки (SLA).
            </p>
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
                Сложность устанавливается в 1С — необходимо создать запрос в поддержку 1С
                и указать в нём номера заявок из таблицы и нужную сложность.
            </p>
            <div style="margin: 0 0 24px 0;">
                <a href="%s" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; font-size: 14px; font-weight: 600; text-decoration: none;">Создать запрос в 1С</a>
            </div>
            %s
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 16px;">
                С уважением,<br/>Ваша команда закупок
            </p>
            """.formatted(
                greeting,
                year,
                purchases.size(),
                escape(supportRequestUrl),
                buildTable(purchases)
        );
    }

    /** Таблица закупок: номер закупки (ссылка на карточку), заявка, наименование, ЦФО, дата. */
    private String buildTable(List<ComplexityErrorPurchaseDto> purchases) {
        StringBuilder rows = new StringBuilder();
        for (ComplexityErrorPurchaseDto purchase : purchases) {
            rows.append("<tr>")
                .append(tdLink(nvl(purchase.innerId(), "Открыть"), purchase.link()))
                .append(td(nvl(purchase.purchaseRequestInnerId(), "")))
                .append(td(nvl(purchase.name(), "")))
                .append(td(nvl(purchase.cfo(), "")))
                .append(td(purchase.creationDate() != null ? purchase.creationDate().format(DATE_FORMAT) : ""))
                .append("</tr>");
        }
        return """
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
                th("Закупка"), th("Заявка"), th("Наименование"), th("ЦФО"), th("Дата"),
                rows.toString()
        );
    }

    private String th(String text) {
        return "<th style=\"padding: 8px; border: 1px solid #e5e5e5; text-align: left; font-weight: 600;\">"
                + escape(text) + "</th>";
    }

    private String td(String text) {
        return "<td style=\"padding: 8px; border: 1px solid #e5e5e5;\">" + escape(text) + "</td>";
    }

    private String tdLink(String text, String url) {
        return "<td style=\"padding: 8px; border: 1px solid #e5e5e5; white-space: nowrap;\">"
                + "<a href=\"" + escape(url) + "\" style=\"color: #2563eb; text-decoration: none;\">"
                + escape(text) + "</a></td>";
    }

    private String nvl(String value, String fallback) {
        return value != null && !value.isBlank() ? value : fallback;
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
