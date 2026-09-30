package com.uzproc.backend.dto.sendingcenter;

import java.time.LocalDateTime;
import java.util.List;

/** Закупщик и его заявки без сложности за год. */
public record ComplexityErrorPurchaserDto(
        /** Ключ закупщика для отправки (нормализованное ФИО; пусто — закупщик не указан) */
        String purchaserKey,
        /** ФИО закупщика (как в заявке, без должности) */
        String purchaserName,
        /** Адрес закупщика из справочника пользователей; null — не найден */
        String email,
        int requestCount,
        /** Сколько заявок ещё не было ни в одном отправленном письме */
        int notSentCount,
        List<ComplexityErrorRequestDto> requests,
        /** Последняя отправка за год (null — не отправлялось) */
        LocalDateTime lastSentAt,
        String lastSentTo,
        String lastSentBy
) {}
