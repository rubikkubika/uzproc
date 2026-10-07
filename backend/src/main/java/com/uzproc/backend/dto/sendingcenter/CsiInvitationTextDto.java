package com.uzproc.backend.dto.sendingcenter;

/** Текст письма «Оценка закупки» по заявке. */
public record CsiInvitationTextDto(
        /** ID заявки в системе */
        Long purchaseRequestId,
        String subject,
        String text,
        /** Сколько подписанных договоров перечислено в письме */
        int contractCount
) {}
