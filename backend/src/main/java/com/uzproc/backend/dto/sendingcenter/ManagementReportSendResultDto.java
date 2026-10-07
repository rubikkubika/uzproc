package com.uzproc.backend.dto.sendingcenter;

import java.util.List;

/** Результат отправки презентации управленческой отчётности. */
public record ManagementReportSendResultDto(
        boolean sent,
        /** Адрес, на который ушло письмо */
        String recipient,
        /** Адреса в копии (пусто — без копии) */
        List<String> cc,
        String subject,
        int periodYear,
        int periodMonth,
        /** Имя файла презентации во вложении */
        String fileName,
        int slideCount,
        /** Размер вложения, байт */
        long fileSizeBytes
) {}
