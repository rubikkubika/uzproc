package com.uzproc.backend.dto.sendingcenter;

import java.util.List;

/** Итог отправки уведомлений «Ошибка сложности». */
public record ComplexityErrorSendResultDto(
        /** Сколько писем отправлено */
        int sentCount,
        /** Сколько закупок вошло в отправленные письма */
        int purchaseCount,
        /** Кому отправлено: «ФИО <email>» */
        List<String> sentTo,
        /** Пропущены — нет адреса закупщика (или закупщик не указан) */
        List<String> skippedWithoutEmail,
        /** Ошибки отправки: «ФИО: текст ошибки» */
        List<String> errors
) {}
