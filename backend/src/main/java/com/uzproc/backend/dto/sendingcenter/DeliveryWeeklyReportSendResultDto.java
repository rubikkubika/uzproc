package com.uzproc.backend.dto.sendingcenter;

import java.time.LocalDate;

/** Результат отправки недельного отчёта по поставкам. */
public record DeliveryWeeklyReportSendResultDto(
        boolean sent,
        /** Адрес, на который ушло письмо */
        String recipient,
        /** ФИО получателя */
        String recipientFullName,
        String subject,
        LocalDate periodFrom,
        LocalDate periodTo,
        int deliveredCount,
        int overdueCount,
        int missingEsfCount
) {}
