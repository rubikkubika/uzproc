package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.supplier.Supplier;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Тема и текст письма «Оценка закупки» — приглашения инициатора оценить работу закупок по заявке (CSI).
 * Текст — простой (не HTML): его показывают в окне отправки, где закупщик может поправить письмо.
 */
@Component
public class CsiInvitationEmailBuilder {

    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final String DEFAULT_DOCUMENT_FORM = "Договор";

    public String buildSubject(PurchaseRequest request) {
        return "Об обратной связи по заявке № " + valueOrEmpty(request.getIdPurchaseRequest());
    }

    /**
     * @param request         заявка
     * @param signedContracts подписанные договоры по закупке (может быть пусто — блок не выводится)
     * @param csiLink         персональная ссылка на форму оценки
     */
    public String buildText(PurchaseRequest request, List<Contract> signedContracts, String csiLink) {
        StringBuilder text = new StringBuilder();
        text.append("Здравствуйте!\n\n");
        text.append("Недавно мы завершили работу по вашей заявке № ")
                .append(valueOrEmpty(request.getIdPurchaseRequest()))
                .append(" на ").append(clean(request.getName())).append(".\n\n");

        if (signedContracts != null && !signedContracts.isEmpty()) {
            text.append("По закупке подписаны договоры:\n");
            int index = 1;
            for (Contract contract : signedContracts) {
                text.append(index++).append(". ").append(contractLine(contract)).append("\n");
            }
            text.append("\n");
        }

        text.append("Чтобы отдел закупок работал быстрее и удобнее для вас, нам очень важно узнать ваше мнение.\n\n");
        text.append("Пожалуйста, уделите минутку и оцените качество нашего сервиса по ссылке:\n");
        text.append(csiLink).append("\n\n");
        text.append("Ссылка персональная и доступна для заполнения один раз.\n\n");
        text.append("Спасибо, что помогаете нам становиться лучше.\n\n");
        text.append("С уважением,\nВаша команда закупок");
        return text.toString();
    }

    /** «Договор № 0000-0000058390 — <название>; поставщик: …; дата регистрации: 30.09.2026». */
    private String contractLine(Contract contract) {
        String form = clean(contract.getDocumentForm());
        StringBuilder line = new StringBuilder(form.isEmpty() ? DEFAULT_DOCUMENT_FORM : form);
        if (!clean(contract.getInnerId()).isEmpty()) {
            line.append(" № ").append(clean(contract.getInnerId()));
        }
        String name = clean(contract.getName()).isEmpty() ? clean(contract.getTitle()) : clean(contract.getName());
        if (!name.isEmpty()) {
            line.append(" — ").append(name);
        }
        String suppliers = contract.getSuppliers() == null ? "" : contract.getSuppliers().stream()
                .map(Supplier::getName)
                .filter(Objects::nonNull)
                .map(CsiInvitationEmailBuilder::clean)
                .filter(s -> !s.isEmpty())
                .sorted()
                .collect(Collectors.joining(", "));
        if (!suppliers.isEmpty()) {
            line.append("; поставщик: ").append(suppliers);
        }
        line.append("; дата регистрации: ").append(contract.getRegistrationDate() != null
                ? contract.getRegistrationDate().format(DATE_FORMAT)
                : "не указана");
        return line.toString();
    }

    private static String valueOrEmpty(Object value) {
        return value != null ? String.valueOf(value) : "";
    }

    private static String clean(String value) {
        return value == null ? "" : value.replaceAll("\\s+", " ").trim();
    }
}
