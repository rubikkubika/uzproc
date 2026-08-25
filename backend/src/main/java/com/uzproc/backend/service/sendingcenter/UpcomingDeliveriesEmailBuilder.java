package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.entity.delivery.Delivery;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Формирует письмо о предстоящих поставках — по образцу письма оценки по спецификациям:
 * приветствие, короткое пояснение и таблица позиций.
 */
@Component
public class UpcomingDeliveriesEmailBuilder {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");

    /** Тема письма. */
    public String buildSubject(LocalDate from, LocalDate to, int count) {
        return "[uzProc] Предстоящие поставки " + from.format(DATE_FORMAT) + " — " + to.format(DATE_FORMAT)
                + " (" + count + ")";
    }

    /**
     * HTML-контент письма (без обёртки — обёртка добавляется через EmailService.wrapWithStandardTemplate).
     */
    public String buildContent(List<Delivery> deliveries, LocalDate from, LocalDate to) {
        StringBuilder rows = new StringBuilder();
        for (Delivery delivery : deliveries) {
            rows.append("<tr>")
                .append(td(purchaseRequestNumber(delivery)))
                .append(td(contractName(delivery)))
                .append(td(supplierName(delivery)))
                .append(tdRight(formatAmount(delivery.getAmount()) + " " + nvl(delivery.getCurrency())))
                .append(td(delivery.getDeliveryDeadline() != null
                        ? delivery.getDeliveryDeadline().format(DATE_FORMAT) : ""))
                .append(td(shipmentStatus(delivery)))
                .append("</tr>");
        }

        if (deliveries.isEmpty()) {
            rows.append("<tr><td colspan=\"6\" style=\"padding: 8px; border: 1px solid #e5e5e5; color: #999999;\">")
                .append("Предстоящих поставок за период нет")
                .append("</td></tr>");
        }

        return """
            <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
                Здравствуйте!
            </p>
            <h2 style="color: #333333; font-size: 20px; margin-bottom: 15px;">Предстоящие поставки</h2>
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
                За период с <strong>%s</strong> по <strong>%s</strong> запланировано
                <strong>%d</strong> поставок на общую сумму <strong>%s</strong>.
            </p>
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                Ниже перечислены поставки, срок которых наступает в ближайшее время.
            </p>
            <table style="width: 100%%; border-collapse: collapse; font-size: 12px; color: #333333;">
                <thead>
                    <tr style="background-color: #f5f5f5;">
                        %s%s%s%s%s%s
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
                from.format(DATE_FORMAT),
                to.format(DATE_FORMAT),
                deliveries.size(),
                formatAmount(totalAmount(deliveries)),
                th("Заявка"), th("Спецификация"), th("Поставщик"),
                th("Сумма"), th("Плановая дата"), th("Статус"),
                rows.toString()
        );
    }

    private BigDecimal totalAmount(List<Delivery> deliveries) {
        BigDecimal total = BigDecimal.ZERO;
        for (Delivery delivery : deliveries) {
            if (delivery.getAmount() != null) total = total.add(delivery.getAmount());
        }
        return total;
    }

    private String purchaseRequestNumber(Delivery delivery) {
        if (delivery.getContract() == null || delivery.getContract().getPurchaseRequestId() == null) return "";
        return String.valueOf(delivery.getContract().getPurchaseRequestId());
    }

    private String contractName(Delivery delivery) {
        if (delivery.getContract() == null) return "";
        String name = delivery.getContract().getName();
        return nvl(name != null ? name : delivery.getContract().getInnerId());
    }

    private String supplierName(Delivery delivery) {
        return delivery.getSupplier() != null ? nvl(delivery.getSupplier().getName()) : "";
    }

    private String shipmentStatus(Delivery delivery) {
        return delivery.getShipmentStatus() != null ? delivery.getShipmentStatus().getDisplayName() : "";
    }

    private String th(String text) {
        return "<th style=\"padding: 8px; border: 1px solid #e5e5e5; text-align: left; font-weight: 600;\">"
                + text + "</th>";
    }

    private String td(String text) {
        return "<td style=\"padding: 8px; border: 1px solid #e5e5e5;\">" + escape(text) + "</td>";
    }

    private String tdRight(String text) {
        return "<td style=\"padding: 8px; border: 1px solid #e5e5e5; text-align: right; white-space: nowrap;\">"
                + escape(text) + "</td>";
    }

    private String formatAmount(BigDecimal amount) {
        if (amount == null) return "0";
        return String.format("%,.0f", amount).replace(',', ' ');
    }

    private String nvl(String value) {
        return value != null ? value : "";
    }

    private String escape(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
