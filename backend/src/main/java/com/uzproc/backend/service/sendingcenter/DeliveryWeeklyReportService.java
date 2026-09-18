package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.DeliveryWeeklyReportPeriodDto;
import com.uzproc.backend.dto.sendingcenter.DeliveryWeeklyReportPreviewDto;
import com.uzproc.backend.dto.sendingcenter.DeliveryWeeklyReportSendResultDto;
import com.uzproc.backend.entity.delivery.Delivery;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.delivery.DeliveryRepository;
import com.uzproc.backend.repository.user.UserRepository;
import com.uzproc.backend.service.email.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.Arrays;
import java.util.List;

/**
 * Недельный отчёт по поставкам (центр отправки → «Поставки» → «Недельный отчёт»).
 * Период отчёта — с прошлой пятницы по последний четверг включительно; вторым блоком
 * идут те же данные за текущий месяц.
 */
@Service
public class DeliveryWeeklyReportService {

    private static final Logger logger = LoggerFactory.getLogger(DeliveryWeeklyReportService.class);

    /** ФИО получателя по умолчанию. */
    public static final String DEFAULT_RECIPIENT_FULL_NAME = "Рецко Артем";

    /** Адрес получателя по умолчанию. */
    public static final String DEFAULT_RECIPIENT_EMAIL = "a.retsko@uzum.com";

    private static final String WEEK_SECTION_TITLE = "За неделю";
    private static final String MONTH_SECTION_TITLE = "За текущий месяц";

    private final DeliveryRepository deliveryRepository;
    private final UserRepository userRepository;
    private final DeliveryWeeklyReportEmailBuilder emailBuilder;
    private final EmailService emailService;

    /** База ссылок на карточки поставок (то же окружение, что и для CSI-ссылок). */
    @Value("${app.frontend.csi-link-base-url:http://10.123.48.62}")
    private String deliveryLinkBaseUrl;

    /** Адресат регулярной рассылки отчёта (пятница, 10:00 по Ташкенту). */
    @Value("${app.delivery-weekly-report.to:o.kireeva@uzum.com}")
    private String scheduledRecipient;

    /** ФИО адресата регулярной рассылки — для журнала. */
    @Value("${app.delivery-weekly-report.to-name:Киреева Ольга}")
    private String scheduledRecipientName;

    /** Адреса в копии регулярной рассылки (Осканов, Рецко). */
    @Value("${app.delivery-weekly-report.cc:r.oskanov@uzum.com,a.retsko@uzum.com}")
    private String scheduledCc;

    public DeliveryWeeklyReportService(DeliveryRepository deliveryRepository,
                                       UserRepository userRepository,
                                       DeliveryWeeklyReportEmailBuilder emailBuilder,
                                       EmailService emailService) {
        this.deliveryRepository = deliveryRepository;
        this.userRepository = userRepository;
        this.emailBuilder = emailBuilder;
        this.emailService = emailService;
    }

    /** Предпросмотр отчёта: периоды, агрегаты и получатель по умолчанию. */
    @Transactional(readOnly = true)
    public DeliveryWeeklyReportPreviewDto getPreview() {
        LocalDate today = LocalDate.now();
        DeliveryWeeklyReportSection week = buildWeekSection(today);
        DeliveryWeeklyReportSection month = buildMonthSection(today);

        return new DeliveryWeeklyReportPreviewDto(
                toPeriodDto(week),
                toPeriodDto(month),
                defaultRecipientFullName(),
                defaultRecipientEmail(),
                emailBuilder.buildSubject(week.from(), week.to())
        );
    }

    /**
     * Отправляет недельный отчёт по поставкам одному получателю (ручная отправка из центра отправки).
     *
     * @param recipient         адрес получателя; пустой — {@link #DEFAULT_RECIPIENT_EMAIL}
     * @param recipientFullName ФИО получателя (для журнала и результата)
     */
    @Transactional(readOnly = true)
    public DeliveryWeeklyReportSendResultDto send(String recipient, String recipientFullName) {
        String to = notBlank(recipient) ? recipient.trim() : defaultRecipientEmail();
        String fullName = notBlank(recipientFullName) ? recipientFullName.trim() : defaultRecipientFullName();
        return send(to, fullName, null);
    }

    /**
     * Регулярная рассылка отчёта: адресат и копия берутся из настроек
     * ({@code app.delivery-weekly-report.to} и {@code app.delivery-weekly-report.cc}).
     */
    @Transactional(readOnly = true)
    public DeliveryWeeklyReportSendResultDto sendScheduled() {
        return send(scheduledRecipient.trim(), scheduledRecipientName.trim(), parseCc(scheduledCc));
    }

