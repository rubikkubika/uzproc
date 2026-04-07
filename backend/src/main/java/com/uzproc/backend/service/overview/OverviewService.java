package com.uzproc.backend.service.overview;

import com.uzproc.backend.config.OverviewEkProperties;
import com.uzproc.backend.dto.overview.*;
import com.uzproc.backend.dto.purchaserequest.PurchaseRequestDto;
import com.uzproc.backend.dto.purchaseplan.PurchasePlanItemDto;
import com.uzproc.backend.dto.purchaseplan.PurchasePlanVersionDto;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestCommentType;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestStatus;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.contract.ContractApprovalRepository;
import com.uzproc.backend.repository.contract.ContractRepository;
import com.uzproc.backend.repository.purchase.PurchaseApprovalRepository;
import com.uzproc.backend.repository.purchase.PurchaseRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestApprovalRepository;
import com.uzproc.backend.repository.user.UserRepository;
import com.uzproc.backend.service.calendar.WorkingDayService;
import com.uzproc.backend.service.purchaserequest.PurchaseRequestCommentService;
import com.uzproc.backend.service.purchaserequest.PurchaseRequestService;
import com.uzproc.backend.service.purchaseplan.PurchasePlanVersionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Сервис для вкладки «Обзор»: агрегирует данные SLA и план закупок по месяцам в один запрос.
 */
@Service
@Transactional(readOnly = true)
public class OverviewService {

    private static final Logger logger = LoggerFactory.getLogger(OverviewService.class);
    private static final DateTimeFormatter ISO_FORMAT = DateTimeFormatter.ISO_DATE_TIME;
    private static final List<String> SLA_STATUS_GROUPS = List.of(
            "Заявка у закупщика",
            "Договор в работе",
            "Договор подписан"
    );
    /** Закупки в расчётах СЛА учитываются только при назначении на закупщика не ранее этой даты. */
    private static final LocalDateTime SLA_ASSIGNMENT_CUTOFF = LocalDateTime.of(2026, 1, 1, 0, 0);

    private static final Set<String> APPROVAL_EXCLUDED_STAGE_PREFIXES = Set.of(
            "синхронизация",
            "принятие на хранение",
            "принятие на хранение:",
            "регистрация",
            "регистрация договора",
            "регистрация:"
    );

    private final PurchaseRequestService purchaseRequestService;
    private final PurchasePlanVersionService purchasePlanVersionService;
    private final PurchaseRequestCommentService purchaseRequestCommentService;
    private final PurchaseRepository purchaseRepository;
    private final ContractApprovalRepository contractApprovalRepository;
    private final ContractRepository contractRepository;
    private final PurchaseRequestApprovalRepository purchaseRequestApprovalRepository;
    private final PurchaseApprovalRepository purchaseApprovalRepository;
    private final UserRepository userRepository;
    private final OverviewEkProperties overviewEkProperties;
    private final WorkingDayService workingDayService;

    /** Подстрока способа закупки у связанной закупки для признака «Закупка у единственного источника». */
    private static final String SINGLE_SOURCE_MCC_SUBSTRING = "единственного источника";

    public OverviewService(
            PurchaseRequestService purchaseRequestService,
            PurchasePlanVersionService purchasePlanVersionService,
            PurchaseRequestCommentService purchaseRequestCommentService,
            PurchaseRepository purchaseRepository,
            ContractApprovalRepository contractApprovalRepository,
            ContractRepository contractRepository,
            PurchaseRequestApprovalRepository purchaseRequestApprovalRepository,
            PurchaseApprovalRepository purchaseApprovalRepository,
            UserRepository userRepository,
            OverviewEkProperties overviewEkProperties,
            WorkingDayService workingDayService) {
        this.purchaseRequestService = purchaseRequestService;
        this.purchasePlanVersionService = purchasePlanVersionService;
        this.purchaseRequestCommentService = purchaseRequestCommentService;
        this.purchaseRepository = purchaseRepository;
        this.contractApprovalRepository = contractApprovalRepository;
        this.contractRepository = contractRepository;
        this.purchaseRequestApprovalRepository = purchaseRequestApprovalRepository;
        this.purchaseApprovalRepository = purchaseApprovalRepository;
        this.userRepository = userRepository;
        this.overviewEkProperties = overviewEkProperties;
        this.workingDayService = workingDayService;
    }

    /**
     * Данные для вкладки SLA: заявки по группам статусов за год назначения на утверждение.
     * @param purchaser опциональный фильтр по закупщику (ФИО); при указании возвращаются только его данные.
     */
    public OverviewSlaResponseDto getSlaData(Integer year, String purchaser) {
        OverviewSlaResponseDto response = new OverviewSlaResponseDto();
        response.setYear(year);
        List<String> purchaserFilter = (purchaser != null && !purchaser.trim().isEmpty())
                ? List.of(purchaser.trim())
                : null;
        List<OverviewSlaBlockDto> blocks = new ArrayList<>();
        List<Long> allRequestIds = new ArrayList<>();
        for (String statusGroup : SLA_STATUS_GROUPS) {
            // hasLinkedPlanItem=null (не фильтруем по связи с планом — иначе 2090 без позиции плана не попадёт),
            // requiresPurchase=true — только закупки, без заказов
            Page<PurchaseRequestDto> page = purchaseRequestService.findAll(
                    0, 2000,
                    null, null, null, null,
                    null, null, null, purchaserFilter, null, null, null, null,
                    null, null, true, List.of(statusGroup), false,
                    null, null, false, year, null);
            List<OverviewSlaRequestDto> requests = page.getContent().stream()
                    .map(this::toOverviewSlaRequest)
                    .collect(Collectors.toList());
            requests.forEach(r -> { if (r.getId() != null) allRequestIds.add(r.getId()); });
            blocks.add(new OverviewSlaBlockDto(statusGroup, requests));
        }
        Map<Long, Long> slaCounts = purchaseRequestCommentService.getSlaCommentCountByPurchaseRequestIds(allRequestIds);
        // Bulk-загрузка PurchaseApproval для вычисления purchaseGeneralDays и purchaseResultDays
        Map<Long, List<com.uzproc.backend.entity.purchase.PurchaseApproval>> approvalsByRequestId = Collections.emptyMap();
        if (!allRequestIds.isEmpty()) {
            List<Long> allIdPurchaseRequests = blocks.stream()
                    .flatMap(b -> b.getRequests().stream())
                    .filter(r -> r.getIdPurchaseRequest() != null)
                    .map(OverviewSlaRequestDto::getIdPurchaseRequest)
                    .distinct()
                    .collect(Collectors.toList());
            if (!allIdPurchaseRequests.isEmpty()) {
                approvalsByRequestId = purchaseApprovalRepository.findByPurchaseRequestIdIn(allIdPurchaseRequests)
                        .stream()
                        .collect(Collectors.groupingBy(com.uzproc.backend.entity.purchase.PurchaseApproval::getPurchaseRequestId));
            }
        }
        for (OverviewSlaBlockDto block : blocks) {
            for (OverviewSlaRequestDto r : block.getRequests()) {
                if (r.getId() != null && slaCounts.containsKey(r.getId())) {
                    r.setSlaCommentCount(slaCounts.get(r.getId()).intValue());
                } else {
                    r.setSlaCommentCount(0);
                }
                // Вычисление purchaseGeneralDays и purchaseResultDays
                if (r.getIdPurchaseRequest() != null && r.getApprovalAssignmentDate() != null) {
                    List<com.uzproc.backend.entity.purchase.PurchaseApproval> approvals =
                            approvalsByRequestId.getOrDefault(r.getIdPurchaseRequest(), Collections.emptyList());
                    if (!approvals.isEmpty()) {
                        LocalDateTime firstApprovalAssignment = approvals.stream()
                                .map(com.uzproc.backend.entity.purchase.PurchaseApproval::getAssignmentDate)
                                .filter(Objects::nonNull)
                                .min(LocalDateTime::compareTo)
                                .orElse(null);
                        LocalDateTime lastApprovalCompletion = approvals.stream()
                                .map(com.uzproc.backend.entity.purchase.PurchaseApproval::getCompletionDate)
                                .filter(Objects::nonNull)
                                .max(LocalDateTime::compareTo)
                                .orElse(null);
                        LocalDateTime approvalAssignment = parseIsoDateTime(r.getApprovalAssignmentDate());
                        // Общий: от даты назначения на закупщика до первого назначения согласования (день назначения на закупщика не считается)
                        if (approvalAssignment != null && firstApprovalAssignment != null) {
                            long generalDays = countWorkingDaysBetween(approvalAssignment, firstApprovalAssignment);
                            r.setPurchaseGeneralDays((int) generalDays);
                        }
                        // Итоги: от первого назначения согласования до последнего выполнения (день назначения не считается)
                        if (firstApprovalAssignment != null && lastApprovalCompletion != null) {
                            long resultDays = countWorkingDaysBetween(firstApprovalAssignment, lastApprovalCompletion);
                            r.setPurchaseResultDays((int) resultDays);
                        }
                    }
                }
            }
        }
        response.setStatusBlocks(blocks);
        List<OverviewSlaPercentageByMonthDto> slaPercentageByMonth = buildSlaPercentageByMonth(blocks, year);
        response.setSlaPercentageByMonth(slaPercentageByMonth);
        List<OverviewSlaPercentageByPurchaserDto> slaPercentageByPurchaser = buildSlaPercentageByPurchaser(blocks, year);
        response.setSlaPercentageByPurchaser(slaPercentageByPurchaser);
        logger.debug("Overview SLA data for year {}: {} blocks, {} month percentages, {} purchaser rows", year, blocks.size(), slaPercentageByMonth.size(), slaPercentageByPurchaser.size());
        return response;
    }

