package com.uzproc.backend.dto.sendingcenter;

import java.util.List;

/** Предпросмотр письма «Оценка закупки» (приглашение инициатора оценить работу закупок) для центра отправки. */
public record CsiInvitationPreviewDto(
        /** Номер заявки, взятой для примера; null — подходящей заявки нет */
        Long sampleRequestNumber,
        String subject,
        /** Текст письма по заявке-примеру */
        String text,
        /** Сколько подписанных договоров попало в пример */
        int contractCount,
        /** Адреса, которые по умолчанию ставятся в копию (помимо закупщика) */
        List<String> defaultCc,
        /** Адрес тестовой отправки */
        String testRecipient
) {}
