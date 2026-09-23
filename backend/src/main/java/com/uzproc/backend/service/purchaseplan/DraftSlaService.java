package com.uzproc.backend.service.purchaseplan;

import com.uzproc.backend.dto.purchaseplan.DraftSlaRowDto;
import com.uzproc.backend.dto.purchaseplan.DraftSlaTableDto;
import com.uzproc.backend.entity.purchaseplan.DraftSlaSetting;
import com.uzproc.backend.entity.purchaseplan.PurchasePlanItem;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.purchaseplan.DraftSlaSettingRepository;
import com.uzproc.backend.repository.purchaseplan.PurchasePlanItemRepository;
import com.uzproc.backend.service.calendar.WorkingDayService;
import com.uzproc.backend.service.user.CurrentUserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Таблица SLA драфта плана закупок: срок от даты заявки до заключения нового договора по сложности.
 * Срок = SLA закупки + SLA договора (рабочие дни); в драфте договор всегда считается нетиповым.
 *
 * Таблица своя на каждый год драфта. Таблица года, которого ещё нет, создаётся при первом обращении
 * копией последнего предыдущего года (а если его нет — ближайшего следующего или значений по умолчанию).
 * Действующий план закупок считает сроки по своей таблице — см. {@link ProcurementLeadTimeService}.
 */
@Service
public class DraftSlaService {

    private static final Logger logger = LoggerFactory.getLogger(DraftSlaService.class);

    /** SLA закупки по умолчанию по сложности 1–4 (как плановый SLA заявки на закупку) */
    private static final Map<Integer, Integer> DEFAULT_PROCUREMENT_DAYS = Map.of(1, 3, 2, 7, 3, 15, 4, 30);

    /** SLA нетипового договора по умолчанию: подготовка 4 + согласование 5 + подписание 2 */
    private static final int DEFAULT_CONTRACT_DAYS = 11;

    private static final int MIN_COMPLEXITY = 1;
    private static final int MAX_COMPLEXITY = 4;

    /** Верхняя граница срока этапа, рабочих дней: защита от опечаток при вводе */
    private static final int MAX_DAYS = 365;

    private final DraftSlaSettingRepository draftSlaSettingRepository;
    private final PurchasePlanItemRepository purchasePlanItemRepository;
    private final WorkingDayService workingDayService;
    private final CurrentUserService currentUserService;

    public DraftSlaService(
            DraftSlaSettingRepository draftSlaSettingRepository,
            PurchasePlanItemRepository purchasePlanItemRepository,
            WorkingDayService workingDayService,
            CurrentUserService currentUserService) {
        this.draftSlaSettingRepository = draftSlaSettingRepository;
        this.purchasePlanItemRepository = purchasePlanItemRepository;
        this.workingDayService = workingDayService;
        this.currentUserService = currentUserService;
    }

    /**
     * Таблица SLA драфта на год (создаётся копией соседнего года, если её ещё нет).
     */
    @Transactional
    public DraftSlaTableDto getTable(Integer year) {
        return toDto(year, ensureTable(year), null);
    }

    /**
     * Общий срок (SLA закупки + SLA договора) по сложности на год драфта.
     * Для генерации драфта: таблица читается один раз на всё формирование.
     *
     * @return сложность → рабочих дней
     */
    @Transactional
    public Map<Integer, Integer> getTotalDaysByComplexity(Integer year) {
        return ensureTable(year).stream()
                .collect(Collectors.toMap(DraftSlaSetting::getComplexity, DraftSlaSetting::getTotalDays));
    }

    /**
     * Дата завершения закупки в драфте: дата заявки плюс общий срок по сложности из таблицы года.
     * Отсчёт начинается со следующего календарного дня, выходные и праздники пропускаются.
     *
     * @return null, если дата заявки не задана или сложность не входит в диапазон 1–4
     */
    @Transactional
    public LocalDate calculateNewContractDate(Integer year, LocalDate requestDate, String complexity) {
        if (requestDate == null) {
            return null;
        }
        return calculateNewContractDate(getTotalDaysByComplexity(year), requestDate, complexity);
    }

