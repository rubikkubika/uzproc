package com.uzproc.backend.dto.sendingcenter;

/** Итог тестовой отправки письма «Оценка закупки». */
public record CsiInvitationTestSendResultDto(
        /** Адрес, на который ушло тестовое письмо */
        String recipient,
        /** Номер заявки, по которой собрано письмо */
        Long requestNumber,
        int contractCount,
        String subject
) {}
