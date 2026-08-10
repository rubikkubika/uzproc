package com.uzproc.backend.service.purchaseplan;

import com.uzproc.backend.dto.purchaseplan.PurchasePlanVersionDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.Locale;

/**
 * Автоматическая редакция плана закупок: в последний день месяца в 23:30 создаётся новая версия
 * плана за текущий год — снимок всех строк на конец месяца.
 *
 * <p>Расписание и часовой пояс настраиваются свойствами
 * {@code app.purchase-plan.auto-version.cron} и {@code app.purchase-plan.auto-version.zone};
 * выключить можно, задав {@code app.purchase-plan.auto-version.enabled=false}.
 */
@Component
public class PurchasePlanVersionScheduler {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanVersionScheduler.class);

    private static final String CREATED_BY = "Система";

    private final PurchasePlanVersionService versionService;
    private final boolean enabled;
    private final ZoneId zone;

    public PurchasePlanVersionScheduler(
            PurchasePlanVersionService versionService,
            @Value("${app.purchase-plan.auto-version.enabled:true}") boolean enabled,
            @Value("${app.purchase-plan.auto-version.zone:Asia/Tashkent}") String zone) {
        this.versionService = versionService;
        this.enabled = enabled;
        this.zone = ZoneId.of(zone);
    }

    /**
     * Последний день месяца в 23:30 — создаём редакцию плана закупок за текущий год.
     * Cron «L» в поле дня месяца = последний день месяца.
     */
    @Scheduled(
            cron = "${app.purchase-plan.auto-version.cron:0 30 23 L * *}",
            zone = "${app.purchase-plan.auto-version.zone:Asia/Tashkent}")
    public void createMonthEndVersion() {
        if (!enabled) {
            logger.info("Auto purchase plan version is disabled, skipping month-end run");
            return;
        }
        LocalDate today = LocalDate.now(zone);
        int year = today.getYear();
        String monthName = today.getMonth().getDisplayName(TextStyle.FULL_STANDALONE, Locale.forLanguageTag("ru"));
        String description = String.format("Автоматическая редакция на конец месяца (%s %d)", monthName, year);
        try {
            PurchasePlanVersionDto version = versionService.createVersion(year, description, CREATED_BY);
            logger.info("Auto purchase plan version created: year {}, version {}, description '{}'",
                    year, version.getVersionNumber(), description);
        } catch (Exception e) {
            logger.error("Auto purchase plan version failed for year {}", year, e);
        }
    }
}
