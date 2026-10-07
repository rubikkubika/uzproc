package com.uzproc.backend.service.sendingcenter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Автоотправка презентации управленческой отчётности в 6-й рабочий день месяца в 10:00 по Ташкенту
 * (за прошедший месяц). Cron срабатывает в 10:00 по будням 1–20 числа, а проверка «6-й рабочий день
 * месяца» (с учётом праздников из {@code holidays}) и защита от повторной отправки —
 * в {@link ManagementReportAutoSendingService}.
 *
 * <p>Свойства: {@code app.management-report-sending.enabled} (локально false), {@code .cron},
 * {@code .zone}, {@code .working-day}, {@code .to}, {@code .cc}.
 */
@Component
public class ManagementReportSendingScheduler {

    private static final Logger logger = LoggerFactory.getLogger(ManagementReportSendingScheduler.class);

    private final ManagementReportAutoSendingService autoSendingService;
    private final boolean enabled;
    private final ZoneId zone;

    public ManagementReportSendingScheduler(
            ManagementReportAutoSendingService autoSendingService,
            @Value("${app.management-report-sending.enabled:true}") boolean enabled,
            @Value("${app.management-report-sending.zone:Asia/Tashkent}") String zone) {
        this.autoSendingService = autoSendingService;
        this.enabled = enabled;
        this.zone = ZoneId.of(zone);
    }

    @Scheduled(
            cron = "${app.management-report-sending.cron:0 0 10 1-20 * MON-FRI}",
            zone = "${app.management-report-sending.zone:Asia/Tashkent}")
    public void sendMonthly() {
        if (!enabled) {
            logger.info("Management report auto-mailing is disabled, skipping scheduled run");
            return;
        }
        try {
            autoSendingService.runIfSendingDay(LocalDate.now(zone));
        } catch (Exception e) {
            logger.error("Scheduled management report sending failed", e);
        }
    }
}
