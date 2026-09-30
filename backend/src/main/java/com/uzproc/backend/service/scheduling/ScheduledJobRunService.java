package com.uzproc.backend.service.scheduling;

import com.uzproc.backend.repository.scheduling.ScheduledJobRunRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Журнал запусков задач по расписанию ({@code scheduled_job_runs}).
 * Каждый метод — в отдельной транзакции, чтобы «захват» периода фиксировался в БД
 * до начала отправки писем и был виден другим экземплярам бэкенда.
 */
@Service
public class ScheduledJobRunService {

    private final ScheduledJobRunRepository repository;

    public ScheduledJobRunService(ScheduledJobRunRepository repository) {
        this.repository = repository;
    }

    /**
     * Захватывает период для задачи. {@code true} — можно выполнять; {@code false} — за этот период
     * задача уже запускалась (повторный запуск после рестарта, второй экземпляр и т.п.).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean tryClaim(String jobName, String periodKey) {
        return repository.tryClaim(jobName, periodKey) > 0;
    }

    /** Фиксирует окончание запуска и его итог. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void finish(String jobName, String periodKey, String summary) {
        repository.findByJobNameAndPeriodKey(jobName, periodKey).ifPresent(run -> {
            run.setFinishedAt(LocalDateTime.now());
            run.setSummary(summary);
            repository.save(run);
        });
    }
}
