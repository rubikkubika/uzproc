package com.uzproc.backend.dto.sendingcenter;

/** Закупка, связанная с заявкой без сложности. */
public record ComplexityErrorLinkedPurchaseDto(
        /** ID закупки в системе (purchases.id) */
        Long id,
        /** Номер закупки (inner_id) */
        String innerId,
        /** Ссылка на карточку закупки */
        String link
) {}
