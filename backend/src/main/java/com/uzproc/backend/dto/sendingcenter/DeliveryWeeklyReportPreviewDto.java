package com.uzproc.backend.dto.sendingcenter;

/**
 * Предпросмотр недельного отчёта по поставкам для центра отправки:
 * периоды (неделя и текущий месяц), агрегаты и получатель по умолчанию.
 */
public record DeliveryWeeklyReportPreviewDto(
        DeliveryWeeklyReportPeriodDto week,
        DeliveryWeeklyReportPeriodDto month,
        /** ФИО получателя по умолчанию */
        String defaultRecipientFullName,
        /** Адрес получателя по умолчанию */
        String defaultRecipientEmail,
        /** Тема письма, с которой уйдёт отчёт */
        String subject
) {}