    /**
     * Процент закупок, уложившихся в плановый SLA, по месяцу завершения закупки (только завершённые закупки, назначение на закупщика не ранее 01.01.2026).
     * Плановый срок по сложности: 1→3, 2→7, 3→15, 4→30 рабочих дней.
     */
    private List<OverviewSlaPercentageByMonthDto> buildSlaPercentageByMonth(List<OverviewSlaBlockDto> blocks, int year) {
        List<OverviewSlaPercentageByMonthDto> result = new ArrayList<>(12);
        List<OverviewSlaRequestDto> allRequests = blocks.stream()
                .flatMap(b -> (b.getRequests() != null ? b.getRequests().stream() : java.util.stream.Stream.<OverviewSlaRequestDto>empty()))
                .collect(Collectors.toList());
        for (int month = 1; month <= 12; month++) {
            OverviewSlaPercentageByMonthDto dto = new OverviewSlaPercentageByMonthDto();
            dto.setMonth(month);
            int totalCompleted = 0;
            int metSla = 0;
            for (OverviewSlaRequestDto r : allRequests) {
                if (r.getPurchaseCompletionDate() == null || r.getApprovalAssignmentDate() == null) continue;
                LocalDateTime assignment = parseIsoDateTime(r.getApprovalAssignmentDate());
                LocalDateTime completion = parseIsoDateTime(r.getPurchaseCompletionDate());
                if (assignment == null || completion == null) continue;
                if (assignment.isBefore(SLA_ASSIGNMENT_CUTOFF)) continue;
                if (completion.getYear() != year || completion.getMonthValue() != month) continue;
                totalCompleted++;
                Integer planned = r.getPlannedSlaDays();
                if (planned == null) planned = getPlannedSlaDays(r.getComplexity());
                if (planned == null) continue;
                long factual = countWorkingDaysBetween(assignment, completion);
                if (factual <= planned) metSla++;
            }
            dto.setTotalCompleted(totalCompleted);
            dto.setMetSla(metSla);
            dto.setPercentage(totalCompleted > 0 ? (metSla * 100.0 / totalCompleted) : null);
            result.add(dto);
        }
        return result;
    }

    /**
     * Выполнение СЛА по году в разрезе закупщиков: для каждого закупщика — всего завершённых, уложившихся в SLA, процент.
     * Учитываются только закупки с назначением на закупщика не ранее 01.01.2026.
     */
    private List<OverviewSlaPercentageByPurchaserDto> buildSlaPercentageByPurchaser(List<OverviewSlaBlockDto> blocks, int year) {
        List<OverviewSlaRequestDto> allRequests = blocks.stream()
                .flatMap(b -> (b.getRequests() != null ? b.getRequests().stream() : java.util.stream.Stream.<OverviewSlaRequestDto>empty()))
                .collect(Collectors.toList());
        Map<String, int[]> byPurchaser = new LinkedHashMap<>();
        for (OverviewSlaRequestDto r : allRequests) {
            if (r.getPurchaseCompletionDate() == null || r.getApprovalAssignmentDate() == null) continue;
            LocalDateTime assignment = parseIsoDateTime(r.getApprovalAssignmentDate());
            LocalDateTime completion = parseIsoDateTime(r.getPurchaseCompletionDate());
            if (assignment == null || completion == null) continue;
            if (assignment.isBefore(SLA_ASSIGNMENT_CUTOFF)) continue;
            if (completion.getYear() != year) continue;
            String purchaser = r.getPurchaser();
            if (purchaser == null || purchaser.trim().isEmpty()) purchaser = "Не назначен";
            else purchaser = purchaser.trim();
            int[] counts = byPurchaser.computeIfAbsent(purchaser, k -> new int[2]);
            counts[0]++;
            Integer planned = r.getPlannedSlaDays();
            if (planned == null) planned = getPlannedSlaDays(r.getComplexity());
            if (planned != null) {
                long factual = countWorkingDaysBetween(assignment, completion);
                if (factual <= planned) counts[1]++;
            }
        }
        List<OverviewSlaPercentageByPurchaserDto> result = new ArrayList<>();
        for (Map.Entry<String, int[]> e : byPurchaser.entrySet()) {
            OverviewSlaPercentageByPurchaserDto dto = new OverviewSlaPercentageByPurchaserDto();
            dto.setPurchaser(e.getKey());
            int total = e.getValue()[0];
            int met = e.getValue()[1];
            dto.setTotalCompleted(total);
            dto.setMetSla(met);
            dto.setPercentage(total > 0 ? (met * 100.0 / total) : null);
            result.add(dto);
        }
        result.sort(Comparator.comparing(OverviewSlaPercentageByPurchaserDto::getPurchaser, (a, b) -> {
            if ("Не назначен".equals(a)) return 1;
            if ("Не назначен".equals(b)) return -1;
            return a.compareTo(b);
        }));
        return result;
    }

    private LocalDateTime parseIsoDateTime(String iso) {
        if (iso == null || iso.trim().isEmpty()) return null;
        try {
            return LocalDateTime.parse(iso.trim(), ISO_FORMAT);
        } catch (Exception e) {
            return null;
        }
    }

    /** Плановый срок SLA (рабочих дней): 1→3, 2→7, 3→15, 4→30. */
    private Integer getPlannedSlaDays(String complexity) {
        if (complexity == null || complexity.trim().isEmpty()) return null;
        switch (complexity.trim()) {
            case "1": return 3;
            case "2": return 7;
            case "3": return 15;
            case "4": return 30;
            default: return null;
        }
    }

    /** Рабочие дни между датами: со следующего дня после assignment по completion включительно. */
    private long countWorkingDaysBetween(LocalDateTime assignment, LocalDateTime completion) {
        return workingDayService.countFromDayAfterThroughInclusive(assignment, completion);
    }

    private static boolean isExcludedApprovalStage(String stage) {
        if (stage == null || stage.trim().isEmpty()) return true;
        String normalized = stage.trim().toLowerCase();
        return APPROVAL_EXCLUDED_STAGE_PREFIXES.stream().anyMatch(normalized::startsWith);
    }

    /**
     * Список всех уникальных форм документа из согласований договоров.
     * Для выпадающего фильтра на вкладке «Согласования».
     */
    public List<String> getApprovalDocumentForms() {
        List<String> list = contractApprovalRepository.findDistinctDocumentForms();
        return list != null ? list : Collections.emptyList();
    }

    /**
     * Сводная таблица согласований по ролям для выбранного года назначения и формы документа.
     * Объединяет данные из всех трёх таблиц согласований: по заявкам, закупкам и договорам.
     * Фильтр по году: год assignmentDate. Фильтр по форме документа: только для ContractApproval;
     * при заданной форме заявки/закупки исключаются.
     * Учитываются только завершённые согласования (completionDate IS NOT NULL).
     * Срок = рабочие дни от даты назначения до даты фактического завершения.
     * Для ContractApproval технические этапы (синхронизация, регистрация и т.д.) исключаются.
     *
     * @param year         год назначения (assignmentDate), null — без фильтра по году
     * @param documentForm форма документа для фильтра по ContractApproval, null/пусто — без фильтра
     */
    public OverviewApprovalsSummaryResponseDto getApprovalsSummaryByRole(Integer year, List<String> documentForms) {
        boolean filterByDocForm = documentForms != null && !documentForms.isEmpty();
        String docFormsParam = filterByDocForm ? String.join(",", documentForms) : null;

        // Ключ: роль → [суммарные дни, кол-во]
        Map<String, long[]> statsByRole = new LinkedHashMap<>();

        // Согласования договоров — фильтрация в БД
        List<Object[]> contractRows = contractApprovalRepository.findRoleAndDatesForSummary(year, docFormsParam);
        for (Object[] row : contractRows) {
            String role = ((String) row[0]).trim();
            LocalDateTime assignmentDate = toLocalDateTime(row[1]);
            LocalDateTime completionDate = toLocalDateTime(row[2]);
            long days = countWorkingDaysBetween(assignmentDate, completionDate);
            long[] stat = statsByRole.computeIfAbsent(role, k -> new long[2]);
            stat[0] += days;
            stat[1]++;
        }

        // Согласования заявок и закупок — только без фильтра по форме документа (договорной фильтр)
        if (!filterByDocForm) {
            List<Object[]> prRows = purchaseRequestApprovalRepository.findRoleAndDatesForSummary(year);
            for (Object[] row : prRows) {
                String role = ((String) row[0]).trim();
                LocalDateTime assignmentDate = toLocalDateTime(row[1]);
                LocalDateTime completionDate = toLocalDateTime(row[2]);
                Number daysInWork = (Number) row[3];
                long days = daysInWork != null ? daysInWork.longValue()
                        : countWorkingDaysBetween(assignmentDate, completionDate);
                long[] stat = statsByRole.computeIfAbsent(role, k -> new long[2]);
                stat[0] += days;
                stat[1]++;
            }

            List<Object[]> paRows = purchaseApprovalRepository.findRoleAndDatesForSummary(year);
            for (Object[] row : paRows) {
                String role = ((String) row[0]).trim();
                LocalDateTime assignmentDate = toLocalDateTime(row[1]);
                LocalDateTime completionDate = toLocalDateTime(row[2]);
                Number daysInWork = (Number) row[3];
                long days = daysInWork != null ? daysInWork.longValue()
                        : countWorkingDaysBetween(assignmentDate, completionDate);
                long[] stat = statsByRole.computeIfAbsent(role, k -> new long[2]);
                stat[0] += days;
                stat[1]++;
            }
        }

        List<OverviewApprovalSummaryRowDto> rows = new ArrayList<>();
        long totalCount = 0;
        long totalDaysSum = 0;
        for (Map.Entry<String, long[]> e : statsByRole.entrySet()) {
            long daysSum = e.getValue()[0];
            long count = e.getValue()[1];
            OverviewApprovalSummaryRowDto dto = new OverviewApprovalSummaryRowDto();
            dto.setYear(year != null ? year : 0);
            dto.setRole(e.getKey());
            dto.setCount((int) count);
            dto.setAvgDurationDays(count > 0 ? (double) daysSum / count : null);
            rows.add(dto);
            totalCount += count;
            totalDaysSum += daysSum;
        }
        rows.sort(Comparator.comparingInt(OverviewApprovalSummaryRowDto::getCount).reversed());

        OverviewApprovalsSummaryResponseDto response = new OverviewApprovalsSummaryResponseDto();
        response.setRows(rows);
        response.setTotalCount((int) totalCount);
        response.setTotalAvgDurationDays(totalCount > 0 ? (double) totalDaysSum / totalCount : null);
        logger.debug("Overview approvals summary: {} role rows, totalCount={} (year={}, documentForms={})",
                rows.size(), totalCount, year, documentForms);
        return response;
    }

    /**
     * Сводная таблица согласований по ФИО исполнителя (только договорные согласования).
     */
    public OverviewApprovalsGroupedResponseDto getApprovalsSummaryByPerson(Integer year, List<String> documentForms) {
        String docFormsParam = (documentForms != null && !documentForms.isEmpty()) ? String.join(",", documentForms) : null;
        List<Object[]> rows = contractApprovalRepository.findPersonAndDatesForSummary(year, docFormsParam);
        return buildPersonGroupedResponse(rows);
    }

    /**
     * Сводная таблица согласований по виду документа (только договорные согласования).
     */
    public OverviewApprovalsGroupedResponseDto getApprovalsSummaryByDocumentForm(Integer year) {
        List<Object[]> rows = contractApprovalRepository.findDocumentFormAndDatesForSummary(year);
        return buildGroupedResponse(rows);
    }

