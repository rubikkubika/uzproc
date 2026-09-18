package com.uzproc.backend.service.sendingcenter;

import com.uzproc.backend.entity.delivery.Delivery;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Блок недельного отчёта по поставкам за один период (неделя или текущий месяц):
 * поставленное за период, просроченное (без фактической даты) и поставки без даты ЭСФ.
 */
public record DeliveryWeeklyReportSection(
        /** Заголовок блока в письме, напр. «За неделю» */
        String title,
        LocalDate from,
        LocalDate to,
        List<Delivery> delivered,
        List<Delivery> overdue,
        List<Delivery> missingEsf
) {

    public BigDecimal deliveredAmount() {
        return sum(delivered);
    }

    public BigDecimal overdueAmount() {
        return sum(overdue);
    }

    public BigDecimal missingEsfAmount() {
        return sum(missingEsf);
    }

    private static BigDecimal sum(List<Delivery> deliveries) {
        BigDecimal total = BigDecimal.ZERO;
        for (Delivery delivery : deliveries) {
            if (delivery.getAmount() != null) {
                total = total.add(delivery.getAmount());
            }
        }
        return total;
    }
}
