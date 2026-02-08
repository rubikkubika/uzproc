package com.uzproc.backend.service.overview;

import com.uzproc.backend.dto.overview.*;
import com.uzproc.backend.dto.purchaserequest.PurchaseRequestDto;
import com.uzproc.backend.dto.purchaseplan.PurchasePlanItemDto;
import com.uzproc.backend.dto.purchaseplan.PurchasePlanVersionDto;
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

    public OverviewService(
            PurchaseRequestService purchaseRequestService,
            PurchasePlanVersionService purchasePlanVersionService) {
        this.purchaseRequestService = purchaseRequestService;
        this.purchasePlanVersionService = purchasePlanVersionService;
    }

    /**
     * Данные для вкладки SLA: заявки по группам статусов за год назначения на утверждение.
     */
    public OverviewSlaResponseDto getSlaData(Integer year) {
        OverviewSlaResponseDto response = new OverviewSlaResponseDto();
        response.setYear(year);
        List<OverviewSlaBlockDto> blocks = new ArrayList<>();
        for (String statusGroup : SLA_STATUS_GROUPS) {
            Page<PurchaseRequestDto> page = purchaseRequestService.findAll(
                    0, 2000,
                    null, null, null, null,
                    null, null, null, null, null, null, null, null,
                    true, null, List.of(statusGroup), false,
                    null, null, false, year);
            List<OverviewSlaRequestDto> requests = page.getContent().stream()
                    .map(this::toOverviewSlaRequest)
                    .collect(Collectors.toList());
            blocks.add(new OverviewSlaBlockDto(statusGroup, requests));
        }
        response.setStatusBlocks(blocks);
        logger.debug("Overview SLA data for year {}: {} blocks", year, blocks.size());
        return response;
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
        Map<String, Integer> requestsByCfo = new HashMap<>();
        Map<String, BigDecimal> sumByCfo = new HashMap<>();
        if (requestsCount > 0) {
            Page<PurchaseRequestDto> requestsPage = purchaseRequestService.findAll(
                    0, Math.min(requestsCount, 2000),
                    year, calendarMonth, null, null,
                    null, null, null, null, null, null, null, null,
                    true, null, null, false,
                    null, null, false, null);
            for (PurchaseRequestDto pr : requestsPage.getContent()) {
                String cfoKey = pr.getCfo() != null && !pr.getCfo().trim().isEmpty() ? pr.getCfo().trim() : "—";
                requestsByCfo.merge(cfoKey, 1, Integer::sum);
                BigDecimal amount = pr.getBudgetAmount() != null ? pr.getBudgetAmount() : BigDecimal.ZERO;
                sumByCfo.merge(cfoKey, amount, BigDecimal::add);
            }
        }
        Set<String> cfoKeys = new TreeSet<>((a, b) -> {
            if ("—".equals(a)) return 1;
            if ("—".equals(b)) return -1;
            return a.compareTo(b);
        });
        overviewItems.forEach(i -> cfoKeys.add(i.getCfo() != null && !i.getCfo().trim().isEmpty() ? i.getCfo().trim() : "—"));
        cfoKeys.addAll(requestsByCfo.keySet());
        List<OverviewCfoSummaryRowDto> summaryRows = new ArrayList<>();
        for (String cfoKey : cfoKeys) {
            OverviewCfoSummaryRowDto row = new OverviewCfoSummaryRowDto();
            row.setCfo(cfoKey);
            List<OverviewPlanItemDto> itemsCfo = overviewItems.stream()
                    .filter(i -> cfoKey.equals(i.getCfo() != null && !i.getCfo().trim().isEmpty() ? i.getCfo().trim() : "—"))
                    .collect(Collectors.toList());
            int market = (int) itemsCfo.stream().filter(i -> i.getPurchaserCompany() != null && "market".equalsIgnoreCase(i.getPurchaserCompany().trim())).count();
            int linked = (int) itemsCfo.stream().filter(i -> i.getPurchaseRequestId() != null).count();
            int excluded = (int) itemsCfo.stream().filter(i -> i.getStatus() != null && "Исключена".equals(i.getStatus().trim())).count();
            row.setMarket(market);
            row.setLinked(linked);
            row.setExcluded(excluded);
            row.setRequestsPurchase(requestsByCfo.getOrDefault(cfoKey, 0));
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
                0, 1, year, calendarMonth, null, null,
                null, null, null, null, null, null, null, null,
                true, null, null, false,
                null, null, false, null);
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