    /**
     * Сводка согласований «по документам»: срок каждого договора от первого назначения
     * до последнего фактического завершения (только не-технические этапы).
     */
    public OverviewContractDurationResponseDto getContractDurationSummary(Integer year, List<String> documentForms) {
        String docFormsParam = (documentForms != null && !documentForms.isEmpty()) ? String.join(",", documentForms) : null;
        List<Object[]> rawRows = contractApprovalRepository.findContractDurationForSummary(year, docFormsParam);
        List<OverviewContractDurationRowDto> rows = new ArrayList<>();
        long totalDays = 0;
        for (Object[] row : rawRows) {
            String innerId = row[0] != null ? row[0].toString().trim() : "—";
            String docForm = row[1] != null ? row[1].toString().trim() : "Не указан";
            LocalDateTime firstAssignment = toLocalDateTime(row[2]);
            LocalDateTime lastCompletion = toLocalDateTime(row[3]);
            boolean hasPurchaseRequest = row[4] != null && Boolean.TRUE.equals(row[4]);
            if (hasPurchaseRequest) {
                docForm = toProcurementDocumentForm(docForm);
            }
            long days = countWorkingDaysBetween(firstAssignment, lastCompletion);
            OverviewContractDurationRowDto dto = new OverviewContractDurationRowDto();
            dto.setInnerId(innerId);
            dto.setDocumentForm(docForm);
            dto.setDurationDays(days);
            dto.setProcurement(hasPurchaseRequest);
            rows.add(dto);
            totalDays += days;
        }
        OverviewContractDurationResponseDto response = new OverviewContractDurationResponseDto();
        response.setRows(rows);
        response.setTotalCount(rows.size());
        response.setAvgDurationDays(rows.isEmpty() ? null : (double) totalDays / rows.size());
        return response;
    }

    /**
     * Преобразует вид документа для договоров, связанных с заявкой на закупку.
     * «Договор...» → «Договор (закупочный)», «Спецификация...» → «Спецификация (Закупочная)».
     */
    private static String toProcurementDocumentForm(String docForm) {
        if (docForm == null) return "Договор (закупочный)";
        String lower = docForm.toLowerCase();
        if (lower.startsWith("спецификация")) return "Спецификация";
        return "Договор";
    }

    /**
     * Строит сгруппированный ответ из результата native-запроса.
     * Ожидаемые колонки: (key, assignment_date, completion_date[, contract_id]).
     * Если 4-я колонка (contract_id) присутствует, подсчитываются уникальные договоры на группу.
     */
    private OverviewApprovalsGroupedResponseDto buildGroupedResponse(List<Object[]> rawRows) {
        Map<String, long[]> statsByKey = new LinkedHashMap<>();
        Map<String, Set<Long>> contractIdsByKey = new LinkedHashMap<>();
        boolean hasContractIds = !rawRows.isEmpty() && rawRows.get(0).length >= 4;
        for (Object[] row : rawRows) {
            String key = row[0] != null ? row[0].toString().trim() : "—";
            LocalDateTime assignmentDate = toLocalDateTime(row[1]);
            LocalDateTime completionDate = toLocalDateTime(row[2]);
            long days = countWorkingDaysBetween(assignmentDate, completionDate);
            long[] stat = statsByKey.computeIfAbsent(key, k -> new long[2]);
            stat[0] += days;
            stat[1]++;
            if (hasContractIds && row[3] != null) {
                long contractId = ((Number) row[3]).longValue();
                contractIdsByKey.computeIfAbsent(key, k -> new HashSet<>()).add(contractId);
            }
        }
        List<OverviewApprovalsGroupedRowDto> resultRows = new ArrayList<>();
        long totalCount = 0;
        long totalDaysSum = 0;
        for (Map.Entry<String, long[]> e : statsByKey.entrySet()) {
            long daysSum = e.getValue()[0];
            long count = e.getValue()[1];
            OverviewApprovalsGroupedRowDto dto = new OverviewApprovalsGroupedRowDto();
            dto.setKey(e.getKey());
            dto.setCount((int) count);
            dto.setAvgDurationDays(count > 0 ? (double) daysSum / count : null);
            if (hasContractIds) {
                Set<Long> ids = contractIdsByKey.getOrDefault(e.getKey(), Collections.emptySet());
                dto.setDocumentCount(ids.size());
            }
            resultRows.add(dto);
            totalCount += count;
            totalDaysSum += daysSum;
        }
        resultRows.sort(Comparator.comparingInt(OverviewApprovalsGroupedRowDto::getCount).reversed());
        OverviewApprovalsGroupedResponseDto response = new OverviewApprovalsGroupedResponseDto();
        response.setRows(resultRows);
        response.setTotalCount((int) totalCount);
        response.setTotalAvgDurationDays(totalCount > 0 ? (double) totalDaysSum / totalCount : null);
        return response;
    }

    /**
     * Строит сгруппированный ответ по ФИО.
     * Колонки: (person_name, assignment_date, completion_date, department, role).
     * В поле department сохраняется наиболее частая роль из согласований (a.role).
     */
    private OverviewApprovalsGroupedResponseDto buildPersonGroupedResponse(List<Object[]> rawRows) {
        Map<String, long[]> statsByKey = new LinkedHashMap<>();
        // Для каждого ФИО считаем частоту каждой роли, чтобы выбрать наиболее частую
        Map<String, Map<String, Long>> roleFrequencyByKey = new LinkedHashMap<>();
        for (Object[] row : rawRows) {
            String key = row[0] != null ? row[0].toString().trim() : "—";
            LocalDateTime assignmentDate = toLocalDateTime(row[1]);
            LocalDateTime completionDate = toLocalDateTime(row[2]);
            long days = countWorkingDaysBetween(assignmentDate, completionDate);
            long[] stat = statsByKey.computeIfAbsent(key, k -> new long[2]);
            stat[0] += days;
            stat[1]++;
            // Берём роль из согласования (индекс 4), если нет — используем department (индекс 3)
            String role = null;
            if (row.length >= 5 && row[4] != null) {
                role = row[4].toString().trim();
            } else if (row.length >= 4 && row[3] != null) {
                role = row[3].toString().trim();
            }
            if (role != null && !role.isEmpty() && !"—".equals(role)) {
                Map<String, Long> freq = roleFrequencyByKey.computeIfAbsent(key, k -> new LinkedHashMap<>());
                freq.merge(role, 1L, Long::sum);
            }
        }
        List<OverviewApprovalsGroupedRowDto> resultRows = new ArrayList<>();
        long totalCount = 0;
        long totalDaysSum = 0;
        for (Map.Entry<String, long[]> e : statsByKey.entrySet()) {
            long daysSum = e.getValue()[0];
            long count = e.getValue()[1];
            OverviewApprovalsGroupedRowDto dto = new OverviewApprovalsGroupedRowDto();
            dto.setKey(e.getKey());
            dto.setCount((int) count);
            dto.setAvgDurationDays(count > 0 ? (double) daysSum / count : null);
            // Наиболее частая роль из согласований
            Map<String, Long> roleFreq = roleFrequencyByKey.get(e.getKey());
            String topRole = roleFreq != null ? roleFreq.entrySet().stream()
                    .max(Map.Entry.comparingByValue()).map(Map.Entry::getKey).orElse("—") : "—";
            dto.setDepartment(topRole);
            resultRows.add(dto);
            totalCount += count;
            totalDaysSum += daysSum;
        }
        resultRows.sort(Comparator.comparingInt(OverviewApprovalsGroupedRowDto::getCount).reversed());
        OverviewApprovalsGroupedResponseDto response = new OverviewApprovalsGroupedResponseDto();
        response.setRows(resultRows);
        response.setTotalCount((int) totalCount);
        response.setTotalAvgDurationDays(totalCount > 0 ? (double) totalDaysSum / totalCount : null);
        return response;
    }

