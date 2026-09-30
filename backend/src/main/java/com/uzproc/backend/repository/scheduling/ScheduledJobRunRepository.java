package com.uzproc.backend.repository.scheduling;

import com.uzproc.backend.entity.scheduling.ScheduledJobRun;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ScheduledJobRunRepository extends JpaRepository<ScheduledJobRun, Long> {

    /**
     * Атомарно «захватывает» период для задачи: вставляет запись, если её ещё нет.
     *
     * @return 1 — период захвачен этим вызовом; 0 — запуск за период уже был
     */
    @Modifying
    @Query(value = "INSERT INTO scheduled_job_runs (job_name, period_key, started_at) "
            + "VALUES (:jobName, :periodKey, NOW()) "
            + "ON CONFLICT (job_name, period_key) DO NOTHING", nativeQuery = true)
    int tryClaim(@Param("jobName") String jobName, @Param("periodKey") String periodKey);

    Optional<ScheduledJobRun> findByJobNameAndPeriodKey(String jobName, String periodKey);
}
