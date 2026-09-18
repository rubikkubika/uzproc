package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.DeliveryWeeklyReportSendResultDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Регулярная рассылка недельного отчёта по поставкам: каждую пятницу в 10:00 по Ташкенту
 * за период с прошлой пятницы по прошедший четверг включительно.
 *
 * <p>Расписание и часовой пояс настраиваются свойствами
 * {@code app.delivery-weekly-report.cron} и {@code app.delivery-weekly-report.zone};
 * выключить можно, задав {@code app.delivery-weekly-report.enabled=false}.
 * Получатель и копия — {@code app.delivery-weekly-report.to} и {@code app.delivery-weekly-report.cc}.
 */
@Component
public class DeliveryWeeklyReportScheduler {

    private static final Logger logger = LoggerFactory.getLogger(DeliveryWeeklyReportScheduler.class);

    private final DeliveryWeeklyReportService weeklyReportService;
    private final boolean enabled;

    public DeliveryWeeklyReportScheduler(
            DeliveryWeeklyReportService weeklyReportService,
            @Value("${app.delivery-weekly-report.enabled:true}") boolean enabled) {
        this.weeklyReportService = weeklyReportService;
        this.enabled = enabled;
    }

    /** Пятница, 10:00 по Ташкенту — отправляем отчёт по поставкам за прошедшую неделю. */
    @Scheduled(
            cron = "${app.delivery-weekly-report.cron:0 0 10 * * FRI}",
            zone = "${app.delivery-weekly-report.zone:Asia/Tashkent}")
    public void sendWeeklyReport() {
        if (!enabled) {
            logger.info("Delivery weekly report mailing is disabled, skipping scheduled run");
            return;
        }
        try {
            DeliveryWeeklyReportSendResultDto result = weeklyReportService.sendScheduled();
            logger.info("Scheduled delivery weekly report sent to {}: period {}..{}",
                    result.recipient(), result.periodFrom(), result.periodTo());
        } catch (Exception e) {
            logger.error("Scheduled delivery weekly report failed", e);
        }
    }
}
