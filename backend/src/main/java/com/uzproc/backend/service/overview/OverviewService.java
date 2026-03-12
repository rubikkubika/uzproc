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
import com.uzproc.backend.service.purchaserequest.PurchaseRequestCommentService;
import com.uzproc.backend.service.purchaserequest.PurchaseRequestService;
import com.uzproc.backend.service.purchaseplan.PurchasePlanVersionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
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

    /** Подстрока способа закупки (mcc) у связанной закупки для признака «Закупка у единственного источника». */
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
            OverviewEkProperties overviewEkProperties) {
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
        for (OverviewSlaBlockDto block : blocks) {
            for (OverviewSlaRequestDto r : block.getRequests()) {
                if (r.getId() != null && slaCounts.containsKey(r.getId())) {
                    r.setSlaCommentCount(slaCounts.get(r.getId()).intValue());
                } else {
                    r.setSlaCommentCount(0);
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

    /** Рабочие дни между датами: со следующего дня после assignment по completion включительно. O(1). */
    private long countWorkingDaysBetween(LocalDateTime assignment, LocalDateTime completion) {
        if (assignment == null || completion == null) return 0;
        LocalDate start = assignment.toLocalDate().plusDays(1);
        LocalDate end = completion.toLocalDate();
        if (start.isAfter(end)) return 0;
        return workingDaysBetweenInclusive(start, end);
    }

    /** Количество рабочих дней в диапазоне [start, end] включительно. O(1). */
    private static long workingDaysBetweenInclusive(LocalDate start, LocalDate end) {
        long days = ChronoUnit.DAYS.between(start, end) + 1;
        long fullWeeks = days / 7;
        long remaining = days % 7;
        long workdays = fullWeeks * 5;
        int dow = start.getDayOfWeek().getValue(); // 1=Mon, 7=Sun
        for (int i = 0; i < remaining; i++) {
            int d = ((dow - 1 + i) % 7) + 1;
            if (d < 6) workdays++; // Mon–Fri
        }
        return workdays;
    }

    /**
     * Рабочие дни для согласования договора: та же логика, что на странице заявки.
     * День назначения не считаем. День выполнения считаем. Назначено и выполнено в один день → 1 день.
     * Не выполненные: от (день после назначения) до сегодня включительно; если назначено сегодня → 0 дней.
     */
    private long contractApprovalWorkingDays(LocalDateTime assignmentDate, LocalDateTime completionDate) {
        if (assignmentDate == null) return 0;
        LocalDate start = assignmentDate.toLocalDate().plusDays(1);
        LocalDate end = completionDate != null ? completionDate.toLocalDate() : LocalDate.now();
        if (start.isAfter(end)) {
            return (end.getDayOfWeek() != DayOfWeek.SATURDAY && end.getDayOfWeek() != DayOfWeek.SUNDAY) ? 1 : 0;
        }
        return workingDaysBetweenInclusive(start, end);
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
     * Возвращает: totalAmount — сумма всех таких заявок; singleSourceAmount — сумма заявок, у которых связанная закупка со способом (mcc) «у единственного источника»; percentSingleSource — процент singleSourceAmount к totalAmount.
     * Год — год назначения на закупщика. Если по году назначения данных нет, используется год создания заявки.
     */
    public OverviewEkChartResponseDto getEkChartData(int year) {
        List<Long> singleSourceIdsRaw = purchaseRepository.findDistinctPurchaseRequestIdByMccContaining(SINGLE_SOURCE_MCC_SUBSTRING);
        Set<Long> singleSourceRequestIds = singleSourceIdsRaw.stream()
                .filter(java.util.Objects::nonNull)
                .map(id -> id instanceof Long ? id : Long.valueOf(((Number) id).longValue()))
                .collect(Collectors.toSet());
        logger.info("Overview EK: single-source purchase request IDs (mcc contains '{}'): {} count, sample: {}",
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
}
