package com.uzproc.backend.dto.sendingcenter;

/** Итог тестовой отправки «Ошибки сложности»: чей список взят и куда ушло письмо. */
public record ComplexityErrorTestSendResultDto(
        /** Адрес, на который ушло тестовое письмо */
        String recipient,
        /** Закупщик, чей список заявок попал в письмо */
        String purchaserName,
        /** Адрес закупщика (кому ушло бы настоящее письмо); null — не найден */
        String purchaserEmail,
        int requestCount,
        String subject
) {}
