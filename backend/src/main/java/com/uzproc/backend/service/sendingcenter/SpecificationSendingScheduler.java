package com.uzproc.backend.service.sendingcenter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;

/**
 * Автоотправка писем «Центр отправки → Спецификации» в первый рабочий день месяца в 10:00 по Ташкенту
 * (за прошедший месяц). Cron срабатывает в 10:00 по будням 1–10 числа, а проверка
 * «первый рабочий день месяца» (с учётом праздников из {@code holidays}) и защита от повторной
 * отправки — в {@link SpecificationAutoSendingService}.
 *
 * <p>Свойства: {@code app.specification-sending.enabled} (локально false), {@code .cron}, {@code .zone}.
 */
@Component
public class SpecificationSendingScheduler {

    private static final Logger logger = LoggerFactory.getLogger(SpecificationSendingScheduler.class);

    private final SpecificationAutoSendingService autoSendingService;
    private final boolean enabled;
    private final ZoneId zone;

    public SpecificationSendingScheduler(
            SpecificationAutoSendingService autoSendingService,
            @Value("${app.specification-sending.enabled:true}") boolean enabled,
            @Value("${app.specification-sending.zone:Asia/Tashkent}") String zone) {
        this.autoSendingService = autoSendingService;
        this.enabled = enabled;
        this.zone = ZoneId.of(zone);
    }

    @Scheduled(
            cron = "${app.specification-sending.cron:0 0 10 1-10 * MON-FRI}",
            zone = "${app.specification-sending.zone:Asia/Tashkent}")
    public void sendMonthly() {
        if (!enabled) {
            logger.info("Specification sending auto-mailing is disabled, skipping scheduled run");
            return;
        }
        try {
            autoSendingService.runIfFirstWorkingDay(LocalDate.now(zone));
        } catch (Exception e) {
            logger.error("Scheduled specification sending failed", e);
        }
    }
}
