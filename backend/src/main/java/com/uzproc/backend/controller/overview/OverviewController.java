package com.uzproc.backend.controller.overview;

import com.uzproc.backend.dto.overview.ApprovalPresentationDto;
import com.uzproc.backend.dto.overview.OverviewApprovalsSummaryResponseDto;
import com.uzproc.backend.dto.overview.OverviewApprovalsGroupedResponseDto;
import com.uzproc.backend.dto.overview.OverviewContractDurationResponseDto;
import com.uzproc.backend.dto.overview.OverviewEkChartResponseDto;
import com.uzproc.backend.dto.overview.OverviewPurchasePlanMonthsResponseDto;
import com.uzproc.backend.dto.overview.OverviewSlaResponseDto;
import com.uzproc.backend.dto.overview.OverviewTimelinesResponseDto;
import com.uzproc.backend.service.overview.ApprovalPresentationService;
import com.uzproc.backend.service.overview.OverviewService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.uzproc.backend.dto.overview.OverviewTimelinesRequestDto;
import com.uzproc.backend.dto.purchaserequest.PurchaseRequestDto;
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
    private final ApprovalPresentationService approvalPresentationService;

    public OverviewController(OverviewService overviewService, ApprovalPresentationService approvalPresentationService) {
        this.overviewService = overviewService;
        this.approvalPresentationService = approvalPresentationService;
    }

    /**
     * Данные для вкладки SLA: заявки по группам статусов за год назначения на утверждение.
     * Один запрос вместо трёх (по одному на каждую группу статусов).
     */
    @GetMapping("/sla")
    public ResponseEntity<OverviewSlaResponseDto> getSlaData(
            @RequestParam Integer year,
            @RequestParam(required = false) String purchaser) {
        logger.debug("Overview SLA request for year {}, purchaser={}", year, purchaser);
        OverviewSlaResponseDto data = overviewService.getSlaData(year, purchaser);
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
     * Список форм документа для фильтра на вкладке «Согласования».
     */
    @GetMapping("/approvals-summary/document-forms")
    public ResponseEntity<List<String>> getApprovalDocumentForms() {
        return ResponseEntity.ok(overviewService.getApprovalDocumentForms());
    }

    /**
     * Сводная таблица согласований по ролям.
     * Объединяет данные из всех трёх таблиц согласований (заявки, закупки, договоры).
     * Фильтр: год назначения (year) и форма документа (documentForm).
     * Учитываются только завершённые согласования. Срок = рабочие дни от назначения до завершения.
     */
    @GetMapping("/approvals-summary")
    public ResponseEntity<OverviewApprovalsSummaryResponseDto> getApprovalsSummary(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) List<String> documentForm) {
        logger.debug("Overview approvals-summary request (year={}, documentForm={})", year, documentForm);
        return ResponseEntity.ok(overviewService.getApprovalsSummaryByRole(year, documentForm));
    }

    /**
     * Сводная таблица согласований по ФИО исполнителя (только договорные согласования).
     * Фильтр: год назначения (year) и форма документа (documentForm).
     */
    @GetMapping("/approvals-summary/by-person")
    public ResponseEntity<OverviewApprovalsGroupedResponseDto> getApprovalsSummaryByPerson(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) List<String> documentForm) {
        logger.debug("Overview approvals-summary/by-person (year={}, documentForm={})", year, documentForm);
        return ResponseEntity.ok(overviewService.getApprovalsSummaryByPerson(year, documentForm));
    }

    /**
     * Сводная таблица согласований по виду документа (только договорные согласования).
     * Фильтр: год назначения (year).
     */
    @GetMapping("/approvals-summary/by-document-form")
    public ResponseEntity<OverviewApprovalsGroupedResponseDto> getApprovalsSummaryByDocumentForm(
            @RequestParam(required = false) Integer year) {
        logger.debug("Overview approvals-summary/by-document-form (year={})", year);
        return ResponseEntity.ok(overviewService.getApprovalsSummaryByDocumentForm(year));
    }

    /**
     * Список договоров с полным сроком согласования (от первого назначения до последнего завершения).
     * Только не-технические этапы. Фильтр: год назначения (year) и форма документа (documentForm).
     */
    @GetMapping("/approvals-summary/by-contract")
    public ResponseEntity<OverviewContractDurationResponseDto> getContractDurationSummary(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) List<String> documentForm) {
        logger.debug("Overview approvals-summary/by-contract (year={}, documentForm={})", year, documentForm);
        return ResponseEntity.ok(overviewService.getContractDurationSummary(year, documentForm));
    }

    /**
     * Данные для вкладки «Сроки закупок»: средние рабочие дни по этапам, сгруппированные по годам.
     */
    @GetMapping("/timelines")
    public ResponseEntity<OverviewTimelinesResponseDto> getTimelinesData(
            @RequestParam(required = false, defaultValue = "false") boolean onlySignedContracts) {
        logger.debug("Overview timelines request (onlySignedContracts={})", onlySignedContracts);
        OverviewTimelinesResponseDto data = overviewService.getTimelinesData(onlySignedContracts);
        return ResponseEntity.ok(data);
    }

    /**
     * Список заявок на закупку, участвовавших в расчёте «Сроки закупок» для указанного года и сложности.
     */
    @GetMapping("/timelines/requests")
    public ResponseEntity<List<OverviewTimelinesRequestDto>> getTimelinesRequests(
            @RequestParam int year,
            @RequestParam String complexity,
            @RequestParam(required = false, defaultValue = "false") boolean onlySignedContracts) {
        logger.debug("Overview timelines requests for year={}, complexity={}, onlySignedContracts={}", year, complexity, onlySignedContracts);
        List<OverviewTimelinesRequestDto> requests = overviewService.getTimelinesRequests(year, complexity, onlySignedContracts);
        return ResponseEntity.ok(requests);
    }

    /**
     * Получить сохранённую презентацию согласований (выводы).
     */
    @GetMapping("/approval-presentation")
    public ResponseEntity<ApprovalPresentationDto> getApprovalPresentation() {
        return ResponseEntity.ok(approvalPresentationService.get());
    }

    /**
     * Сохранить презентацию согласований (выводы).
     */
    @PutMapping("/approval-presentation")
    public ResponseEntity<ApprovalPresentationDto> saveApprovalPresentation(@RequestBody ApprovalPresentationDto dto) {
        return ResponseEntity.ok(approvalPresentationService.save(dto));
    }
}
