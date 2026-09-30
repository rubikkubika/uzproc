package com.uzproc.backend.dto.sendingcenter;

/**
 * Предпросмотр недельного отчёта по поставкам для центра отправки:
 * периоды (неделя, текущий месяц и с начала года), агрегаты и получатель по умолчанию.
 */
public record DeliveryWeeklyReportPreviewDto(
        DeliveryWeeklyReportPeriodDto week,
        DeliveryWeeklyReportPeriodDto month,
        DeliveryWeeklyReportPeriodDto year,
        /** ФИО получателя по умолчанию */
        String defaultRecipientFullName,
        /** Адрес получателя по умолчанию */
        String defaultRecipientEmail,
        /** Тема письма, с которой уйдёт отчёт */
        String subject
) {}
