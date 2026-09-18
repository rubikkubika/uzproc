package com.uzproc.backend.dto.sendingcenter;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Сводка по одному периоду недельного отчёта по поставкам:
 * сколько поставлено, сколько просрочено и по скольким не заполнена дата ЭСФ.
 */
public record DeliveryWeeklyReportPeriodDto(
        LocalDate from,
        LocalDate to,
        int deliveredCount,
        BigDecimal deliveredAmount,
        int overdueCount,
        BigDecimal overdueAmount,
        int missingEsfCount,
        BigDecimal missingEsfAmount
) {}