    /** Собирает отчёт за неделю и текущий месяц и отправляет письмо получателю и адресам в копии. */
    private DeliveryWeeklyReportSendResultDto send(String to, String fullName, String[] cc) {
        LocalDate today = LocalDate.now();
        DeliveryWeeklyReportSection week = buildWeekSection(today);
        DeliveryWeeklyReportSection month = buildMonthSection(today);

        String subject = emailBuilder.buildSubject(week.from(), week.to());
        String content = emailBuilder.buildContent(week, month, deliveryLinkBaseUrl);
        emailService.sendEmailWithCc(to, cc, subject, emailService.wrapWithStandardTemplate(content));

        logger.info("Delivery weekly report sent to {} ({}), cc {}: period {}..{}, "
                        + "delivered {}, overdue {}, without ESF {}",
                to, fullName, cc != null ? String.join(", ", cc) : "none", week.from(), week.to(),
                week.delivered().size(), week.overdue().size(), week.missingEsf().size());

        return new DeliveryWeeklyReportSendResultDto(true, to, fullName, subject,
                week.from(), week.to(),
                week.delivered().size(), week.overdue().size(), week.missingEsf().size());
    }

    /** Адреса копии из настройки: список через запятую; пустые значения отбрасываются. */
    private String[] parseCc(String cc) {
        if (!notBlank(cc)) {
            return null;
        }
        String[] addresses = Arrays.stream(cc.split(","))
                .map(String::trim)
                .filter(address -> !address.isEmpty())
                .toArray(String[]::new);
        return addresses.length > 0 ? addresses : null;
    }

    /** Блок за отчётную неделю: с прошлой пятницы по последний четверг включительно. */
    private DeliveryWeeklyReportSection buildWeekSection(LocalDate asOf) {
        LocalDate to = lastThursday(asOf);
        LocalDate from = to.minusDays(6);
        return buildSection(WEEK_SECTION_TITLE, from, to);
    }

    /** Блок за текущий месяц: с первого числа по сегодня. */
    private DeliveryWeeklyReportSection buildMonthSection(LocalDate asOf) {
        return buildSection(MONTH_SECTION_TITLE, asOf.withDayOfMonth(1), asOf);
    }

    /** Данные блока: поставленное, просроченное без факта и поставленное без даты ЭСФ. */
    private DeliveryWeeklyReportSection buildSection(String title, LocalDate from, LocalDate to) {
        List<Delivery> delivered = deliveryRepository
                .findByActualDeliveryDateBetweenOrderByActualDeliveryDateAsc(from, to);
        List<Delivery> overdue = deliveryRepository
                .findByPlannedDeliveryDateBetweenAndActualDeliveryDateIsNullOrderByPlannedDeliveryDateAsc(from, to);
        List<Delivery> missingEsf = delivered.stream()
                .filter(delivery -> delivery.getEsfDate() == null)
                .toList();
        return new DeliveryWeeklyReportSection(title, from, to, delivered, overdue, missingEsf);
    }

    /** Последний четверг не позже указанной даты (сегодняшний четверг тоже подходит). */
    private LocalDate lastThursday(LocalDate asOf) {
        return asOf.with(TemporalAdjusters.previousOrSame(DayOfWeek.THURSDAY));
    }

    private DeliveryWeeklyReportPeriodDto toPeriodDto(DeliveryWeeklyReportSection section) {
        return new DeliveryWeeklyReportPeriodDto(
                section.from(),
                section.to(),
                section.delivered().size(),
                section.deliveredAmount(),
                section.overdue().size(),
                section.overdueAmount(),
                section.missingEsf().size(),
                section.missingEsfAmount()
        );
    }

    /** ФИО получателя по умолчанию: из справочника пользователей, иначе — константа. */
    private String defaultRecipientFullName() {
        User user = findDefaultUser();
        return user != null ? displayName(user) : DEFAULT_RECIPIENT_FULL_NAME;
    }

    /** Адрес получателя по умолчанию: из справочника пользователей, иначе — константа. */
    private String defaultRecipientEmail() {
        User user = findDefaultUser();
        return user != null && notBlank(user.getEmail()) ? user.getEmail().trim() : DEFAULT_RECIPIENT_EMAIL;
    }

    /** Пользователь получателя по умолчанию — ищется по адресу, затем по ФИО. */
    private User findDefaultUser() {
        User byEmail = userRepository.findByEmail(DEFAULT_RECIPIENT_EMAIL).orElse(null);
        if (byEmail != null) {
            return byEmail;
        }
        List<User> byName = userRepository.searchByFuzzyName(DEFAULT_RECIPIENT_FULL_NAME, PageRequest.of(0, 1));
        return byName.isEmpty() ? null : byName.get(0);
    }

    private String displayName(User user) {
        String surname = user.getSurname() != null ? user.getSurname().trim() : "";
        String name = user.getName() != null ? user.getName().trim() : "";
        String full = (surname + " " + name).trim();
        return !full.isEmpty() ? full : user.getUsername();
    }

    private boolean notBlank(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
