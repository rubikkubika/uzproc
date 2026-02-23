package com.uzproc.backend.service.overview;

import com.uzproc.backend.dto.overview.*;
import com.uzproc.backend.dto.purchaserequest.PurchaseRequestDto;
import com.uzproc.backend.dto.purchaseplan.PurchasePlanItemDto;
import com.uzproc.backend.dto.purchaseplan.PurchasePlanVersionDto;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestCommentType;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestStatus;
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

    private final PurchaseRequestService purchaseRequestService;
    private final PurchasePlanVersionService purchasePlanVersionService;
    private final PurchaseRequestCommentService purchaseRequestCommentService;

    public OverviewService(
            PurchaseRequestService purchaseRequestService,
            PurchasePlanVersionService purchasePlanVersionService,
            PurchaseRequestCommentService purchaseRequestCommentService) {
        this.purchaseRequestService = purchaseRequestService;
        this.purchasePlanVersionService = purchasePlanVersionService;
        this.purchaseRequestCommentService = purchaseRequestCommentService;
    }

    /**
     * Данные для вкладки SLA: заявки по группам статусов за год назначения на утверждение.
     */
    public OverviewSlaResponseDto getSlaData(Integer year) {
        OverviewSlaResponseDto response = new OverviewSlaResponseDto();
        response.setYear(year);
        List<OverviewSlaBlockDto> blocks = new ArrayList<>();
        List<Long> allRequestIds = new ArrayList<>();
        for (String statusGroup : SLA_STATUS_GROUPS) {
            // hasLinkedPlanItem=null (не фильтруем по связи с планом — иначе 2090 без позиции плана не попадёт),
            // requiresPurchase=true — только закупки, без заказов
            Page<PurchaseRequestDto> page = purchaseRequestService.findAll(
                    0, 2000,
                    null, null, null, null,
                    null, null, null, null, null, null, null, null,
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
        logger.debug("Overview SLA data for year {}: {} blocks, {} month percentages", year, blocks.size(), slaPercentageByMonth.size());
        return response;
    }

    /**
     * Процент закупок, уложившихся в плановый SLA, по месяцу назначения (только завершённые закупки).
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
                if (assignment.getYear() != year || assignment.getMonthValue() != month) continue;
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
        if (assignment == null || completion == null) return 0;
        LocalDate start = assignment.toLocalDate().plusDays(1);
        LocalDate end = completion.toLocalDate();
        if (start.isAfter(end)) return 0;
        long count = 0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            if (d.getDayOfWeek() != DayOfWeek.SATURDAY && d.getDayOfWeek() != DayOfWeek.SUNDAY) count++;
        }
        return count;
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
}
