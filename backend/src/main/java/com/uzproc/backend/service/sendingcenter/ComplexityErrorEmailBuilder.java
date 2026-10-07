package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.ComplexityErrorLinkedPurchaseDto;
import com.uzproc.backend.dto.sendingcenter.ComplexityErrorRequestDto;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Письмо «Ошибка сложности» — в стиле остальных писем системы: приветствие, пояснение,
 * кнопка «Создать запрос в 1С» и компактная таблица заявок со ссылками на карточки.
 */
@Component
public class ComplexityErrorEmailBuilder {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    /** Тема письма. */
    public String buildSubject(int year) {
        return "[uzProc] Не указана сложность заявок " + year + " — нужен запрос в поддержку 1С";
    }

    /**
     * HTML-контент письма (без обёртки — обёртка добавляется через EmailService.wrapWithStandardTemplate).
     *
     * @param purchaserName    ФИО закупщика (для приветствия); пусто — общее приветствие
     * @param year             год заявок
     * @param requests         заявки без сложности
     * @param supportRequestUrl ссылка на создание запроса в поддержку 1С
     */
    public String buildContent(String purchaserName, int year,
                               List<ComplexityErrorRequestDto> requests, String supportRequestUrl) {
        String greeting = purchaserName != null && !purchaserName.isBlank()
                ? "Здравствуйте, " + escape(purchaserName.trim()) + "!"
                : "Здравствуйте!";
        return """
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">%s</p>
            <h2 style="color: #333333; font-size: 20px; margin-bottom: 15px;">Не указана сложность заявок</h2>
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 12px;">
                У <strong>%d</strong> заявок %d года из списка ниже не указана сложность.
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
            %s
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 16px;">
                С уважением,<br/>Ваша команда закупок
            </p>
            """.formatted(
                greeting,
                requests.size(),
                year,
                escape(supportRequestUrl),
                buildRequestText(requests),
                buildTable(requests)
        );
    }

    /**
     * Пометка в начале тестового письма: кому ушло бы настоящее письмо.
     *
     * @param purchaserName  ФИО закупщика
     * @param purchaserEmail адрес закупщика (может быть null)
     */
    public String buildTestNotice(String purchaserName, String purchaserEmail) {
        return """
            <div style="background-color: #fff7e6; border: 1px solid #f5c26b; border-radius: 6px; padding: 10px 12px; margin-bottom: 16px; color: #7a4b00; font-size: 13px; line-height: 1.5;">
                <strong>Тестовое письмо.</strong> Было бы отправлено: %s &lt;%s&gt;
            </div>
            """.formatted(escape(nvl(purchaserName, "—")), escape(nvl(purchaserEmail, "адрес не найден")));
    }

    /**
     * Готовый текст для запроса в поддержку 1С — моноширинный блок на сером фоне, который удобно
     * скопировать в форму. Место для сложности подсвечено жёлтым: его заполняет сам закупщик.
     */
    private String buildRequestText(List<ComplexityErrorRequestDto> requests) {
        StringBuilder text = new StringBuilder();
        if (requests.size() == 1) {
            text.append("Добрый день! Прошу установить сложность в заявке на закупку № ")
                .append(escape(requestNumber(requests.get(0))))
                .append(" — сложность: ").append(PLACEHOLDER_HTML).append(".");
        } else {
            text.append("Добрый день! Прошу установить сложность в заявках на закупку:");
            for (ComplexityErrorRequestDto request : requests) {
                text.append("<br/>Заявка № ").append(escape(requestNumber(request)))
                    .append(" — сложность: ").append(PLACEHOLDER_HTML);
            }
        }
        return """
            <p style="color: #333333; font-size: 14px; font-weight: 600; margin: 0 0 6px 0;">Текст для запроса в 1С — скопируйте в форму:</p>
            <div style="background-color: #f5f5f5; border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px; margin: 0 0 24px 0; font-family: Consolas, 'Courier New', monospace; font-size: 13px; line-height: 1.7; color: #333333;">%s</div>
            """.formatted(text);
    }

    /** Подсвеченное место, куда закупщик вписывает сложность. */
    private static final String PLACEHOLDER_HTML =
            "<span style=\"background-color: #fff176; padding: 0 3px;\">[укажите сложность]</span>";

    /** Номер заявки для письма: короткий номер (id_purchase_request), а если его нет — inner_id или ID в системе. */
    private String requestNumber(ComplexityErrorRequestDto request) {
        if (request.requestNumber() != null) {
            return String.valueOf(request.requestNumber());
        }
        return nvl(request.innerId(), String.valueOf(request.id()));
    }

    /** Таблица заявок: номер заявки (ссылка на карточку), наименование, ЦФО, статус, дата, закупка. */
    private String buildTable(List<ComplexityErrorRequestDto> requests) {
        StringBuilder rows = new StringBuilder();
        for (ComplexityErrorRequestDto request : requests) {
            rows.append("<tr>")
                .append(tdLink(requestNumber(request), request.link()))
                .append(td(nvl(request.name(), "")))
                .append(td(nvl(request.cfo(), "")))
                .append(td(nvl(request.status(), "")))
                .append(td(request.creationDate() != null ? request.creationDate().format(DATE_FORMAT) : ""))
                .append(tdPurchases(request.purchases()))
                .append("</tr>");
        }
        return """
            <table style="width: 100%%; border-collapse: collapse; font-size: 12px; color: #333333; margin-bottom: 18px;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        %s%s%s%s%s%s
                    </tr>
                </thead>
                <tbody>
                    %s
                </tbody>
            </table>
            """.formatted(
                th("Заявка"), th("Наименование"), th("ЦФО"), th("Статус"), th("Дата"), th("Закупка"),
                rows.toString()
        );
    }

    /** Ячейка со связанными закупками (ссылками); пусто — закупки ещё нет. */
    private String tdPurchases(List<ComplexityErrorLinkedPurchaseDto> purchases) {
        if (purchases == null || purchases.isEmpty()) {
            return td("—");
        }
        StringBuilder links = new StringBuilder();
        for (ComplexityErrorLinkedPurchaseDto purchase : purchases) {
            if (links.length() > 0) links.append("<br/>");
            links.append("<a href=\"").append(escape(purchase.link()))
                 .append("\" style=\"color: #2563eb; text-decoration: none;\">")
                 .append(escape(nvl(purchase.innerId(), "Открыть"))).append("</a>");
        }
        return "<td style=\"padding: 8px; border: 1px solid #e5e5e5; white-space: nowrap;\">" + links + "</td>";
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
