package com.uzproc.backend.dto.sendingcenter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Сведения о рассылке управленческой отчётности для центра отправки. */
public record ManagementReportSendingInfoDto(
        /** Отчётный период ближайшей/текущей рассылки — прошлый месяц */
        int periodYear,
        int periodMonth,
        /** Подпись периода: «сентябрь 2026» */
        String periodLabel,
        String subject,
        /** Адресат регулярной рассылки */
        String recipient,
        String recipientFullName,
        /** Адреса в копии регулярной рассылки */
        List<String> cc,
        /** Адрес тестовой отправки */
        String testRecipient,
        /** Включена ли рассылка по расписанию на этом окружении */
        boolean scheduleEnabled,
        /** Номер рабочего дня месяца, в который уходит письмо */
        int workingDayNumber,
        /** Время отправки, «10:00» */
        String sendTime,
        String zone,
        /** Дата ближайшей отправки по расписанию */
        LocalDate nextSendDate,
        /** Когда отчёт за период ушёл по расписанию; null — ещё не уходил */
        LocalDateTime autoSentAt,
        /** Итог автоотправки за период */
        String autoSendSummary
) {}
