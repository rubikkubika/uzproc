package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.ManagementReportSendResultDto;
import com.uzproc.backend.dto.sendingcenter.ManagementReportSendingInfoDto;
import com.uzproc.backend.entity.scheduling.ScheduledJobRun;
import com.uzproc.backend.repository.scheduling.ScheduledJobRunRepository;
import com.uzproc.backend.service.calendar.WorkingDayService;
import com.uzproc.backend.service.email.EmailService;
import com.uzproc.backend.service.mrpresentation.MrPresentationPdfRenderer;
import com.uzproc.backend.service.mrpresentation.MrPresentationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneId;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

/**
 * Центр отправки → «Управленческая отчётность»: письмо с презентацией управленческой отчётности (PDF).
 *
 * <p>Презентация — та же, что формируется кнопкой «Презентация PDF» на странице управленческой
 * отчётности; файл собирает бэкенд (см. {@link MrPresentationService}).
 * Регулярная рассылка — в N-й рабочий день месяца за прошедший месяц
 * (см. {@link ManagementReportAutoSendingService}); тестовая — кнопкой, только на тестовый адрес.
 */
@Service
public class ManagementReportSendingService {

    private static final Logger logger = LoggerFactory.getLogger(ManagementReportSendingService.class);

    private static final String PDF_CONTENT_TYPE = "application/pdf";
    private static final String SEND_TIME = "10:00";

    private final MrPresentationService presentationService;
    private final ManagementReportEmailBuilder emailBuilder;
    private final EmailService emailService;
    private final WorkingDayService workingDayService;
    private final ScheduledJobRunRepository jobRunRepository;

    @Value("${app.management-report-sending.enabled:true}")
    private boolean scheduleEnabled;

    @Value("${app.management-report-sending.zone:Asia/Tashkent}")
    private String zone;

    /** Номер рабочего дня месяца, в который уходит отчёт. */
    @Value("${app.management-report-sending.working-day:6}")
    private int workingDayNumber;

    /** Адресат регулярной рассылки (Осканов). */
    @Value("${app.management-report-sending.to:r.oskanov@uzum.com}")
    private String scheduledRecipient;

    @Value("${app.management-report-sending.to-name:Осканов Руслан}")
    private String scheduledRecipientName;

    /** Адреса в копии регулярной рассылки (Рецко). */
    @Value("${app.management-report-sending.cc:a.retsko@uzum.com}")
    private String scheduledCc;

    /** Адрес тестовой отправки (Рецко): письмо уходит только сюда, без копии. */
    @Value("${app.management-report-sending.test-recipient:a.retsko@uzum.com}")
    private String testRecipient;

    public ManagementReportSendingService(MrPresentationService presentationService,
                                          ManagementReportEmailBuilder emailBuilder,
                                          EmailService emailService,
                                          WorkingDayService workingDayService,
                                          ScheduledJobRunRepository jobRunRepository) {
        this.presentationService = presentationService;
        this.emailBuilder = emailBuilder;
        this.emailService = emailService;
        this.workingDayService = workingDayService;
        this.jobRunRepository = jobRunRepository;
    }

    public int getWorkingDayNumber() {
        return workingDayNumber;
    }

    public String getTestRecipient() {
        return testRecipient != null ? testRecipient.trim() : "";
    }

    /** Отчётный период для даты отправки — прошедший месяц. */
    public YearMonth reportPeriodFor(LocalDate date) {
        return YearMonth.from(date).minusMonths(1);
    }

    /** Сведения для центра отправки: период, получатели, расписание и отметка об автоотправке. */
    public ManagementReportSendingInfoDto getInfo() {
        LocalDate today = LocalDate.now(ZoneId.of(zone));
        YearMonth period = reportPeriodFor(today);
        Optional<ScheduledJobRun> run = jobRunRepository.findByJobNameAndPeriodKey(
                ManagementReportAutoSendingService.JOB_NAME, period.toString());

        return new ManagementReportSendingInfoDto(
                period.getYear(),
                period.getMonthValue(),
                emailBuilder.periodLabel(period),
                emailBuilder.buildSubject(period),
                scheduledRecipient.trim(),
                scheduledRecipientName.trim(),
                Arrays.asList(parseAddresses(scheduledCc)),
                getTestRecipient(),
                scheduleEnabled,
                workingDayNumber,
                SEND_TIME,
                zone,
                nextSendDate(today, run.isPresent()),
                run.map(r -> r.getFinishedAt() != null ? r.getFinishedAt() : r.getStartedAt()).orElse(null),
                run.map(ScheduledJobRun::getSummary).orElse(null)
        );
    }