    /**
     * Дата завершения закупки по заранее загруженной таблице сроков (см. {@link #getTotalDaysByComplexity}).
     *
     * @return null, если дата заявки не задана или сложность не входит в диапазон 1–4
     */
    public LocalDate calculateNewContractDate(Map<Integer, Integer> totalDaysByComplexity, LocalDate requestDate,
                                              String complexity) {
        Integer complexityLevel = parseComplexity(complexity);
        if (requestDate == null || complexityLevel == null) {
            return null;
        }
        Integer workingDays = totalDaysByComplexity.get(complexityLevel);
        if (workingDays == null) {
            return null;
        }
        return workingDayService.addWorkingDaysAfterDate(requestDate, workingDays);
    }

    /**
     * Сохраняет таблицу SLA драфта на год и пересчитывает дату завершения закупки у позиций драфта этого года.
     * В драфте дата завершения всегда выводится из даты заявки и сложности, поэтому пересчитываются все позиции.
     *
     * @param rows сроки по сложности; сложности, которых нет в запросе, не меняются
     * @throws AccessDeniedException    если пользователь не закупщик и не администратор
     * @throws IllegalArgumentException если сложность вне 1–4 или срок вне 0–365
     */
    @Transactional
    public DraftSlaTableDto updateTable(Integer year, List<DraftSlaRowDto> rows) {
        User user = currentUserService.getCurrentUser()
                .filter(CurrentUserService::isPurchaserOrAdmin)
                .orElseThrow(() -> new AccessDeniedException(
                        "Изменять SLA драфта плана закупок могут только закупщики и администраторы"));
        if (year == null) {
            throw new IllegalArgumentException("Не указан год драфта");
        }

        Map<Integer, DraftSlaSetting> byComplexity = ensureTable(year).stream()
                .collect(Collectors.toMap(DraftSlaSetting::getComplexity, Function.identity()));
        LocalDateTime now = LocalDateTime.now();
        List<DraftSlaSetting> changed = new ArrayList<>();
        for (DraftSlaRowDto row : rows != null ? rows : List.<DraftSlaRowDto>of()) {
            DraftSlaSetting setting = byComplexity.get(row.complexity());
            if (setting == null) {
                throw new IllegalArgumentException("Сложность должна быть от 1 до 4: " + row.complexity());
            }
            validateDays(row.procurementDays(), "SLA закупки");
            validateDays(row.contractDays(), "SLA договора");
            if (!Objects.equals(setting.getProcurementDays(), row.procurementDays())
                    || !Objects.equals(setting.getContractDays(), row.contractDays())) {
                setting.setProcurementDays(row.procurementDays());
                setting.setContractDays(row.contractDays());
                setting.setUpdatedAt(now);
                setting.setUpdatedBy(user);
                changed.add(setting);
            }
        }
        if (changed.isEmpty()) {
            return toDto(year, sorted(byComplexity.values()), 0);
        }
        draftSlaSettingRepository.saveAll(changed);

        int recalculated = recalculateDraftDates(year, byComplexity.values().stream()
                .collect(Collectors.toMap(DraftSlaSetting::getComplexity, DraftSlaSetting::getTotalDays)));
        logger.info("Draft SLA table for year {} updated by user {}: {} complexity rows changed, {} draft items recalculated",
                year, user.getId(), changed.size(), recalculated);
        return toDto(year, sorted(byComplexity.values()), recalculated);
    }

    /**
     * Пересчитывает дату завершения закупки у позиций драфта года по новой таблице сроков.
     * В историю изменений позиций пересчёт не пишется: это не ручная правка, а смена норматива
     * (как и заполнение дат при формировании драфта).
     *
     * @return количество позиций, у которых дата изменилась
     */
    private int recalculateDraftDates(Integer year, Map<Integer, Integer> totalDaysByComplexity) {
        List<PurchasePlanItem> changed = new ArrayList<>();
        for (PurchasePlanItem item : purchasePlanItemRepository.findDraftItemsByYear(year)) {
            LocalDate recalculated = calculateNewContractDate(totalDaysByComplexity, item.getRequestDate(), item.getComplexity());
            if (recalculated != null && !recalculated.equals(item.getNewContractDate())) {
                item.setNewContractDate(recalculated);
                changed.add(item);
            }
        }
        if (!changed.isEmpty()) {
            purchasePlanItemRepository.saveAll(changed);
        }
        return changed.size();
    }

