package com.uzproc.backend.controller.overview;

import com.uzproc.backend.dto.overview.OverviewPurchasePlanMonthsResponseDto;
import com.uzproc.backend.dto.overview.OverviewSlaResponseDto;
import com.uzproc.backend.service.overview.OverviewService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Контроллер для вкладки «Обзор».
 * Агрегирует данные SLA и план закупок по месяцам в один запрос.
 */
@RestController
@RequestMapping("/overview")
public class OverviewController {

    private static final Logger logger = LoggerFactory.getLogger(OverviewController.class);

    private final OverviewService overviewService;

    public OverviewController(OverviewService overviewService) {
        this.overviewService = overviewService;
    }

    /**
     * Данные для вкладки SLA: заявки по группам статусов за год назначения на утверждение.
     * Один запрос вместо трёх (по одному на каждую группу статусов).
     */
    @GetMapping("/sla")
    public ResponseEntity<OverviewSlaResponseDto> getSlaData(
            @RequestParam Integer year) {
        logger.debug("Overview SLA request for year {}", year);
        OverviewSlaResponseDto data = overviewService.getSlaData(year);
        return ResponseEntity.ok(data);
    }

    /**
     * Данные для вкладки «План закупок» по месяцам.
     * Один запрос вместо нескольких (versions/year + versions/id/items + purchase-requests по каждому месяцу).
     *
     * @param year  год планирования
     * @param months месяцы через запятую (1–12), например: 1,2
     */
    @GetMapping("/purchase-plan-months")
    public ResponseEntity<OverviewPurchasePlanMonthsResponseDto> getPurchasePlanMonths(
            @RequestParam int year,
            @RequestParam String months) {
        logger.debug("Overview purchase-plan-months request for year {} months {}", year, months);
        List<Integer> monthList = Arrays.stream(months.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(Integer::parseInt)
                .filter(m -> m >= 1 && m <= 12)
                .distinct()
                .collect(Collectors.toList());
        OverviewPurchasePlanMonthsResponseDto data = overviewService.getPurchasePlanMonthsData(year, monthList);
        return ResponseEntity.ok(data);
    }
}
