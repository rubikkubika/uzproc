package com.uzproc.backend.controller.overview;

import com.uzproc.backend.dto.overview.OverviewApprovalsByExecutorDto;
import com.uzproc.backend.dto.overview.OverviewEkChartResponseDto;
import com.uzproc.backend.dto.overview.OverviewPurchasePlanMonthsResponseDto;
import com.uzproc.backend.dto.overview.OverviewSlaResponseDto;
import com.uzproc.backend.service.overview.OverviewService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
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

    /**
     * Данные для вкладки ЕК: сводка за год (по фильтру назначения на закупщика).
     * Столбец 1: сумма заявок (тип закупка) у единственного источника. Столбец 2: % от суммы всех назначенных на закупщика заявок (расчёт на бэкенде).
     */
    @GetMapping("/ek")
    public ResponseEntity<OverviewEkChartResponseDto> getEkChartData(@RequestParam int year) {
        logger.debug("Overview EK request for year {}", year);
        OverviewEkChartResponseDto result = overviewService.getEkChartData(year);
        return ResponseEntity.ok()
                .header("X-Ek-Year-Type", result.getYearType())
                .body(result);
    }

    /**
     * Список форм документа (Договор, Спецификация и т.д.) для выпадающего фильтра на вкладке «Согласования».
     */
    @GetMapping("/approvals-by-executor/document-forms")
    public ResponseEntity<List<String>> getApprovalsDocumentFormOptions() {
        List<String> options = overviewService.getApprovalsDocumentFormOptions();
        return ResponseEntity.ok(options != null ? options : List.of());
    }

    /**
     * Исполнители по согласованиям договоров: исполнитель, кол-во договоров, среднее кол-во рабочих дней.
     * Учитываются только договоры, связанные с заявкой на закупку. Расчёт дней — как на странице заявки.
     * Сортировка: по среднему кол-ву дней от большего к меньшему.
     * Фильтр по году назначения заявки на закупщика: assignmentYear (целый год, 1 янв — 31 дек).
     * Фильтр по форме документа: опционально documentForm (Договор, Спецификация и т.д.).
     */
    @GetMapping("/approvals-by-executor")
    public ResponseEntity<List<OverviewApprovalsByExecutorDto>> getApprovalsByExecutor(
            @RequestParam(required = false) Integer assignmentYear,
            @RequestParam(required = false) String documentForm) {
        LocalDate assignmentDateFrom = null;
        LocalDate assignmentDateTo = null;
        if (assignmentYear != null) {
            assignmentDateFrom = LocalDate.of(assignmentYear, 1, 1);
            assignmentDateTo = LocalDate.of(assignmentYear, 12, 31);
        }
        logger.debug("Overview approvals-by-executor request (assignmentYear={}, documentForm={})",
                assignmentYear, documentForm);
        List<OverviewApprovalsByExecutorDto> data = overviewService.getApprovalsByExecutor(assignmentDateFrom, assignmentDateTo, documentForm);
        return ResponseEntity.ok(data != null ? data : List.of());
    }
}
