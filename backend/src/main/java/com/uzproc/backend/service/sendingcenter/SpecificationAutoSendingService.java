package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.CfoSpecificationSendingDto;
import com.uzproc.backend.service.calendar.WorkingDayService;
import com.uzproc.backend.service.scheduling.ScheduledJobRunService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

/**
 * Автоматическая отправка писем «Центр отправки → Спецификации» (оценка спецификаций руководителями ЦФО).
 *
 * <p>В первый рабочий день месяца отправляет письма за прошедший месяц по всем ЦФО,
 * которым ещё не отправляли (как если бы пользователь открыл вкладку — там по умолчанию
 * выбран прошлый месяц — и нажал «Отправить» в каждой строке без отметки «Отправлено»).
 * Отправка идёт через тот же {@link SpecificationSendingService#send}, что и ручная кнопка,
 * поэтому приглашение, снимок спецификаций, получатель и отметка «Отправлено» — те же.
 */
@Service
public class SpecificationAutoSendingService {

    private static final Logger log = LoggerFactory.getLogger(SpecificationAutoSendingService.class);

    /** Код задачи в журнале {@code scheduled_job_runs}. */
    public static final String JOB_NAME = "specification-sending";

    private final SpecificationSendingService sendingService;
    private final WorkingDayService workingDayService;
    private final ScheduledJobRunService jobRunService;

    public SpecificationAutoSendingService(SpecificationSendingService sendingService,
                                           WorkingDayService workingDayService,
                                           ScheduledJobRunService jobRunService) {
        this.sendingService = sendingService;
        this.workingDayService = workingDayService;
        this.jobRunService = jobRunService;
    }

    /** Итог автоматической отправки. */
    public record Result(YearMonth period, boolean executed, int sent, int skippedAlreadySent,
                         int skippedNoRecipient, List<String> errors) {
        public String summary() {
            return "period=" + period + ", sent=" + sent + ", alreadySent=" + skippedAlreadySent
                    + ", noRecipient=" + skippedNoRecipient + ", errors=" + errors.size()
                    + (errors.isEmpty() ? "" : " " + errors);
        }
    }

    /**
     * Запуск по расписанию для даты {@code today} (дата по Ташкенту).
     * Ничего не делает, если это не первый рабочий день месяца или за прошлый месяц
     * автоотправка уже выполнялась.
     */
    public Result runIfFirstWorkingDay(LocalDate today) {
        YearMonth period = YearMonth.from(today).minusMonths(1);
        if (!workingDayService.isFirstWorkingDayOfMonth(today)) {
            log.debug("[SpecAutoSend] {} — не первый рабочий день месяца, пропуск", today);
            return new Result(period, false, 0, 0, 0, List.of());
        }
        String periodKey = period.toString(); // YYYY-MM
        if (!jobRunService.tryClaim(JOB_NAME, periodKey)) {
            log.info("[SpecAutoSend] Автоотправка за {} уже выполнялась, пропуск", periodKey);
            return new Result(period, false, 0, 0, 0, List.of());
        }

        Result result = sendPeriod(period);
        jobRunService.finish(JOB_NAME, periodKey, result.summary());
        log.info("[SpecAutoSend] Автоотправка завершена: {}", result.summary());
        return result;
    }

    /**
     * Отправляет письма за месяц всем ЦФО без отметки «Отправлено».
     * Ошибка по одному ЦФО не останавливает отправку остальным.
     */
    private Result sendPeriod(YearMonth period) {
        List<CfoSpecificationSendingDto> rows =
                sendingService.getSpecificationSending(period.getYear(), period.getMonthValue());
        int sent = 0;
        int alreadySent = 0;
        int noRecipient = 0;
        List<String> errors = new ArrayList<>();
        for (CfoSpecificationSendingDto row : rows) {
            String cfo = row.getCfoName();
            if (cfo == null || cfo.isBlank() || row.getSpecificationCount() <= 0) {
                continue;
            }
            if (row.isSent()) {
                alreadySent++;
                continue;
            }
            if (row.getRecipientEmail() == null || row.getRecipientEmail().isBlank()) {
                noRecipient++;
                log.warn("[SpecAutoSend] ЦФО «{}»: не назначен получатель с email, письмо не отправлено", cfo);
                continue;
            }
            try {
                // recipientOverride = null — как ручная кнопка «Отправить» в UI.
                sendingService.send(period.getYear(), period.getMonthValue(), cfo, null);
                sent++;
            } catch (Exception e) {
                errors.add(cfo + ": " + e.getMessage());
                log.error("[SpecAutoSend] ЦФО «{}»: ошибка отправки", cfo, e);
            }
        }
        return new Result(period, true, sent, alreadySent, noRecipient, errors);
    }
}
