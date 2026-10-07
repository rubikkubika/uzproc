package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.ManagementReportSendResultDto;
import com.uzproc.backend.service.calendar.WorkingDayService;
import com.uzproc.backend.service.scheduling.ScheduledJobRunService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;

/**
 * Автоматическая отправка презентации управленческой отчётности: в N-й (по умолчанию 6-й) рабочий
 * день месяца за прошедший месяц. Адресат и копия — из настроек {@code app.management-report-sending}.
 *
 * <p>При сбое (например, недоступен почтовый сервер) делается несколько попыток; если отчёт
 * так и не ушёл — на тестовый адрес отправляется сообщение о сбое.
 */
@Service
public class ManagementReportAutoSendingService {

    private static final Logger log = LoggerFactory.getLogger(ManagementReportAutoSendingService.class);

    /** Код задачи в журнале {@code scheduled_job_runs}. */
    public static final String JOB_NAME = "management-report-sending";

    private final ManagementReportSendingService sendingService;
    private final WorkingDayService workingDayService;
    private final ScheduledJobRunService jobRunService;

    /** Сколько раз пробуем собрать и отправить отчёт. */
    @Value("${app.management-report-sending.attempts:3}")
    private int attempts;

    /** Пауза между попытками, секунд. */
    @Value("${app.management-report-sending.retry-delay-seconds:120}")
    private long retryDelaySeconds;

    public ManagementReportAutoSendingService(ManagementReportSendingService sendingService,
                                              WorkingDayService workingDayService,
                                              ScheduledJobRunService jobRunService) {
        this.sendingService = sendingService;
        this.workingDayService = workingDayService;
        this.jobRunService = jobRunService;
    }

    /**
     * Запуск по расписанию для даты {@code today} (дата по Ташкенту).
     * Ничего не делает, если это не день отправки или отчёт за прошлый месяц уже уходил.
     *
     * @return true — отчёт отправлен этим вызовом
     */
    public boolean runIfSendingDay(LocalDate today) {
        int workingDay = sendingService.getWorkingDayNumber();
        if (!workingDayService.isNthWorkingDayOfMonth(today, workingDay)) {
            log.debug("[MgmtReportAutoSend] {} — не {}-й рабочий день месяца, пропуск", today, workingDay);
            return false;
        }
        YearMonth period = sendingService.reportPeriodFor(today);
        String periodKey = period.toString(); // YYYY-MM
        if (!jobRunService.tryClaim(JOB_NAME, periodKey)) {
            log.info("[MgmtReportAutoSend] Автоотправка за {} уже выполнялась, пропуск", periodKey);
            return false;
        }

        String lastError = null;
        int maxAttempts = Math.max(1, attempts);
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                ManagementReportSendResultDto result = sendingService.sendScheduled(period);
                String summary = "sent to " + result.recipient() + ", cc " + result.cc()
                        + ", file " + result.fileName() + ", slides " + result.slideCount()
                        + ", bytes " + result.fileSizeBytes() + ", attempt " + attempt;
                jobRunService.finish(JOB_NAME, periodKey, summary);
                log.info("[MgmtReportAutoSend] Автоотправка за {} завершена: {}", periodKey, summary);
                return true;
            } catch (Exception e) {
                lastError = e.getMessage();
                log.error("[MgmtReportAutoSend] Попытка {} из {} за {} не удалась", attempt, maxAttempts, periodKey, e);
                if (attempt < maxAttempts && !pause()) {
                    break;
                }
            }
        }

        jobRunService.finish(JOB_NAME, periodKey, "FAILED: " + lastError);
        sendingService.notifyFailure(period, lastError);
        return false;
    }

    /** Пауза перед повтором; false — поток прерван, повторять не нужно. */
    private boolean pause() {
        try {
            Thread.sleep(Math.max(0, retryDelaySeconds) * 1000L);
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        }
    }
}