    /**
     * Ближайшая дата отправки: N-й рабочий день текущего месяца, а если он прошёл
     * (или отчёт за период уже уходил) — N-й рабочий день следующего.
     */
    private LocalDate nextSendDate(LocalDate today, boolean alreadyRunThisMonth) {
        YearMonth current = YearMonth.from(today);
        LocalDate thisMonth = workingDayService.nthWorkingDayOfMonth(current, workingDayNumber);
        if (thisMonth != null && !thisMonth.isBefore(today) && !alreadyRunThisMonth) {
            return thisMonth;
        }
        return workingDayService.nthWorkingDayOfMonth(current.plusMonths(1), workingDayNumber);
    }

    /**
     * Тестовая отправка: презентация за прошедший месяц уходит только на тестовый адрес,
     * без копии и без отметки об автоотправке.
     */
    public ManagementReportSendResultDto sendTest() {
        String to = getTestRecipient();
        if (to.isEmpty()) {
            throw new IllegalArgumentException(
                    "Не задан адрес тестовой отправки (app.management-report-sending.test-recipient)");
        }
        YearMonth period = reportPeriodFor(LocalDate.now(ZoneId.of(zone)));
        String[] cc = parseAddresses(scheduledCc);
        String note = "Тестовая отправка. По расписанию (" + workingDayNumber + "-й рабочий день месяца, "
                + SEND_TIME + " по Ташкенту) письмо получит " + scheduledRecipientName.trim()
                + " (" + scheduledRecipient.trim() + ")"
                + (cc.length > 0 ? ", в копии: " + String.join(", ", cc) : "") + ".";
        return send(period, to, null, emailBuilder.buildTestSubject(period), note);
    }

    /** Регулярная рассылка за период: адресат и копия — из настроек. */
    public ManagementReportSendResultDto sendScheduled(YearMonth period) {
        return send(period, scheduledRecipient.trim(), parseAddresses(scheduledCc),
                emailBuilder.buildSubject(period), null);
    }

    /** Собирает презентацию за период и отправляет её письмом с вложением. */
    private ManagementReportSendResultDto send(YearMonth period, String to, String[] cc,
                                               String subject, String testNote) {
        MrPresentationPdfRenderer.Result report = presentationService.render(period.getYear(), period.getMonthValue());
        String content = emailBuilder.buildContent(period, report.slideCount(), testNote);
        String[] copy = cc != null && cc.length > 0 ? cc : null;

        emailService.sendEmailWithAttachment(to, copy, subject, emailService.wrapWithStandardTemplate(content),
                report.fileName(), report.pdf(), PDF_CONTENT_TYPE);

        logger.info("Management report for {} sent to {}, cc {}: {} ({} slides, {} bytes)",
                period, to, copy != null ? String.join(", ", copy) : "none",
                report.fileName(), report.slideCount(), report.pdf().length);

        return new ManagementReportSendResultDto(
                true,
                to,
                copy != null ? List.of(copy) : List.of(),
                subject,
                period.getYear(),
                period.getMonthValue(),
                report.fileName(),
                report.slideCount(),
                report.pdf().length
        );
    }

    /** Отправляет на тестовый адрес сообщение о сбое автоотправки (отчёт адресатам не ушёл). */
    public void notifyFailure(YearMonth period, String error) {
        String to = getTestRecipient();
        if (to.isEmpty()) {
            return;
        }
        String content = "<p style=\"color: #333333; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;\">"
                + "Автоотправка управленческой отчётности за <strong>" + emailBuilder.periodLabel(period)
                + "</strong> не выполнена — письмо адресатам не ушло.</p>"
                + "<p style=\"color: #333333; font-size: 14px; line-height: 1.6; margin: 0 0 12px 0;\">Причина: "
                + escape(error) + "</p>"
                + "<p style=\"color: #666666; font-size: 12px; line-height: 1.5; margin: 0;\">"
                + "Повторной попытки по расписанию не будет. Сформируйте презентацию кнопкой «Презентация PDF» "
                + "на странице управленческой отчётности и отправьте вручную.</p>";
        try {
            emailService.sendEmail(to, "[uzProc] Не отправлена управленческая отчётность за "
                    + emailBuilder.periodLabel(period), emailService.wrapWithStandardTemplate(content));
        } catch (Exception e) {
            logger.error("Failed to send management report failure notice to {}", to, e);
        }
    }

    private static String[] parseAddresses(String raw) {
        if (raw == null || raw.isBlank()) {
            return new String[0];
        }
        return Arrays.stream(raw.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);
    }

    private static String escape(String value) {
        return value == null ? "" : value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