    /** Конвертирует значение из native-запроса в LocalDateTime. */
    private static LocalDateTime toLocalDateTime(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDateTime ldt) return ldt;
        if (value instanceof java.sql.Timestamp ts) return ts.toLocalDateTime();
        if (value instanceof java.sql.Date d) return d.toLocalDate().atStartOfDay();
        return null;
    }

    /**
     * Данные для вкладки «План закупок» по месяцам.
     * @param year год планирования
     * @param months месяцы (1–12, календарные)
     */
    public OverviewPurchasePlanMonthsResponseDto getPurchasePlanMonthsData(int year, List<Integer> months) {
        OverviewPurchasePlanMonthsResponseDto response = new OverviewPurchasePlanMonthsResponseDto();
        response.setYear(year);
        if (months == null || months.isEmpty()) {
            response.setMonths(Collections.emptyList());
            return response;
        }
        List<PurchasePlanVersionDto> versions = purchasePlanVersionService.getVersionsByYear(year);
        List<OverviewMonthBlockDto> monthBlocks = new ArrayList<>();
        for (int calendarMonth : months) {
            OverviewMonthBlockDto block = buildMonthBlock(year, calendarMonth, versions);
            monthBlocks.add(block);
        }
        response.setMonths(monthBlocks);
        logger.debug("Overview purchase-plan months for year {} months {}: {} blocks", year, months, monthBlocks.size());
        return response;
    }

    private OverviewSlaRequestDto toOverviewSlaRequest(PurchaseRequestDto dto) {
        OverviewSlaRequestDto r = new OverviewSlaRequestDto();
        r.setId(dto.getId());
        r.setIdPurchaseRequest(dto.getIdPurchaseRequest());
        String name = (dto.getTitle() != null && !dto.getTitle().trim().isEmpty())
                ? dto.getTitle().trim()
                : (dto.getName() != null ? dto.getName().trim() : "—");
        r.setName(name);
        r.setBudgetAmount(dto.getBudgetAmount());
        r.setPurchaser(dto.getPurchaser());
        r.setComplexity(dto.getComplexity());
        r.setPlannedSlaDays(dto.getPlannedSlaDays());
        r.setStatus(dto.getStatus() != null ? dto.getStatus().getDisplayName() : null);
        r.setApprovalAssignmentDate(dto.getApprovalAssignmentDate() != null
                ? dto.getApprovalAssignmentDate().format(ISO_FORMAT) : null);
        r.setPurchaseCompletionDate(dto.getPurchaseCompletionDate() != null
                ? dto.getPurchaseCompletionDate().format(ISO_FORMAT) : null);
        return r;
    }

    private OverviewMonthBlockDto buildMonthBlock(int year, int calendarMonth, List<PurchasePlanVersionDto> versions) {
        OverviewMonthBlockDto block = new OverviewMonthBlockDto();
        block.setYear(year);
        block.setMonth(calendarMonth);
        int monthZeroBased = calendarMonth - 1;
        List<PurchasePlanVersionDto> inMonth = versions.stream()
                .filter(v -> v.getCreatedAt() != null
                        && v.getCreatedAt().getYear() == year
                        && v.getCreatedAt().getMonthValue() == calendarMonth)
                .sorted(Comparator.comparing(PurchasePlanVersionDto::getVersionNumber).reversed())
                .collect(Collectors.toList());
        PurchasePlanVersionDto latestInMonth = inMonth.isEmpty() ? null : inMonth.get(0);
        if (latestInMonth == null) {
            block.setVersion(null);
            block.setItems(Collections.emptyList());
            block.setItemsMarket(Collections.emptyList());
            block.setPositionsCount(0);
            block.setPositionsMarketCount(0);
            block.setPositionsLinkedToRequestCount(0);
            block.setPositionsExcludedCount(0);
            block.setRequestsPurchaseCreatedInMonthCount(0);
            block.setRequestsPurchasePlannedCount(0);
            block.setRequestsPurchaseNonPlannedCount(0);
            block.setRequestsPurchaseUnapprovedCount(0);
            block.setRequestsPurchaseExcludedCount(0);
            block.setSummaryByCfo(Collections.emptyList());
            return block;
        }
        block.setVersion(toOverviewPlanVersion(latestInMonth));
        List<PurchasePlanItemDto> allItems = purchasePlanVersionService.getVersionItems(latestInMonth.getId());
        LocalDate monthStart = LocalDate.of(year, calendarMonth, 1);
        LocalDate monthEnd = monthStart.withDayOfMonth(monthStart.lengthOfMonth());
        List<PurchasePlanItemDto> itemsInMonth = allItems.stream()
                .filter(item -> {
                    if (item.getRequestDate() == null) return false;
                    return !item.getRequestDate().isBefore(monthStart) && !item.getRequestDate().isAfter(monthEnd);
                })
                .collect(Collectors.toList());
        List<OverviewPlanItemDto> overviewItems = itemsInMonth.stream().map(this::toOverviewPlanItem).collect(Collectors.toList());
        block.setItems(overviewItems);
        block.setPositionsCount(overviewItems.size());
        List<OverviewPlanItemDto> marketItems = overviewItems.stream()
                .filter(i -> i.getPurchaserCompany() != null && "market".equalsIgnoreCase(i.getPurchaserCompany().trim()))
                .collect(Collectors.toList());
        block.setItemsMarket(marketItems);
        block.setPositionsMarketCount(marketItems.size());
        block.setPositionsLinkedToRequestCount((int) overviewItems.stream().filter(i -> i.getPurchaseRequestId() != null).count());
        block.setPositionsExcludedCount((int) overviewItems.stream()
                .filter(i -> i.getStatus() != null && "Исключена".equals(i.getStatus().trim()))
                .count());
        int requestsCount = fetchRequestsCountForMonth(year, calendarMonth);
        block.setRequestsPurchaseCreatedInMonthCount(requestsCount);
        var requestCounts = purchaseRequestService.getOverviewPurchaseRequestCountsForMonth(year, calendarMonth);
        block.setRequestsPurchasePlannedCount(requestCounts.getPlanned());
        block.setRequestsPurchaseNonPlannedCount(requestCounts.getNonPlanned());
        block.setRequestsPurchaseUnapprovedCount(requestCounts.getUnapproved());
        block.setRequestsPurchaseExcludedCount(requestCounts.getExcluded());
        Map<String, Integer> requestsByCfo = new HashMap<>();
        Map<String, BigDecimal> sumByCfo = new HashMap<>();
        Map<String, Integer> requestsPlannedByCfo = new HashMap<>();
        Map<String, Integer> requestsNonPlannedByCfo = new HashMap<>();
        Map<String, Integer> requestsUnapprovedByCfo = new HashMap<>();
        Map<String, Integer> requestsExcludedByCfo = new HashMap<>();
        if (requestsCount > 0) {
            Page<PurchaseRequestDto> requestsPage = purchaseRequestService.findAll(
                    0, Math.min(requestsCount, 2000),
                    null, null, null, null,
                    null, null, null, null, null, null, null, null,
                    null, null, true, null, false,
                    null, null, false, year, calendarMonth);
            for (PurchaseRequestDto pr : requestsPage.getContent()) {
                String cfoKey = normalizeCfoKey(pr.getCfo());
                requestsByCfo.merge(cfoKey, 1, Integer::sum);
                BigDecimal amount = pr.getBudgetAmount() != null ? pr.getBudgetAmount() : BigDecimal.ZERO;
                sumByCfo.merge(cfoKey, amount, BigDecimal::add);
                boolean isUnapproved = pr.getStatus() == PurchaseRequestStatus.NOT_APPROVED;
                boolean isExcluded = Boolean.TRUE.equals(pr.getExcludeFromInWork());
                if (isUnapproved) {
                    requestsUnapprovedByCfo.merge(cfoKey, 1, Integer::sum);
                } else if (isExcluded) {
                    requestsExcludedByCfo.merge(cfoKey, 1, Integer::sum);
                } else if (Boolean.TRUE.equals(pr.getHasLinkedPlanItem())) {
                    requestsPlannedByCfo.merge(cfoKey, 1, Integer::sum);
                } else {
                    requestsNonPlannedByCfo.merge(cfoKey, 1, Integer::sum);
                }
            }
        }
        Set<String> cfoKeys = new TreeSet<>((a, b) -> {
            if ("—".equals(a)) return 1;
            if ("—".equals(b)) return -1;
            return a.compareTo(b);
        });
        overviewItems.forEach(i -> cfoKeys.add(normalizeCfoKey(i.getCfo())));
        cfoKeys.addAll(requestsByCfo.keySet());
        List<OverviewCfoSummaryRowDto> summaryRows = new ArrayList<>();
        for (String cfoKey : cfoKeys) {
            OverviewCfoSummaryRowDto row = new OverviewCfoSummaryRowDto();
            row.setCfo(cfoKey);
            List<OverviewPlanItemDto> itemsCfo = overviewItems.stream()
                    .filter(i -> cfoKey.equals(normalizeCfoKey(i.getCfo())))
                    .collect(Collectors.toList());
            int market = (int) itemsCfo.stream().filter(i -> i.getPurchaserCompany() != null && "market".equalsIgnoreCase(i.getPurchaserCompany().trim())).count();
            int linked = (int) itemsCfo.stream().filter(i -> i.getPurchaseRequestId() != null).count();
            int excluded = (int) itemsCfo.stream().filter(i -> i.getStatus() != null && "Исключена".equals(i.getStatus().trim())).count();
            row.setMarket(market);
            row.setLinked(linked);
            row.setExcluded(excluded);
            row.setRequestsPurchase(requestsByCfo.getOrDefault(cfoKey, 0));
            row.setRequestsPlanned(requestsPlannedByCfo.getOrDefault(cfoKey, 0));
            row.setRequestsNonPlanned(requestsNonPlannedByCfo.getOrDefault(cfoKey, 0));
            row.setRequestsUnapproved(requestsUnapprovedByCfo.getOrDefault(cfoKey, 0));
            row.setRequestsExcluded(requestsExcludedByCfo.getOrDefault(cfoKey, 0));
            List<OverviewPlanItemDto> marketItemsCfo = itemsCfo.stream()
                    .filter(i -> i.getPurchaserCompany() != null && "market".equalsIgnoreCase(i.getPurchaserCompany().trim()))
                    .collect(Collectors.toList());
            BigDecimal sumMarket = marketItemsCfo.stream()
                    .map(OverviewPlanItemDto::getBudgetAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            row.setSumMarket(sumMarket);
            row.setSumRequests(sumByCfo.getOrDefault(cfoKey, BigDecimal.ZERO));
            summaryRows.add(row);
        }
        block.setSummaryByCfo(summaryRows);
        return block;
    }

    private int fetchRequestsCountForMonth(int year, int calendarMonth) {
        Page<PurchaseRequestDto> page = purchaseRequestService.findAll(
                0, 1, null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, true, null, false,
                null, null, false, year, calendarMonth);
        return (int) page.getTotalElements();
    }

    private OverviewPlanVersionDto toOverviewPlanVersion(PurchasePlanVersionDto dto) {
        OverviewPlanVersionDto v = new OverviewPlanVersionDto();
        v.setId(dto.getId());
        v.setVersionNumber(dto.getVersionNumber());
        v.setYear(dto.getYear());
        v.setDescription(dto.getDescription());
        v.setCreatedAt(dto.getCreatedAt());
        v.setIsCurrent(dto.getIsCurrent());
        v.setItemsCount(dto.getItemsCount());
        return v;
    }

    /**
     * Нормализует ключ ЦФО для сводки: убирает скрытые/неразрывные пробелы, схлопывает повторяющиеся пробелы.
     * Устраняет дубли строк из-за различий в пробелах (например, "ЦФО1" и "ЦФО1 ").
     */
    private static String normalizeCfoKey(String cfo) {
        if (cfo == null || cfo.isEmpty()) {
            return "—";
        }
        String s = cfo.trim();
        if (s.isEmpty()) {
            return "—";
        }
        // Все виды пробелов (включая неразрывный \u00A0, thin space и т.д.) заменяем на обычный пробел
        s = s.replaceAll("\\s+", " ");
        s = s.trim();
        return s.isEmpty() ? "—" : s;
    }

    private OverviewPlanItemDto toOverviewPlanItem(PurchasePlanItemDto dto) {
        OverviewPlanItemDto o = new OverviewPlanItemDto();
        o.setId(dto.getId());
        o.setRequestDate(dto.getRequestDate());
        o.setPurchaserCompany(dto.getPurchaserCompany());
        o.setPurchaseRequestId(dto.getPurchaseRequestId());
        o.setStatus(dto.getStatus() != null ? dto.getStatus().getDisplayName() : null);
        o.setCfo(dto.getCfo());
        o.setBudgetAmount(dto.getBudgetAmount());
        return o;
    }

    /**
     * Данные для диаграммы ЕК: сводка за год по фильтру назначения на закупщика (расчёт на бэкенде).
     * Учитываются заявки с типом закупка (requiresPurchase=true). Не учитываются: Проект, не согласованные, не утверждённые, исключённые, из в работе.
     * Возвращает: totalAmount — сумма всех таких заявок; singleSourceAmount — сумма заявок, у которых связанная закупка со способом закупки «у единственного источника»; percentSingleSource — процент singleSourceAmount к totalAmount.
     * Год — год назначения на закупщика. Если по году назначения данных нет, используется год создания заявки.
     */
    public OverviewEkChartResponseDto getEkChartData(int year) {
        List<Long> singleSourceIdsRaw = purchaseRepository.findDistinctPurchaseRequestIdByPurchaseMethodContaining(SINGLE_SOURCE_MCC_SUBSTRING);
        Set<Long> singleSourceRequestIds = singleSourceIdsRaw.stream()
                .filter(java.util.Objects::nonNull)
                .map(id -> id instanceof Long ? id : Long.valueOf(((Number) id).longValue()))
                .collect(Collectors.toSet());
        logger.info("Overview EK: single-source purchase request IDs (purchaseMethod contains '{}'): {} count, sample: {}",
                SINGLE_SOURCE_MCC_SUBSTRING, singleSourceRequestIds.size(),
                singleSourceIdsRaw.isEmpty() ? "none" : singleSourceIdsRaw.subList(0, Math.min(5, singleSourceIdsRaw.size())));
        int pageSize = 50_000;
        // Сначала по году назначения на закупщика (assignment_date в этапе «Утверждение заявки на ЗП»)
        Page<PurchaseRequestDto> page = purchaseRequestService.findAll(
                0, pageSize,
                null, null, null, null,
                null, null, null, null, null, null, null, null,
                null, null, true, null, true,
                null, null, false, year, null);
        List<PurchaseRequestDto> list = page.getContent();
        boolean byAssignmentYear = true;
        if (list.isEmpty() && page.getTotalElements() == 0) {
            // Нет данных по году назначения (например, не загружен отчёт с этапами) — берём по году создания заявки
            logger.info("Overview EK: no data for assignment year {}, falling back to creation year", year);
            byAssignmentYear = false;
            page = purchaseRequestService.findAll(
                    0, pageSize,
                    year, null, null, null,
                    null, null, null, null, null, null, null, null,
                    null, null, true, null, true,
                    null, null, false, null, null);
            list = page.getContent();
        }
        if (page.getTotalPages() > 1) {
            List<PurchaseRequestDto> all = new ArrayList<>(list);
            for (int p = 1; p < page.getTotalPages(); p++) {
                Page<PurchaseRequestDto> next = purchaseRequestService.findAll(
                        p, pageSize,
                        byAssignmentYear ? null : year, null, null, null,
                        null, null, null, null, null, null, null, null,
                        null, null, true, null, true,
                        null, null, false, byAssignmentYear ? year : null, null);
                all.addAll(next.getContent());
            }
            list = all;
        }
        String yearType = byAssignmentYear ? "assignment" : "creation";
        String baseCurrency = overviewEkProperties.getBaseCurrency();
        // Нужен ли перевод по курсу: есть ли заявки с валютой, отличной от базовой
        boolean needsConversion = list.stream()
                .map(PurchaseRequestDto::getCurrency)
                .filter(c -> c != null && !c.isBlank())
                .map(String::trim)
                .anyMatch(c -> !c.equalsIgnoreCase(baseCurrency));
        boolean amountsInBaseCurrency = needsConversion;

        // Группировка по ЦФО
        Map<String, List<PurchaseRequestDto>> byCfo = list.stream()
                .collect(Collectors.groupingBy(pr -> {
                    String c = pr.getCfo();
                    return (c != null && !c.isBlank()) ? c.trim() : "(без ЦФО)";
                }));

        List<OverviewEkChartRowDto> rows = new ArrayList<>();
        for (Map.Entry<String, List<PurchaseRequestDto>> e : byCfo.entrySet()) {
            String cfo = e.getKey();
            List<PurchaseRequestDto> group = e.getValue();
            BigDecimal totalAmount = group.stream()
                    .map(pr -> overviewEkProperties.toBaseCurrency(
                            pr.getBudgetAmount() != null ? pr.getBudgetAmount() : BigDecimal.ZERO,
                            pr.getCurrency()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            List<PurchaseRequestDto> singleInGroup = group.stream()
                    .filter(pr -> pr.getIdPurchaseRequest() != null && singleSourceRequestIds.contains(pr.getIdPurchaseRequest()))
                    .toList();
            BigDecimal singleSupplierAmount = singleInGroup.stream()
                    .map(pr -> overviewEkProperties.toBaseCurrency(
                            pr.getBudgetAmount() != null ? pr.getBudgetAmount() : BigDecimal.ZERO,
                            pr.getCurrency()))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal percentByAmount = BigDecimal.ZERO;
            if (totalAmount.compareTo(BigDecimal.ZERO) > 0 && singleSupplierAmount.compareTo(BigDecimal.ZERO) > 0) {
                percentByAmount = singleSupplierAmount.multiply(BigDecimal.valueOf(100))
                        .divide(totalAmount, 2, java.math.RoundingMode.HALF_UP);
            }
            Set<String> currenciesInGroup = group.stream()
                    .map(PurchaseRequestDto::getCurrency)
                    .filter(c -> c != null && !c.isBlank())
                    .map(String::trim)
                    .collect(Collectors.toSet());
            String rowCurrency = amountsInBaseCurrency
                    ? baseCurrency
                    : (currenciesInGroup.isEmpty() ? null : (currenciesInGroup.size() == 1 ? currenciesInGroup.iterator().next() : "mixed"));

            OverviewEkChartRowDto row = new OverviewEkChartRowDto();
            row.setCfo(cfo);
            row.setCurrency(rowCurrency);
            row.setTotalCount(group.size());
            row.setSingleSupplierCount(singleInGroup.size());
            row.setTotalAmount(totalAmount);
            row.setSingleSupplierAmount(singleSupplierAmount);
            row.setPercentByAmount(percentByAmount);
            rows.add(row);
        }
        rows.sort(Comparator.comparing(OverviewEkChartRowDto::getCfo, Comparator.nullsLast(Comparator.naturalOrder())));
        logger.debug("Overview EK chart for year {}: {} CFO rows (yearType={}, amountsInBaseCurrency={})",
                year, rows.size(), yearType, amountsInBaseCurrency);
        return new OverviewEkChartResponseDto(yearType, rows, amountsInBaseCurrency ? baseCurrency : null, amountsInBaseCurrency);
    }

    private static final String STAGE_PREPARATION = "Подготовка ЗнЗ";
    private static final String STAGE_APPROVAL = "Согласование ЗнЗ";
    private static final String STAGE_PURCHASE = "Закупка";
    private static final String STAGE_PURCHASE_GENERAL = "Закупка Общий";
    private static final String STAGE_PURCHASE_RESULT = "Закупка Итоги";
    private static final String STAGE_CONTRACT_PREP = "Подготовка договора";
    private static final String STAGE_CONTRACT_APPROVAL = "Согласование договора";
    private static final String STAGE_TOTAL = "Срок";
    /** Значение сложности для заявок без указанной сложности. */
    private static final String COMPLEXITY_NONE = "—";

    /**
     * Данные для вкладки «Сроки закупок»: средние рабочие дни по этапам, сгруппированные по годам.
     * Этап «Подготовка ЗнЗ»: от даты создания заявки до даты первого назначения согласования.
     * Этап «Согласование ЗнЗ»: от первого назначения согласования до последнего завершения (день назначения не считается).
     * Этап «Закупка»: от даты назначения на утверждение закупщика (или последнего завершения ЗнЗ) до последнего завершения согласования закупки.
     * Этап «Подготовка договора»: от последнего завершения согласования закупки до даты создания первого договора (день завершения закупки не считается).
     * «Срок»: сумма всех этапов.
     */
    public OverviewTimelinesResponseDto getTimelinesData(boolean onlySignedContracts) {
        List<String> stages = List.of(STAGE_PREPARATION, STAGE_APPROVAL, STAGE_PURCHASE, STAGE_PURCHASE_GENERAL, STAGE_PURCHASE_RESULT, STAGE_CONTRACT_PREP, STAGE_CONTRACT_APPROVAL, STAGE_TOTAL);
        List<Object[]> rawRows = purchaseRequestApprovalRepository.findCreationAndFirstAssignmentDates();

        // Этап 5: Согласование договора — загружаем данные отдельным запросом
        // purchase_request_id → максимальные рабочие дни среди всех связанных договоров
        Map<Long, Long> contractApprovalDaysByPr = buildContractApprovalDaysMap();

        // Ключ группировки: year + complexity
        // year → accumulator, year+complexity → accumulator
        Map<Integer, TimelineAccumulator> byYear = new TreeMap<>();
        // year → (complexity → accumulator)
        Map<Integer, Map<String, TimelineAccumulator>> byYearComplexity = new TreeMap<>();
        for (Object[] row : rawRows) {
            java.sql.Timestamp creationTs = (java.sql.Timestamp) row[1];
            java.sql.Timestamp assignmentTs = (java.sql.Timestamp) row[2];
            java.sql.Timestamp completionTs = row[3] != null ? (java.sql.Timestamp) row[3] : null;
            java.sql.Timestamp approvalAssignmentTs = row[4] != null ? (java.sql.Timestamp) row[4] : null;
            java.sql.Timestamp purchaseCompletionTs = row[5] != null ? (java.sql.Timestamp) row[5] : null;
            String complexity = row[6] != null ? row[6].toString().trim() : "";
            java.sql.Timestamp contractCreationTs = row[7] != null ? (java.sql.Timestamp) row[7] : null;
            String status = row[8] != null ? row[8].toString() : null;
            java.sql.Timestamp purchaseFirstAssignmentTs = row[9] != null ? (java.sql.Timestamp) row[9] : null;
            if (complexity.isEmpty()) complexity = "—";
            if (creationTs == null || assignmentTs == null) continue;
            // Исключаем заявки без назначения на утверждение
            if (approvalAssignmentTs == null) continue;
            // Фильтр «Только подписанные договора»
            if (onlySignedContracts && !"CONTRACT_SIGNED".equals(status)) continue;
            Long prId = ((Number) row[0]).longValue();
            LocalDateTime creation = creationTs.toLocalDateTime();
            LocalDateTime assignment = assignmentTs.toLocalDateTime();
            int year = assignment.getYear();
            TimelineAccumulator yearAcc = byYear.computeIfAbsent(year, k -> new TimelineAccumulator());
            TimelineAccumulator complexityAcc = byYearComplexity
                    .computeIfAbsent(year, k -> new TreeMap<>())
                    .computeIfAbsent(complexity, k -> new TimelineAccumulator());
            // Этап 1: Подготовка ЗнЗ
            long prepDays = countWorkingDaysBetweenDates(creation, assignment);
            yearAcc.addPrep(prepDays);
            complexityAcc.addPrep(prepDays);
            // Этап 2: Согласование ЗнЗ
            if (completionTs != null) {
                LocalDateTime completion = completionTs.toLocalDateTime();
                long approvalDays = countWorkingDaysBetween(assignment, completion);
                yearAcc.addApproval(approvalDays);
                complexityAcc.addApproval(approvalDays);
            }
            // Этап 3: Закупка (общий — от назначения на закупщика до завершения последнего согласования закупки)
            if (purchaseCompletionTs != null) {
                LocalDateTime purchaseCompletion = purchaseCompletionTs.toLocalDateTime();
                LocalDateTime purchaseStart = approvalAssignmentTs != null
                        ? approvalAssignmentTs.toLocalDateTime()
                        : (completionTs != null ? completionTs.toLocalDateTime() : null);
                if (purchaseStart != null) {
                    long purchaseDays = countWorkingDaysBetween(purchaseStart, purchaseCompletion);
                    yearAcc.addPurchase(purchaseDays);
                    complexityAcc.addPurchase(purchaseDays);
                }
            }
            // Этап 3а: Закупка Общий (от назначения на закупщика до первого назначения согласования закупки)
            if (approvalAssignmentTs != null && purchaseFirstAssignmentTs != null) {
                long generalDays = countWorkingDaysBetween(approvalAssignmentTs.toLocalDateTime(), purchaseFirstAssignmentTs.toLocalDateTime());
                yearAcc.addPurchaseGeneral(generalDays);
                complexityAcc.addPurchaseGeneral(generalDays);
            }
            // Этап 3б: Закупка Итоги (от первого назначения согласования закупки до последнего завершения)
            if (purchaseFirstAssignmentTs != null && purchaseCompletionTs != null) {
                long resultDays = countWorkingDaysBetween(purchaseFirstAssignmentTs.toLocalDateTime(), purchaseCompletionTs.toLocalDateTime());
                yearAcc.addPurchaseResult(resultDays);
                complexityAcc.addPurchaseResult(resultDays);
            }
            // Этап 4: Подготовка договора (от завершения закупки до создания первого договора, день завершения не считается)
            if (purchaseCompletionTs != null && contractCreationTs != null) {
                LocalDateTime purchaseCompletion = purchaseCompletionTs.toLocalDateTime();
                LocalDateTime contractCreation = contractCreationTs.toLocalDateTime();
                long contractPrepDays = countWorkingDaysBetween(purchaseCompletion, contractCreation);
                yearAcc.addContractPrep(contractPrepDays);
                complexityAcc.addContractPrep(contractPrepDays);
            }
            // Этап 5: Согласование договора (от первого назначения до регистрации, самый долгий договор)
            Long caMaxDays = contractApprovalDaysByPr.get(prId);
            if (caMaxDays != null) {
                yearAcc.addContractApproval(caMaxDays);
                complexityAcc.addContractApproval(caMaxDays);
            }
        }
        List<OverviewTimelinesYearRowDto> resultRows = new ArrayList<>();
        for (Map.Entry<Integer, TimelineAccumulator> entry : byYear.entrySet()) {
            int year = entry.getKey();
            TimelineAccumulator acc = entry.getValue();
            Map<String, Double> avgByStage = buildAvgByStage(acc);
            // Вложенные строки по сложности
            Map<String, TimelineAccumulator> complexityMap = byYearComplexity.getOrDefault(year, Collections.emptyMap());
            List<OverviewTimelinesComplexityRowDto> complexityRows = new ArrayList<>();
            for (Map.Entry<String, TimelineAccumulator> cEntry : complexityMap.entrySet()) {
                TimelineAccumulator cAcc = cEntry.getValue();
                Map<String, Double> cAvg = buildAvgByStage(cAcc);
                complexityRows.add(new OverviewTimelinesComplexityRowDto(cEntry.getKey(), cAcc.count, cAvg));
            }
            resultRows.add(new OverviewTimelinesYearRowDto(year, acc.count, avgByStage, complexityRows));
        }
        return new OverviewTimelinesResponseDto(stages, resultRows);
    }

    private Map<String, Double> buildAvgByStage(TimelineAccumulator acc) {
        Map<String, Double> avgByStage = new LinkedHashMap<>();
        double prepAvg = roundAvg(acc.prepDays);
        double approvalAvg = roundAvg(acc.approvalDays);
        double purchaseAvg = roundAvg(acc.purchaseDays);
        double purchaseGeneralAvg = roundAvg(acc.purchaseGeneralDays);
        double purchaseResultAvg = roundAvg(acc.purchaseResultDays);
        double contractPrepAvg = roundAvg(acc.contractPrepDays);
        double contractApprovalAvg = roundAvg(acc.contractApprovalDays);
        avgByStage.put(STAGE_PREPARATION, prepAvg);
        avgByStage.put(STAGE_APPROVAL, approvalAvg);
        avgByStage.put(STAGE_PURCHASE, purchaseAvg);
        avgByStage.put(STAGE_PURCHASE_GENERAL, purchaseGeneralAvg);
        avgByStage.put(STAGE_PURCHASE_RESULT, purchaseResultAvg);
        avgByStage.put(STAGE_CONTRACT_PREP, contractPrepAvg);
        avgByStage.put(STAGE_CONTRACT_APPROVAL, contractApprovalAvg);
        avgByStage.put(STAGE_TOTAL, Math.round((prepAvg + approvalAvg + purchaseAvg + contractPrepAvg + contractApprovalAvg) * 10.0) / 10.0);
        return avgByStage;
    }

    /**
     * Возвращает список заявок на закупку (DTO) с рабочими днями по этапам,
     * участвовавших в расчёте для указанного года и сложности.
     */
    public List<OverviewTimelinesRequestDto> getTimelinesRequests(int year, String complexity, boolean onlySignedContracts) {
        List<Object[]> rawRows = purchaseRequestApprovalRepository.findCreationAndFirstAssignmentDates();
        // id → row (для вычисления дней по этапам)
        List<Long> ids = new ArrayList<>();
        Map<Long, Object[]> rowById = new LinkedHashMap<>();
        for (Object[] row : rawRows) {
            java.sql.Timestamp assignmentTs = (java.sql.Timestamp) row[2];
            if (assignmentTs == null) continue;
            java.sql.Timestamp approvalAssignmentTs = row[4] != null ? (java.sql.Timestamp) row[4] : null;
            if (approvalAssignmentTs == null) continue;
            String status = row[8] != null ? row[8].toString() : null;
            if (onlySignedContracts && !"CONTRACT_SIGNED".equals(status)) continue;
            int rowYear = assignmentTs.toLocalDateTime().getYear();
            if (rowYear != year) continue;
            String rowComplexity = row[6] != null ? row[6].toString().trim() : "";
            if (rowComplexity.isEmpty()) rowComplexity = COMPLEXITY_NONE;
            if (!rowComplexity.equals(complexity)) continue;
            Long id = ((Number) row[0]).longValue();
            ids.add(id);
            rowById.put(id, row);
        }
        if (ids.isEmpty()) return Collections.emptyList();
        Map<Long, PurchaseRequestDto> dtoMap = purchaseRequestService.findByIdPurchaseRequestList(ids);
        Map<Long, Long> contractApprovalDaysByPr = buildContractApprovalDaysMap();
        List<OverviewTimelinesRequestDto> result = new ArrayList<>();
        for (Long id : ids) {
            PurchaseRequestDto dto = dtoMap.get(id);
            if (dto == null) continue;
            Object[] row = rowById.get(id);
            Map<String, Long> daysByStage = computeDaysByStage(row, contractApprovalDaysByPr.get(id));
            result.add(new OverviewTimelinesRequestDto(dto, daysByStage));
        }
        return result;
    }

    /** Вычисляет рабочие дни по каждому этапу для одной заявки (из строки SQL-запроса). */
    private Map<String, Long> computeDaysByStage(Object[] row, Long contractApprovalDays) {
        Map<String, Long> days = new LinkedHashMap<>();
        java.sql.Timestamp creationTs = (java.sql.Timestamp) row[1];
        java.sql.Timestamp assignmentTs = (java.sql.Timestamp) row[2];
        java.sql.Timestamp completionTs = row[3] != null ? (java.sql.Timestamp) row[3] : null;
        java.sql.Timestamp approvalAssignmentTs = row[4] != null ? (java.sql.Timestamp) row[4] : null;
        java.sql.Timestamp purchaseCompletionTs = row[5] != null ? (java.sql.Timestamp) row[5] : null;
        java.sql.Timestamp contractCreationTs = row[7] != null ? (java.sql.Timestamp) row[7] : null;
        java.sql.Timestamp purchaseFirstAssignmentTs = row.length > 9 && row[9] != null ? (java.sql.Timestamp) row[9] : null;

        // Этап 1: Подготовка ЗнЗ
        if (creationTs != null && assignmentTs != null) {
            days.put(STAGE_PREPARATION, countWorkingDaysBetweenDates(creationTs.toLocalDateTime(), assignmentTs.toLocalDateTime()));
        }
        // Этап 2: Согласование ЗнЗ
        if (assignmentTs != null && completionTs != null) {
            days.put(STAGE_APPROVAL, countWorkingDaysBetween(assignmentTs.toLocalDateTime(), completionTs.toLocalDateTime()));
        }
        // Этап 3: Закупка
        if (purchaseCompletionTs != null) {
            LocalDateTime purchaseStart = approvalAssignmentTs != null
                    ? approvalAssignmentTs.toLocalDateTime()
                    : (completionTs != null ? completionTs.toLocalDateTime() : null);
            if (purchaseStart != null) {
                days.put(STAGE_PURCHASE, countWorkingDaysBetween(purchaseStart, purchaseCompletionTs.toLocalDateTime()));
            }
        }
        // Этап 3а: Закупка Общий (от назначения на закупщика до первого назначения согласования закупки)
        if (approvalAssignmentTs != null && purchaseFirstAssignmentTs != null) {
            days.put(STAGE_PURCHASE_GENERAL, countWorkingDaysBetween(approvalAssignmentTs.toLocalDateTime(), purchaseFirstAssignmentTs.toLocalDateTime()));
        }
        // Этап 3б: Закупка Итоги (от первого назначения согласования закупки до последнего завершения)
        if (purchaseFirstAssignmentTs != null && purchaseCompletionTs != null) {
            days.put(STAGE_PURCHASE_RESULT, countWorkingDaysBetween(purchaseFirstAssignmentTs.toLocalDateTime(), purchaseCompletionTs.toLocalDateTime()));
        }
        // Этап 4: Подготовка договора
        if (purchaseCompletionTs != null && contractCreationTs != null) {
            days.put(STAGE_CONTRACT_PREP, countWorkingDaysBetween(purchaseCompletionTs.toLocalDateTime(), contractCreationTs.toLocalDateTime()));
        }
        // Этап 5: Согласование договора
        if (contractApprovalDays != null) {
            days.put(STAGE_CONTRACT_APPROVAL, contractApprovalDays);
        }
        // Итого
        long total = days.values().stream().mapToLong(Long::longValue).sum();
        days.put(STAGE_TOTAL, total);
        return days;
    }

    /**
     * Строит карту purchase_request_id → максимальные рабочие дни согласования договора.
     * Для каждого договора: от первого назначения согласования до завершения регистрации.
     * Если несколько договоров — берётся самый долгий.
     */
    private Map<Long, Long> buildContractApprovalDaysMap() {
        List<Object[]> rows = contractApprovalRepository.findContractApprovalDatesForTimelines();
        // purchase_request_id → max working days
        Map<Long, Long> result = new HashMap<>();
        for (Object[] row : rows) {
            Long prId = ((Number) row[0]).longValue();
            java.sql.Timestamp firstAssignment = row[2] != null ? (java.sql.Timestamp) row[2] : null;
            java.sql.Timestamp regCompletion = row[3] != null ? (java.sql.Timestamp) row[3] : null;
            if (firstAssignment == null || regCompletion == null) continue;
            long days = countWorkingDaysBetween(firstAssignment.toLocalDateTime(), regCompletion.toLocalDateTime());
            result.merge(prId, days, Math::max);
        }
        return result;
    }

    /** Аккумулятор для расчёта средних по этапам. */
    private static class TimelineAccumulator {
        int count;
        final List<Long> prepDays = new ArrayList<>();
        final List<Long> approvalDays = new ArrayList<>();
        final List<Long> purchaseDays = new ArrayList<>();
        final List<Long> purchaseGeneralDays = new ArrayList<>();
        final List<Long> purchaseResultDays = new ArrayList<>();
        final List<Long> contractPrepDays = new ArrayList<>();
        final List<Long> contractApprovalDays = new ArrayList<>();

        void addPrep(long days) { count++; prepDays.add(days); }
        void addApproval(long days) { approvalDays.add(days); }
        void addPurchase(long days) { purchaseDays.add(days); }
        void addPurchaseGeneral(long days) { purchaseGeneralDays.add(days); }
        void addPurchaseResult(long days) { purchaseResultDays.add(days); }
        void addContractPrep(long days) { contractPrepDays.add(days); }
        void addContractApproval(long days) { contractApprovalDays.add(days); }
    }

    private static double roundAvg(List<Long> list) {
        double avg = list.stream().mapToLong(Long::longValue).average().orElse(0.0);
        return Math.round(avg * 10.0) / 10.0;
    }

    /**
     * Рабочие дни между двумя датами: от start до end включительно (оба дня считаются, если рабочие).
     * Если start == end, возвращается 0 (в один день — 0 рабочих дней ожидания).
     */
    private long countWorkingDaysBetweenDates(LocalDateTime start, LocalDateTime end) {
        return workingDayService.countFromDayAfterStartThroughEndInclusive(start, end);
    }

    /**
     * Расчёт экономии по закупкам за год (по дате завершения закупки — purchaseCreationDate).
     * Возвращает общую экономию, по типам (от медианы / от существующего договора / без типа),
     * а также помесячную разбивку.
     */
    public OverviewSavingsResponseDto getSavingsData(int year) {
        logger.info("getSavingsData: year={}", year);

        LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
        LocalDateTime endOfYear = LocalDateTime.of(year, 12, 31, 23, 59, 59, 999999999);

        // Загружаем все закупки COMPLETED с непустой экономией
        var spec = (org.springframework.data.jpa.domain.Specification<com.uzproc.backend.entity.purchase.Purchase>) (root, query, cb) -> {
            if (query.getResultType() == com.uzproc.backend.entity.purchase.Purchase.class) {
                root.fetch("cfo", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("purchaseRequest", jakarta.persistence.criteria.JoinType.LEFT);
            }
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            predicates.add(cb.isNotNull(root.get("savings")));
            predicates.add(cb.equal(root.get("status"), com.uzproc.backend.entity.purchase.PurchaseStatus.COMPLETED));
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        List<com.uzproc.backend.entity.purchase.Purchase> allPurchasesWithSavings = purchaseRepository.findAll(spec);

        // Определяем дату завершения комиссии для каждой закупки
        List<Long> allPrIds = allPurchasesWithSavings.stream()
            .map(com.uzproc.backend.entity.purchase.Purchase::getPurchaseRequestId)
            .filter(java.util.Objects::nonNull)
            .distinct()
            .toList();

        Map<Long, LocalDateTime> completionDateByPrId = new java.util.HashMap<>();
        if (!allPrIds.isEmpty()) {
            List<com.uzproc.backend.entity.purchase.PurchaseApproval> approvals = purchaseApprovalRepository.findByPurchaseRequestIdIn(allPrIds);
            Map<Long, List<com.uzproc.backend.entity.purchase.PurchaseApproval>> byPr = approvals.stream()
                .filter(a -> "Закупочная комиссия".equals(a.getStage()))
                .collect(java.util.stream.Collectors.groupingBy(com.uzproc.backend.entity.purchase.PurchaseApproval::getPurchaseRequestId));

            for (var entry : byPr.entrySet()) {
                var commissionApprovals = entry.getValue();
                boolean allCompleted = !commissionApprovals.isEmpty()
                    && commissionApprovals.stream().allMatch(a -> a.getCompletionDate() != null);
                if (allCompleted) {
                    LocalDateTime completionDate = commissionApprovals.stream()
                        .map(com.uzproc.backend.entity.purchase.PurchaseApproval::getCompletionDate)
                        .filter(java.util.Objects::nonNull)
                        .max(LocalDateTime::compareTo)
                        .orElse(null);
                    if (completionDate != null) {
                        completionDateByPrId.put(entry.getKey(), completionDate);
                    }
                }
            }
        }

        // Фильтруем по дате завершения комиссии в году
        List<com.uzproc.backend.entity.purchase.Purchase> purchases = allPurchasesWithSavings.stream()
            .filter(p -> {
                Long prId = p.getPurchaseRequestId();
                if (prId == null) return false;
                LocalDateTime cd = completionDateByPrId.get(prId);
                return cd != null && cd.getYear() == year;
            })
            .toList();

        logger.info("getSavingsData: found {} purchases with savings in year {} (by commission completion date)", purchases.size(), year);

        // Бюджет всех завершённых закупок за год (по дате завершения комиссии, независимо от наличия экономии)
        var budgetSpec = (org.springframework.data.jpa.domain.Specification<com.uzproc.backend.entity.purchase.Purchase>) (root, query, cb) -> {
            var preds = new ArrayList<jakarta.persistence.criteria.Predicate>();
            preds.add(cb.equal(root.get("status"), com.uzproc.backend.entity.purchase.PurchaseStatus.COMPLETED));
            return cb.and(preds.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        List<com.uzproc.backend.entity.purchase.Purchase> allCompleted = purchaseRepository.findAll(budgetSpec);

        // Дополняем completionDateByPrId для закупок без savings (чтобы бюджет считался по всем COMPLETED)
        List<Long> budgetPrIds = allCompleted.stream()
            .map(com.uzproc.backend.entity.purchase.Purchase::getPurchaseRequestId)
            .filter(id -> id != null && !completionDateByPrId.containsKey(id))
            .distinct()
            .toList();
        if (!budgetPrIds.isEmpty()) {
            List<com.uzproc.backend.entity.purchase.PurchaseApproval> budgetApprovals = purchaseApprovalRepository.findByPurchaseRequestIdIn(budgetPrIds);
            Map<Long, List<com.uzproc.backend.entity.purchase.PurchaseApproval>> byPrBudget = budgetApprovals.stream()
                .filter(a -> "Закупочная комиссия".equals(a.getStage()))
                .collect(java.util.stream.Collectors.groupingBy(com.uzproc.backend.entity.purchase.PurchaseApproval::getPurchaseRequestId));
            for (var entry : byPrBudget.entrySet()) {
                var commApprovals = entry.getValue();
                boolean allDone = !commApprovals.isEmpty()
                    && commApprovals.stream().allMatch(a -> a.getCompletionDate() != null);
                if (allDone) {
                    LocalDateTime cd = commApprovals.stream()
                        .map(com.uzproc.backend.entity.purchase.PurchaseApproval::getCompletionDate)
                        .filter(java.util.Objects::nonNull)
                        .max(LocalDateTime::compareTo)
                        .orElse(null);
                    if (cd != null) completionDateByPrId.put(entry.getKey(), cd);
                }
            }
        }

        List<com.uzproc.backend.entity.purchase.Purchase> completedPurchases = allCompleted.stream()
            .filter(p -> {
                Long prId = p.getPurchaseRequestId();
                if (prId == null) return false;
                LocalDateTime cd = completionDateByPrId.get(prId);
                return cd != null && cd.getYear() == year;
            })
            .toList();
        BigDecimal totalBudget = BigDecimal.ZERO;
        int totalBudgetCount = 0;
        for (var p : completedPurchases) {
            if (p.getBudgetAmount() != null) {
                totalBudget = totalBudget.add(p.getBudgetAmount());
            }
            totalBudgetCount++;
        }
        logger.info("getSavingsData: found {} completed purchases with total budget in year {}", totalBudgetCount, year);
        BigDecimal totalSavings = BigDecimal.ZERO;
        BigDecimal fromMedian = BigDecimal.ZERO;
        BigDecimal fromExistingContract = BigDecimal.ZERO;
        BigDecimal untyped = BigDecimal.ZERO;
        int totalCount = 0;
        int fromMedianCount = 0;
        int fromExistingContractCount = 0;
        int untypedCount = 0;

        // Помесячная разбивка
        BigDecimal[] monthTotal = new BigDecimal[12];
        BigDecimal[] monthFromMedian = new BigDecimal[12];
        BigDecimal[] monthFromExisting = new BigDecimal[12];
        BigDecimal[] monthUntyped = new BigDecimal[12];
        int[] monthCount = new int[12];
        for (int i = 0; i < 12; i++) {
            monthTotal[i] = BigDecimal.ZERO;
            monthFromMedian[i] = BigDecimal.ZERO;
            monthFromExisting[i] = BigDecimal.ZERO;
            monthUntyped[i] = BigDecimal.ZERO;
        }

        // Группировка по ЦФО
        Map<String, BigDecimal[]> cfoMap = new LinkedHashMap<>(); // cfo -> [total, fromMedian, fromExisting, untyped]
        Map<String, Integer> cfoCountMap = new LinkedHashMap<>();

        // Группировка по закупщику
        Map<String, BigDecimal[]> purchaserMap = new LinkedHashMap<>();
        Map<String, Integer> purchaserCountMap = new LinkedHashMap<>();

        for (var purchase : purchases) {
            BigDecimal savings = purchase.getSavings();
            if (savings == null) continue;

            totalSavings = totalSavings.add(savings);
            totalCount++;

            LocalDateTime commissionDate = completionDateByPrId.get(purchase.getPurchaseRequestId());
            int monthIdx = commissionDate != null ? commissionDate.getMonthValue() - 1 : 0;
            monthTotal[monthIdx] = monthTotal[monthIdx].add(savings);
            monthCount[monthIdx]++;

            // ЦФО
            String cfoName = purchase.getCfo() != null ? purchase.getCfo().getName() : "Не указан";
            cfoMap.computeIfAbsent(cfoName, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
            cfoCountMap.merge(cfoName, 1, Integer::sum);
            cfoMap.get(cfoName)[0] = cfoMap.get(cfoName)[0].add(savings);

            // Закупщик (из заявки на закупку)
            String purchaserName = "Не указан";
            if (purchase.getPurchaseRequest() != null && purchase.getPurchaseRequest().getPurchaser() != null
                    && !purchase.getPurchaseRequest().getPurchaser().isBlank()) {
                purchaserName = purchase.getPurchaseRequest().getPurchaser();
            }
            purchaserMap.computeIfAbsent(purchaserName, k -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO});
            purchaserCountMap.merge(purchaserName, 1, Integer::sum);
            purchaserMap.get(purchaserName)[0] = purchaserMap.get(purchaserName)[0].add(savings);

            var savingsType = purchase.getSavingsType();
            if (savingsType == com.uzproc.backend.entity.purchase.SavingsType.FROM_MEDIAN) {
                fromMedian = fromMedian.add(savings);
                fromMedianCount++;
                monthFromMedian[monthIdx] = monthFromMedian[monthIdx].add(savings);
                cfoMap.get(cfoName)[1] = cfoMap.get(cfoName)[1].add(savings);
                purchaserMap.get(purchaserName)[1] = purchaserMap.get(purchaserName)[1].add(savings);
            } else if (savingsType == com.uzproc.backend.entity.purchase.SavingsType.FROM_EXISTING_CONTRACT) {
                fromExistingContract = fromExistingContract.add(savings);
                fromExistingContractCount++;
                monthFromExisting[monthIdx] = monthFromExisting[monthIdx].add(savings);
                cfoMap.get(cfoName)[2] = cfoMap.get(cfoName)[2].add(savings);
                purchaserMap.get(purchaserName)[2] = purchaserMap.get(purchaserName)[2].add(savings);
            } else {
                untyped = untyped.add(savings);
                untypedCount++;
                monthUntyped[monthIdx] = monthUntyped[monthIdx].add(savings);
                cfoMap.get(cfoName)[3] = cfoMap.get(cfoName)[3].add(savings);
                purchaserMap.get(purchaserName)[3] = purchaserMap.get(purchaserName)[3].add(savings);
            }
        }

        // Собираем помесячные данные
        List<OverviewSavingsMonthDto> byMonth = new ArrayList<>();
        for (int i = 0; i < 12; i++) {
            OverviewSavingsMonthDto m = new OverviewSavingsMonthDto();
            m.setMonth(i + 1);
            m.setTotalSavings(monthTotal[i]);
            m.setSavingsFromMedian(monthFromMedian[i]);
            m.setSavingsFromExistingContract(monthFromExisting[i]);
            m.setSavingsUntyped(monthUntyped[i]);
            m.setCount(monthCount[i]);
            byMonth.add(m);
        }

        OverviewSavingsResponseDto response = new OverviewSavingsResponseDto();
        response.setYear(year);
        response.setTotalBudget(totalBudget);
        response.setTotalBudgetCount(totalBudgetCount);
        response.setTotalSavings(totalSavings);
        response.setSavingsFromMedian(fromMedian);
        response.setSavingsFromExistingContract(fromExistingContract);
        response.setSavingsUntyped(untyped);
        response.setTotalCount(totalCount);
        response.setFromMedianCount(fromMedianCount);
        response.setFromExistingContractCount(fromExistingContractCount);
        response.setUntypedCount(untypedCount);
        response.setByMonth(byMonth);

        // Собираем данные по ЦФО, сортируем по убыванию общей экономии
        List<OverviewSavingsByCfoDto> byCfo = new ArrayList<>();
        for (var entry : cfoMap.entrySet()) {
            OverviewSavingsByCfoDto dto = new OverviewSavingsByCfoDto();
            dto.setCfo(entry.getKey());
            dto.setTotalSavings(entry.getValue()[0]);
            dto.setSavingsFromMedian(entry.getValue()[1]);
            dto.setSavingsFromExistingContract(entry.getValue()[2]);
            dto.setSavingsUntyped(entry.getValue()[3]);
            dto.setCount(cfoCountMap.getOrDefault(entry.getKey(), 0));
            byCfo.add(dto);
        }
        byCfo.sort((a, b) -> b.getTotalSavings().compareTo(a.getTotalSavings()));
        response.setByCfo(byCfo);

        // Собираем данные по закупщикам
        List<OverviewSavingsByPurchaserDto> byPurchaser = new ArrayList<>();
        for (var entry : purchaserMap.entrySet()) {
            OverviewSavingsByPurchaserDto dto = new OverviewSavingsByPurchaserDto();
            dto.setPurchaser(entry.getKey());
            dto.setTotalSavings(entry.getValue()[0]);
            dto.setSavingsFromMedian(entry.getValue()[1]);
            dto.setSavingsFromExistingContract(entry.getValue()[2]);
            dto.setSavingsUntyped(entry.getValue()[3]);
            dto.setCount(purchaserCountMap.getOrDefault(entry.getKey(), 0));
            byPurchaser.add(dto);
        }
        byPurchaser.sort((a, b) -> b.getTotalSavings().compareTo(a.getTotalSavings()));
        response.setByPurchaser(byPurchaser);

        return response;
    }

    /**
     * Детали закупок с экономией для конкретного закупщика за год.
     */
    public List<OverviewSavingsPurchaseDetailDto> getSavingsPurchaseDetails(int year, String purchaser) {
        logger.info("getSavingsPurchaseDetails: year={}, purchaser={}", year, purchaser);

        var spec = (org.springframework.data.jpa.domain.Specification<com.uzproc.backend.entity.purchase.Purchase>) (root, query, cb) -> {
            if (query.getResultType() == com.uzproc.backend.entity.purchase.Purchase.class) {
                root.fetch("cfo", jakarta.persistence.criteria.JoinType.LEFT);
                root.fetch("purchaseRequest", jakarta.persistence.criteria.JoinType.LEFT);
            }
            var predicates = new ArrayList<jakarta.persistence.criteria.Predicate>();
            predicates.add(cb.isNotNull(root.get("savings")));
            predicates.add(cb.equal(root.get("status"), com.uzproc.backend.entity.purchase.PurchaseStatus.COMPLETED));
            return cb.and(predicates.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };

        List<com.uzproc.backend.entity.purchase.Purchase> allPurchases = purchaseRepository.findAll(spec);

        // Определяем дату завершения комиссии
        List<Long> prIds = allPurchases.stream()
            .map(com.uzproc.backend.entity.purchase.Purchase::getPurchaseRequestId)
            .filter(java.util.Objects::nonNull)
            .distinct()
            .toList();

        Map<Long, LocalDateTime> completionDateByPrId = new java.util.HashMap<>();
        if (!prIds.isEmpty()) {
            List<com.uzproc.backend.entity.purchase.PurchaseApproval> approvals = purchaseApprovalRepository.findByPurchaseRequestIdIn(prIds);
            Map<Long, List<com.uzproc.backend.entity.purchase.PurchaseApproval>> byPr = approvals.stream()
                .filter(a -> "Закупочная комиссия".equals(a.getStage()))
                .collect(java.util.stream.Collectors.groupingBy(com.uzproc.backend.entity.purchase.PurchaseApproval::getPurchaseRequestId));
            for (var entry : byPr.entrySet()) {
                var commissionApprovals = entry.getValue();
                boolean allCompleted = !commissionApprovals.isEmpty()
                    && commissionApprovals.stream().allMatch(a -> a.getCompletionDate() != null);
                if (allCompleted) {
                    LocalDateTime cd = commissionApprovals.stream()
                        .map(com.uzproc.backend.entity.purchase.PurchaseApproval::getCompletionDate)
                        .filter(java.util.Objects::nonNull)
                        .max(LocalDateTime::compareTo)
                        .orElse(null);
                    if (cd != null) completionDateByPrId.put(entry.getKey(), cd);
                }
            }
        }

        // Фильтруем по году завершения комиссии
        List<com.uzproc.backend.entity.purchase.Purchase> purchases = allPurchases.stream()
            .filter(p -> {
                Long prId = p.getPurchaseRequestId();
                if (prId == null) return false;
                LocalDateTime cd = completionDateByPrId.get(prId);
                return cd != null && cd.getYear() == year;
            })
            .toList();

        return purchases.stream()
                .filter(p -> {
                    String pName = "Не указан";
                    if (p.getPurchaseRequest() != null && p.getPurchaseRequest().getPurchaser() != null
                            && !p.getPurchaseRequest().getPurchaser().isBlank()) {
                        pName = p.getPurchaseRequest().getPurchaser();
                    }
                    return pName.equals(purchaser);
                })
                .map(p -> {
                    var dto = new OverviewSavingsPurchaseDetailDto();
                    var pr = p.getPurchaseRequest();
                    dto.setIdPurchaseRequest(pr != null ? pr.getIdPurchaseRequest() : null);
                    dto.setCfo(p.getCfo() != null ? p.getCfo().getName() : null);
                    dto.setPurchaser(pr != null ? pr.getPurchaser() : null);
                    dto.setName(pr != null ? pr.getName() : p.getName());
                    dto.setPurchaseCreationDate(p.getPurchaseCreationDate() != null
                            ? p.getPurchaseCreationDate().format(ISO_FORMAT) : null);
                    dto.setBudgetAmount(p.getBudgetAmount());
                    dto.setSavings(p.getSavings());
                    dto.setSavingsType(p.getSavingsType() != null ? p.getSavingsType().name() : null);
                    dto.setStatus(p.getStatus() != null ? p.getStatus().name() : null);
                    dto.setComplexity(pr != null ? pr.getComplexity() : null);
                    return dto;
                })
                .sorted((a, b) -> {
                    BigDecimal sa = a.getSavings() != null ? a.getSavings() : BigDecimal.ZERO;
                    BigDecimal sb = b.getSavings() != null ? b.getSavings() : BigDecimal.ZERO;
                    return sb.compareTo(sa);
                })
                .collect(Collectors.toList());
    }
}
