package com.uzproc.backend.dto.sendingcenter;

import java.time.LocalDate;
import java.util.List;

/** Заявка без сложности (раздел «Ошибка сложности» центра отправки). */
public record ComplexityErrorRequestDto(
        /** ID заявки в системе (purchase_requests.id) — для ссылки на карточку */
        Long id,
        /** Внутренний номер заявки (inner_id) */
        String innerId,
        /** Короткий номер заявки (id_purchase_request) — его видят пользователи, он идёт в письмо */
        Long requestNumber,
        /** Наименование заявки */
        String name,
        String cfo,
        /** Статус заявки (русское название) */
        String status,
        /** Дата создания заявки */
        LocalDate creationDate,
        /** Ссылка на карточку заявки */
        String link,
        /** Связанные закупки (может быть пусто) */
        List<ComplexityErrorLinkedPurchaseDto> purchases,
        /** Заявка уже была в отправленном письме за этот год */
        boolean alreadySent
) {}
