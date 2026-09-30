package com.uzproc.backend.dto.sendingcenter;

import java.util.List;

/** Предпросмотр раздела «Ошибка сложности»: закупки года без сложности по закупщикам. */
public record ComplexityErrorPreviewDto(
        int year,
        int purchaseCount,
        int purchaserCount,
        /** Закупщиков без адреса (письмо им не уйдёт) */
        int withoutEmailCount,
        /** Адреса в копии каждого письма */
        List<String> cc,
        /** Ссылка на создание запроса в поддержку 1С */
        String supportRequestUrl,
        String subject,
        List<ComplexityErrorPurchaserDto> purchasers
) {}