    /**
     * Строки таблицы года, по одной на каждую сложность 1–4. Недостающие строки создаются копией
     * соседнего года (последнего предыдущего, иначе ближайшего следующего), а без него — по умолчанию.
     */
    private List<DraftSlaSetting> ensureTable(Integer year) {
        List<DraftSlaSetting> existing = draftSlaSettingRepository.findByYearOrderByComplexityAsc(year);
        if (existing.size() == MAX_COMPLEXITY - MIN_COMPLEXITY + 1) {
            return existing;
        }

        Integer sourceYear = draftSlaSettingRepository.findLatestYearBefore(year)
                .or(() -> draftSlaSettingRepository.findEarliestYearAfter(year))
                .orElse(null);
        Map<Integer, DraftSlaSetting> source = sourceYear != null
                ? draftSlaSettingRepository.findByYearOrderByComplexityAsc(sourceYear).stream()
                        .collect(Collectors.toMap(DraftSlaSetting::getComplexity, Function.identity()))
                : new HashMap<>();
        Map<Integer, DraftSlaSetting> present = existing.stream()
                .collect(Collectors.toMap(DraftSlaSetting::getComplexity, Function.identity()));

        List<DraftSlaSetting> created = new ArrayList<>();
        for (int complexity = MIN_COMPLEXITY; complexity <= MAX_COMPLEXITY; complexity++) {
            if (present.containsKey(complexity)) {
                continue;
            }
            DraftSlaSetting from = source.get(complexity);
            created.add(from != null
                    ? new DraftSlaSetting(year, complexity, from.getProcurementDays(), from.getContractDays())
                    : new DraftSlaSetting(year, complexity, DEFAULT_PROCUREMENT_DAYS.get(complexity), DEFAULT_CONTRACT_DAYS));
        }
        draftSlaSettingRepository.saveAll(created);
        logger.info("Draft SLA table for year {} created from {}: {} rows", year,
                sourceYear != null ? "year " + sourceYear : "defaults", created.size());

        List<DraftSlaSetting> result = new ArrayList<>(existing);
        result.addAll(created);
        return sorted(result);
    }

    private static List<DraftSlaSetting> sorted(Collection<DraftSlaSetting> settings) {
        return settings.stream()
                .sorted(Comparator.comparing(DraftSlaSetting::getComplexity))
                .collect(Collectors.toList());
    }

    private static void validateDays(Integer days, String label) {
        if (days == null || days < 0 || days > MAX_DAYS) {
            throw new IllegalArgumentException(label + " должен быть от 0 до " + MAX_DAYS + " рабочих дней");
        }
    }

    /**
     * Сложность позиции «1»–«4» → число; иначе null.
     */
    private static Integer parseComplexity(String complexity) {
        if (complexity == null || complexity.trim().isEmpty()) {
            return null;
        }
        try {
            int value = Integer.parseInt(complexity.trim());
            return value >= MIN_COMPLEXITY && value <= MAX_COMPLEXITY ? value : null;
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private DraftSlaTableDto toDto(Integer year, List<DraftSlaSetting> settings, Integer recalculated) {
        List<DraftSlaRowDto> rows = settings.stream()
                .map(s -> new DraftSlaRowDto(s.getComplexity(), s.getProcurementDays(), s.getContractDays(), s.getTotalDays()))
                .collect(Collectors.toList());
        DraftSlaSetting lastUpdated = settings.stream()
                .filter(s -> s.getUpdatedAt() != null)
                .max(Comparator.comparing(DraftSlaSetting::getUpdatedAt))
                .orElse(null);
        return new DraftSlaTableDto(year, rows,
                lastUpdated != null ? lastUpdated.getUpdatedAt() : null,
                lastUpdated != null ? CurrentUserService.displayName(lastUpdated.getUpdatedBy()) : null,
                recalculated);
    }
}
