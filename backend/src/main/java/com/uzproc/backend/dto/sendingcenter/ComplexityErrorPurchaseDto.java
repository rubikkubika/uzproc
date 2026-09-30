package com.uzproc.backend.dto.sendingcenter;

import java.time.LocalDate;

/** Закупка без сложности (раздел «Ошибка сложности» центра отправки). */
public record ComplexityErrorPurchaseDto(
        /** ID закупки в системе (purchases.id) */
        Long id,
        /** Номер закупки (inner_id) */
        String innerId,
        /** Номер заявки (inner_id заявки), у которой не заполнена сложность */
        String purchaseRequestInnerId,
        /** Наименование закупки (или заявки, если у закупки не заполнено) */
        String name,
        String cfo,
        /** Дата создания закупки */
        LocalDate creationDate,
        String status,
        /** Ссылка на карточку закупки */
        String link,
        /** Закупка уже была в отправленном письме за этот год */
        boolean alreadySent
) {}
