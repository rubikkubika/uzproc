package com.uzproc.backend.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Включает планировщик Spring (@Scheduled) — например, для автоматической редакции плана закупок
 * в последний день месяца (см. PurchasePlanVersionScheduler).
 */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
