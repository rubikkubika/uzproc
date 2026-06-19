package com.uzproc.backend.controller.overview;

import com.uzproc.backend.dto.contract.ContractApprovalDurationByMonthResponseDto;
import com.uzproc.backend.dto.contract.ContractApprovalsDashboardResponseDto;
import com.uzproc.backend.dto.contract.ContractDocumentCountByPersonMonthResponseDto;
import com.uzproc.backend.dto.contract.ContractRemarkDashboardEntryDto;
import com.uzproc.backend.dto.contract.ContractRemarksDashboardResponseDto;
import com.uzproc.backend.dto.overview.KpiCsiDetailDto;
import com.uzproc.backend.dto.overview.KpiCsiResponseDto;
import com.uzproc.backend.dto.overview.KpiSettingsDto;
import com.uzproc.backend.dto.overview.KpiSlaDetailDto;
import com.uzproc.backend.dto.overview.KpiSlaResponseDto;
import com.uzproc.backend.dto.overview.ApprovalPresentationDto;
import com.uzproc.backend.dto.overview.OverviewApprovalsSummaryResponseDto;
import com.uzproc.backend.dto.overview.OverviewApprovalsGroupedResponseDto;
import com.uzproc.backend.dto.overview.OverviewContractDurationResponseDto;
import com.uzproc.backend.dto.overview.OverviewEkChartResponseDto;
import com.uzproc.backend.dto.overview.OverviewPurchasePlanMonthsResponseDto;
import com.uzproc.backend.dto.overview.OverviewPurchasesByCfoItemDto;
import com.uzproc.backend.dto.overview.OverviewSlaResponseDto;
import com.uzproc.backend.dto.overview.OverviewTimelinesResponseDto;
import com.uzproc.backend.service.contract.ContractApprovalService;
import com.uzproc.backend.service.contract.ContractService;
import com.uzproc.backend.service.overview.ApprovalPresentationService;
import com.uzproc.backend.service.overview.KpiSettingsService;
import com.uzproc.backend.service.overview.OverviewService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import com.uzproc.backend.dto.overview.OverviewTimelinesRequestDto;
import com.uzproc.backend.dto.purchaserequest.PurchaseRequestDto;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.uzproc.backend.dto.overview.KpiSavingsResponseDto;
import com.uzproc.backend.dto.overview.OverviewSavingsResponseDto;
import com.uzproc.backend.dto.overview.OverviewSavingsPurchaseDetailDto;
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
    private final ApprovalPresentationService approvalPresentationService;
    private final ContractApprovalService contractApprovalService;
    private final ContractService contractService;
    private final KpiSettingsService kpiSettingsService;

    public OverviewController(OverviewService overviewService,
                              ApprovalPresentationService approvalPresentationService,
                              ContractApprovalService contractApprovalService,
                              ContractService contractService,
                              KpiSettingsService kpiSettingsService) {
        this.overviewService = overviewService;
        this.approvalPresentationService = approvalPresentationService;
        this.contractApprovalService = contractApprovalService;
        this.contractService = contractService;
        this.kpiSettingsService = kpiSettingsService;
    }

    /**
     * Данные для вкладки «Экономия»: сумма экономии по закупкам за год.
     */
    @GetMapping("/savings")
    public ResponseEntity<OverviewSavingsResponseDto> getSavingsData(
            @RequestParam Integer year) {
        logger.debug("Overview Savings request for year {}", year);
        OverviewSavingsResponseDto data = overviewService.getSavingsData(year);
        return ResponseEntity.ok(data);
    }

    /**
     * KPI экономии: экономия и бюджет по закупщикам за конкретный месяц года.
     */
    @GetMapping("/kpi/savings")
    public ResponseEntity<KpiSavingsResponseDto> getKpiSavingsData(
            @RequestParam int year,
            @RequestParam int month) {
        logger.debug("KPI savings request for year={}, month={}", year, month);
        KpiSavingsResponseDto data = overviewService.getKpiSavingsData(year, month);
        return ResponseEntity.ok(data);
    }

    /**
     * KPI SLA: % уложившихся в плановый SLA по закупщикам за месяц (нарастающим итогом январь–месяц).
     */
    @GetMapping("/kpi/sla")
    public ResponseEntity<KpiSlaResponseDto> getKpiSlaData(
            @RequestParam int year,
            @RequestParam int month) {
        logger.debug("KPI SLA request for year={}, month={}", year, month);
        KpiSlaResponseDto data = overviewService.getKpiSlaData(year, month);
        return ResponseEntity.ok(data);
    }

    /**
     * KPI CSI: средняя оценка и количество отзывов по закупщикам за месяц (нарастающим итогом январь–месяц).
     */
    @GetMapping("/kpi/csi")
    public ResponseEntity<KpiCsiResponseDto> getKpiCsiData(
            @RequestParam int year,
            @RequestParam int month) {
        logger.debug("KPI CSI request for year={}, month={}", year, month);
        KpiCsiResponseDto data = overviewService.getKpiCsiData(year, month);
        return ResponseEntity.ok(data);
    }

    /**
     * Настройки KPI-премии (цель, вес, буст до 130%) по блокам «Экономия», «SLA», «CSI».
     * Общие для всех пользователей.
     */
    @GetMapping("/kpi/settings")
    public ResponseEntity<KpiSettingsDto> getKpiSettings() {
        return ResponseEntity.ok(kpiSettingsService.get());
    }

    /**
     * Сохранить настройки KPI-премии.
     */
    @PutMapping("/kpi/settings")
    public ResponseEntity<KpiSettingsDto> saveKpiSettings(@RequestBody KpiSettingsDto dto) {
        return ResponseEntity.ok(kpiSettingsService.save(dto));
    }

    /**
     * Детали KPI SLA для конкретного закупщика за период (нарастающим итогом январь–месяц).
     */
    @GetMapping("/kpi/sla/requests")
    public ResponseEntity<List<KpiSlaDetailDto>> getKpiSlaDetails(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam String purchaser) {
        logger.debug("KPI SLA details request for year={}, month={}, purchaser={}", year, month, purchaser);
        return ResponseEntity.ok(overviewService.getKpiSlaDetails(year, month, purchaser));
    }

    /**
     * Детали KPI CSI для конкретного закупщика за период (нарастающим итогом январь–месяц).
     */
    @GetMapping("/kpi/csi/feedbacks")
    public ResponseEntity<List<KpiCsiDetailDto>> getKpiCsiDetails(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam String purchaser) {
        logger.debug("KPI CSI details request for year={}, month={}, purchaser={}", year, month, purchaser);
        return ResponseEntity.ok(overviewService.getKpiCsiDetails(year, month, purchaser));
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
     * Детали закупок с экономией для конкретного закупщика за год (опционально — за месяц).
     */
    @GetMapping("/savings/purchases")
    public ResponseEntity<List<OverviewSavingsPurchaseDetailDto>> getSavingsPurchaseDetails(
            @RequestParam int year,
            @RequestParam String purchaser,
            @RequestParam(required = false) Integer month) {
        logger.debug("Overview savings/purchases request for year={}, month={}, purchaser={}", year, month, purchaser);
        return ResponseEntity.ok(overviewService.getSavingsPurchaseDetails(year, month, purchaser));
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

    /**
     * Дашборд замечаний по договорам: категории с количеством.
     * Фильтр по дате создания замечания (dateFrom, dateTo).
     */
    @GetMapping("/contract-remarks-dashboard")
    public ResponseEntity<ContractRemarksDashboardResponseDto> getContractRemarksDashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return ResponseEntity.ok(contractApprovalService.getRemarksDashboard(dateFrom, dateTo));
    }

    /**
     * Замечания по конкретной категории для дашборда.
     */
    @GetMapping("/contract-remarks-dashboard/by-category")
    public ResponseEntity<List<ContractRemarkDashboardEntryDto>> getContractRemarksByCategory(
            @RequestParam String category,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate dateTo) {
        return ResponseEntity.ok(contractApprovalService.getRemarksByCategory(category, dateFrom, dateTo));
    }

    /**
     * Дашборд «Кол-во документов» по договорам: разрез договорник × месяц года
     * по дате создания договора. Учитываются только договорники
     * (preparedBy.isContractor = true), скрытые из «В работе» исключаются.
     */
    @GetMapping("/contract-documents-by-person-month")
    public ResponseEntity<ContractDocumentCountByPersonMonthResponseDto> getContractDocumentsByPersonMonth(
            @RequestParam int year,
            @RequestParam(required = false) String segment) {
        logger.debug("Overview contract-documents-by-person-month request (year={}, segment={})", year, segment);
        return ResponseEntity.ok(contractService.getDocumentCountByPersonMonth(year, segment));
    }

    /**
     * Дашборд «Согласования договорных документов»: разрез сегмент × тип документа × типовая,
     * кол-во документов и средний срок согласования (от первого до последнего этапа).
     * Множество договоров совпадает со сводкой реестра (вкладка «Подписаны»):
     * статус=SIGNED, договорник, год по contract_creation_date.
     * Опциональный фильтр preparedBy — фильтр по конкретному ФИО договорника.
     */
    @GetMapping("/contract-approvals-dashboard")
    public ResponseEntity<ContractApprovalsDashboardResponseDto> getContractApprovalsDashboard(
            @RequestParam int year,
            @RequestParam(required = false) String preparedBy) {
        logger.debug("Overview contract-approvals-dashboard request (year={}, preparedBy={})", year, preparedBy);
        return ResponseEntity.ok(contractService.getApprovalsDashboard(year, preparedBy));
    }

    /**
     * Дашборд «Средний срок согласования по месяцам» в разрезе сегментов
     * (Маркет / Тезкор ООО / 1П). Договоры группируются по месяцу даты создания за год.
     */
    @GetMapping("/contract-approvals-duration-by-month")
    public ResponseEntity<ContractApprovalDurationByMonthResponseDto> getContractApprovalDurationByMonth(
            @RequestParam int year,
            @RequestParam(required = false) String preparedBy) {
        logger.debug("Overview contract-approvals-duration-by-month request (year={}, preparedBy={})", year, preparedBy);
        return ResponseEntity.ok(contractService.getApprovalDurationByMonth(year, preparedBy));
    }

    /**
     * Дашборд «Закупки по ЦФО»: заявки с завершённой закупкой, фильтр по ЦФО и году завершения.
     */
    @GetMapping("/purchases-by-cfo")
    public ResponseEntity<List<OverviewPurchasesByCfoItemDto>> getPurchasesByCfo(
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) List<Integer> year) {
        logger.debug("Overview purchases-by-cfo request (cfo={}, year={})", cfo, year);
        return ResponseEntity.ok(overviewService.getPurchasesByCfo(cfo, year));
    }

    /**
     * Выгрузка дашборда «Закупки по ЦФО» в Excel.
     */
    @GetMapping("/purchases-by-cfo/export")
    public ResponseEntity<byte[]> exportPurchasesByCfo(
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) List<Integer> year) {
        logger.debug("Overview purchases-by-cfo export (cfo={}, year={})", cfo, year);
        byte[] data = overviewService.exportPurchasesByCfoToExcel(cfo, year);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
        headers.setContentDisposition(ContentDisposition.attachment().filename("purchases-by-cfo.xlsx").build());
        return ResponseEntity.ok().headers(headers).body(data);
    }
}
