package com.uzproc.backend.service.tracker;

import com.uzproc.backend.dto.tracker.ProcurementTrackerDto;
import com.uzproc.backend.dto.tracker.TrackerStageDto;
import com.uzproc.backend.dto.tracker.TrackerStepDto;
import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.contract.ContractApproval;
import com.uzproc.backend.entity.contract.ContractStatus;
import com.uzproc.backend.entity.purchase.Purchase;
import com.uzproc.backend.entity.purchase.PurchaseApproval;
import com.uzproc.backend.entity.purchase.PurchaseStatus;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestApproval;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestStatus;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestStatusGroup;
import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.repository.contract.ContractApprovalRepository;
import com.uzproc.backend.repository.contract.ContractRepository;
import com.uzproc.backend.repository.purchase.PurchaseApprovalRepository;
import com.uzproc.backend.repository.purchase.PurchaseRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestApprovalRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
import com.uzproc.backend.service.calendar.WorkingDayService;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Собирает модель «Трекер статуса закупки» для публичной страницы инициатора.
 * Маппит доменные сущности (заявка → согласования → закупка → договор) на 4 укрупнённых этапа:
 * «Заявка создана» → «Согласование заявки» → «Выбор поставщика» → «Договор».
 */
@Service
public class ProcurementTrackerService {

    /** Максимум результатов поиска (защита от выгрузки больших объёмов). */
    private static final int SEARCH_LIMIT = 20;

    private static final DateTimeFormatter DATE_FULL = DateTimeFormatter.ofPattern("dd.MM.yyyy");
    private static final DateTimeFormatter DATE_SHORT = DateTimeFormatter.ofPattern("dd.MM");
    private static final Locale RU = Locale.forLanguageTag("ru-RU");

    private static final String[] STAGE_NAMES = {"Заявка создана", "Согласование заявки", "Выбор поставщика", "Договор"};
    private static final String[] STAGE_OFFS = {"Потребность", "Заявка", "Закупка", "Договор"};

    /** Месяцы в родительном падеже для формата прогноза «к 16 июля». */
    private static final String[] MONTHS_GENITIVE = {
            "января", "февраля", "марта", "апреля", "мая", "июня",
            "июля", "августа", "сентября", "октября", "ноября", "декабря"
    };

    /** Заглушка прогноза: рабочих дней от текущей даты до ожидаемого договора. */
    private static final int FORECAST_WORKING_DAYS = 14;

    /** Статусы заявки, означающие «согласование пройдено» (этап 2 завершён). */
    private static final Set<PurchaseRequestStatus> REQUEST_APPROVED = EnumSet.of(
            PurchaseRequestStatus.APPROVED,
            PurchaseRequestStatus.COORDINATED,
            PurchaseRequestStatus.SPECIFICATION_CREATED,
            PurchaseRequestStatus.SPECIFICATION_ON_COORDINATION,
            PurchaseRequestStatus.SPECIFICATION_SIGNED,
            PurchaseRequestStatus.SPECIFICATION_NOT_COORDINATED,
            PurchaseRequestStatus.PURCHASE_CREATED,
            PurchaseRequestStatus.PURCHASE_NOT_COORDINATED,
            PurchaseRequestStatus.PURCHASE_COMPLETED,
            PurchaseRequestStatus.CONTRACT_CREATED,
            PurchaseRequestStatus.CONTRACT_ON_REGISTRATION,
            PurchaseRequestStatus.CONTRACT_SIGNED
    );

    /**
     * Терминальные/неактивные группы статусов заявки — попадают в группу «Архив» поиска трекера.
     * «Заявка на согласовании» сюда НЕ входит (это активный этап). Скрытые заявки
     * (excludeFromInWork = true) добавляются к этой группе отдельно.
     */
    private static final Set<PurchaseRequestStatusGroup> ARCHIVE_GROUPS = EnumSet.of(
            PurchaseRequestStatusGroup.PROJECT,
            PurchaseRequestStatusGroup.NOT_COORDINATED,
            PurchaseRequestStatusGroup.NOT_APPROVED,
            PurchaseRequestStatusGroup.PURCHASE_NOT_COORDINATED,
            PurchaseRequestStatusGroup.SPECIFICATION_NOT_COORDINATED,
            PurchaseRequestStatusGroup.SPECIFICATION_CREATED_ARCHIVE
    );

    private final PurchaseRequestRepository requestRepository;
    private final PurchaseRequestApprovalRepository requestApprovalRepository;
    private final PurchaseRepository purchaseRepository;
    private final PurchaseApprovalRepository purchaseApprovalRepository;
    private final ContractRepository contractRepository;
    private final ContractApprovalRepository contractApprovalRepository;
    private final WorkingDayService workingDayService;

    public ProcurementTrackerService(
            PurchaseRequestRepository requestRepository,
            PurchaseRequestApprovalRepository requestApprovalRepository,
            PurchaseRepository purchaseRepository,
            PurchaseApprovalRepository purchaseApprovalRepository,
            ContractRepository contractRepository,
            ContractApprovalRepository contractApprovalRepository,
            WorkingDayService workingDayService) {
        this.requestRepository = requestRepository;
        this.requestApprovalRepository = requestApprovalRepository;
        this.purchaseRepository = purchaseRepository;
        this.purchaseApprovalRepository = purchaseApprovalRepository;
        this.contractRepository = contractRepository;
        this.contractApprovalRepository = contractApprovalRepository;
        this.workingDayService = workingDayService;
    }

    /**
     * Поиск закупок по номеру/предмету/инициатору. Пустой запрос → пустой результат (страница публичная).
     * Связанные сущности грузятся batch-запросами (без N+1 на каждую заявку).
     */
    @Transactional(readOnly = true)
    public List<ProcurementTrackerDto> search(String query) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }
        List<PurchaseRequest> requests = requestRepository.searchForTracker(
                query.trim(), PageRequest.of(0, SEARCH_LIMIT));
        return assembleAll(requests);
    }

    /**
     * Детальные модели закупок по списку номеров заявок, в порядке переданных id.
     * Batch-загрузка связанных сущностей (без N+1). Используется для «Избранного».
     */
    @Transactional(readOnly = true)
    public List<ProcurementTrackerDto> getByIdPurchaseRequestIn(List<Long> idPurchaseRequests) {
        if (idPurchaseRequests == null || idPurchaseRequests.isEmpty()) {
            return Collections.emptyList();
        }
        List<PurchaseRequest> requests = requestRepository.findByIdPurchaseRequestIn(idPurchaseRequests);
        // Сохраняем порядок переданных id (например, «свежее избранное — сверху»)
        Map<Long, PurchaseRequest> byId = requests.stream()
                .filter(r -> r.getIdPurchaseRequest() != null)
                .collect(Collectors.toMap(PurchaseRequest::getIdPurchaseRequest, Function.identity(), (a, b) -> a));
        List<PurchaseRequest> ordered = idPurchaseRequests.stream()
                .map(byId::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
        return assembleAll(ordered);
    }

    /** Batch-сборка DTO по готовому списку заявок (общая логика для поиска и избранного). */
    private List<ProcurementTrackerDto> assembleAll(List<PurchaseRequest> requests) {
        if (requests.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> ids = requests.stream()
                .map(PurchaseRequest::getIdPurchaseRequest)
                .filter(Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());

        Map<Long, List<PurchaseRequestApproval>> reqApprovalsByReq =
                groupBy(requestApprovalRepository.findByIdPurchaseRequestIn(ids), PurchaseRequestApproval::getIdPurchaseRequest);
        Map<Long, List<Purchase>> purchasesByReq =
                groupBy(purchaseRepository.findByPurchaseRequestIdIn(ids), Purchase::getPurchaseRequestId);
        Map<Long, List<PurchaseApproval>> purchaseApprovalsByReq =
                groupBy(purchaseApprovalRepository.findByPurchaseRequestIdIn(ids), PurchaseApproval::getPurchaseRequestId);
        Map<Long, List<Contract>> contractsByReq =
                groupBy(contractRepository.findWithSuppliersByPurchaseRequestIdIn(ids), Contract::getPurchaseRequestId);

        // Основной договор на заявку → batch-загрузка их согласований
        Map<Long, Contract> primaryByReq = new java.util.HashMap<>();
        for (Long id : ids) {
            primaryByReq.put(id, pickPrimaryContract(contractsByReq.getOrDefault(id, Collections.emptyList())));
        }
        List<Long> primaryContractIds = primaryByReq.values().stream()
                .filter(Objects::nonNull)
                .map(Contract::getId)
                .collect(Collectors.toList());
        Map<Long, List<ContractApproval>> contractApprovalsByContract = primaryContractIds.isEmpty()
                ? Collections.emptyMap()
                : groupBy(contractApprovalRepository.findByContractIdIn(primaryContractIds), ContractApproval::getContractId);

        return requests.stream().map(pr -> {
            Long id = pr.getIdPurchaseRequest();
            Contract primary = id == null ? null : primaryByReq.get(id);
            return assemble(
                    pr,
                    id == null ? Collections.emptyList() : reqApprovalsByReq.getOrDefault(id, Collections.emptyList()),
                    id == null ? Collections.emptyList() : purchasesByReq.getOrDefault(id, Collections.emptyList()),
                    id == null ? Collections.emptyList() : purchaseApprovalsByReq.getOrDefault(id, Collections.emptyList()),
                    id == null ? Collections.emptyList() : contractsByReq.getOrDefault(id, Collections.emptyList()),
                    primary,
                    primary == null ? Collections.emptyList()
                            : contractApprovalsByContract.getOrDefault(primary.getId(), Collections.emptyList()));
        }).collect(Collectors.toList());
    }

    /** Детальная модель одной закупки по номеру заявки (один запрос — N+1 не возникает). */
    @Transactional(readOnly = true)
    public ProcurementTrackerDto getByIdPurchaseRequest(Long idPurchaseRequest) {
        return requestRepository.findByIdPurchaseRequest(idPurchaseRequest)
                .map(pr -> {
                    Long id = pr.getIdPurchaseRequest();
                    List<Contract> contracts = id == null
                            ? Collections.emptyList() : contractRepository.findByPurchaseRequestId(id);
                    Contract primary = pickPrimaryContract(contracts);
                    return assemble(
                            pr,
                            id == null ? Collections.emptyList() : requestApprovalRepository.findByIdPurchaseRequest(id),
                            id == null ? Collections.emptyList() : purchaseRepository.findByPurchaseRequestId(id),
                            id == null ? Collections.emptyList() : purchaseApprovalRepository.findByPurchaseRequestId(id),
                            contracts,
                            primary,
                            primary == null ? Collections.emptyList()
                                    : contractApprovalRepository.findByContractId(primary.getId()));
                })
                .orElse(null);
    }

    // ─────────────────────────────── Построение модели ───────────────────────────────

    private ProcurementTrackerDto assemble(
            PurchaseRequest pr,
            List<PurchaseRequestApproval> reqApprovals,
            List<Purchase> purchases,
            List<PurchaseApproval> purchaseApprovals,
            List<Contract> contracts,
            Contract primaryContract,
            List<ContractApproval> contractApprovals) {
        Long id = pr.getIdPurchaseRequest();

        boolean hasPurchase = !purchases.isEmpty();
        boolean purchaseCompleted = purchases.stream().anyMatch(p -> p.getStatus() == PurchaseStatus.COMPLETED);
        boolean hasContract = !contracts.isEmpty();
        boolean contractSigned = contracts.stream().anyMatch(c -> c.getStatus() == ContractStatus.SIGNED);
        boolean requestApproved = pr.getStatus() != null && REQUEST_APPROVED.contains(pr.getStatus());

        // Завершённость этапов (монотонно: завершённость позднего этапа влечёт завершённость ранних)
        boolean s4done = contractSigned;
        boolean s3done = s4done || purchaseCompleted || hasContract;
        boolean s2done = s3done || requestApproved || hasPurchase;
        boolean[] doneArr = {true, s2done, s3done, s4done};

        int currentIdx = 3;
        boolean allDone = true;
        for (int i = 0; i < 4; i++) {
            if (!doneArr[i]) {
                currentIdx = i;
                allDone = false;
                break;
            }
        }
        int stageIdx = allDone ? 3 : currentIdx;

        // Признак прямого заказа («Заказ», requiresPurchase = false): на 3-м этапе оформляется
        // спецификация, а не договор — влияет на подписи этапа и итоговую фразу статуса.
        boolean isOrder = !(pr.getRequiresPurchase() != null && pr.getRequiresPurchase());

        // Заявка попадает в группу «Архив» поиска, если её статус терминальный/неактивный
        // (Проект, Не согласовано, Архив) либо она помечена скрытой (excludeFromInWork).
        PurchaseRequestStatusGroup statusGroup = pr.getStatus() != null ? pr.getStatus().getGroup() : null;
        boolean hidden = pr.getExcludeFromInWork() != null && pr.getExcludeFromInWork();
        boolean archived = hidden || (statusGroup != null && ARCHIVE_GROUPS.contains(statusGroup));

        List<TrackerStageDto> stages = new ArrayList<>(4);
        stages.add(buildStage(0, doneArr, currentIdx, allDone, Collections.emptyList(),
                pr.getPurchaseRequestCreationDate(),
                pr.getPurchaseRequestInitiator() != null ? "Инициатор: " + pr.getPurchaseRequestInitiator() : ""));
        stages.add(buildStage(1, doneArr, currentIdx, allDone, mapApprovalSteps(toApprovalRows(reqApprovals)),
                maxCompletion(toApprovalRows(reqApprovals)), stageNote(1, doneArr[1], currentIdx == 1, isOrder)));
        stages.add(buildStage(2, doneArr, currentIdx, allDone, mapApprovalSteps(toPurchaseRows(purchaseApprovals)),
                maxCompletion(toPurchaseRows(purchaseApprovals)), stageNote(2, doneArr[2], currentIdx == 2, isOrder)));
        // Этап «Договор»: показываем только содержательные согласования, а технические этапы
        // (регистрация/синхронизация/принятие на хранение) сворачиваем в единый финальный подшаг
        // «Подписание» — регистрация/синхронизация и есть подписание. «Подписание» становится
        // текущим, как только стартует эта задача (или статус «На регистрации»/«На синхронизации»).
        List<ApprovalRow> contractRows = toContractRows(contractApprovals);
        List<ApprovalRow> businessRows = contractRows.stream()
                .filter(r -> !isTechnicalContractStage(r.stage()))
                .collect(Collectors.toList());
        List<ApprovalRow> technicalRows = contractRows.stream()
                .filter(r -> isTechnicalContractStage(r.stage()))
                .collect(Collectors.toList());
        boolean signingByStatus = primaryContract != null
                && (primaryContract.getStatus() == ContractStatus.ON_REGISTRATION
                    || primaryContract.getStatus() == ContractStatus.ON_SYNCHRONIZATION);
        // Если договор/спецификация уже подписан(а) — скрываем «серые» (ещё не начатые, wait)
        // согласования: они не имели значения для итога.
        List<TrackerStepDto> businessSteps = mapApprovalSteps(businessRows);
        if (contractSigned) {
            businessSteps = businessSteps.stream()
                    .filter(s -> !"wait".equals(s.state()))
                    .collect(Collectors.toList());
        }
        List<TrackerStepDto> contractSteps = new ArrayList<>(businessSteps);
        contractSteps.add(buildSigningStep(contractSigned, signingByStatus, technicalRows, primaryContract, contractApprovals));
        stages.add(buildStage(3, doneArr, currentIdx, allDone, contractSteps,
                contractSigned ? contractSignedDate(primaryContract, contractApprovals) : null,
                stageNote(3, doneArr[3], currentIdx == 3, isOrder)));

        String signed = null, contractor = null, contractSum = null;
        if (contractSigned && primaryContract != null) {
            LocalDateTime signedDate = contractSignedDate(primaryContract, contractApprovals);
            signed = signedDate != null ? signedDate.format(DATE_FULL) : "";
            contractor = suppliersLabel(primaryContract.getSuppliers());
            contractSum = formatBudget(primaryContract.getBudgetAmount(), primaryContract.getCurrency());
        }

        // Признак: заявка требует проведения закупки («Закупка») или прямой заказ («Заказ»)
        String kind = isOrder ? "Заказ" : "Закупка";

        // Прогноз даты договора — заглушка: +14 рабочих дней от текущей даты (только для незавершённых)
        String forecast = allDone ? null : computeForecast();

        return new ProcurementTrackerDto(
                id,
                safe(firstNonBlank(pr.getPurchaseRequestSubject(), pr.getName(), pr.getTitle())),
                formatBudget(pr.getBudgetAmount(), pr.getCurrency()),
                safe(pr.getPurchaseRequestInitiator()),
                safe(pr.getPurchaser()),
                "",
                pr.getPurchaseRequestCreationDate() != null ? pr.getPurchaseRequestCreationDate().format(DATE_FULL) : "",
                stageIdx,
                allDone,
                forecast,
                signed,
                contractor,
                contractSum,
                statusPhrase(allDone, stageIdx, isOrder),
                stages,
                kind,
                archived
        );
    }

    private TrackerStageDto buildStage(int index, boolean[] doneArr, int currentIdx, boolean allDone,
                                       List<TrackerStepDto> steps, LocalDateTime stageDate, String note) {
        String state;
        if (allDone) {
            state = "done";
        } else if (doneArr[index]) {
            state = "done";
        } else if (index == currentIdx) {
            state = "current";
        } else {
            state = "wait";
        }
        String date = "done".equals(state) && stageDate != null ? stageDate.format(DATE_FULL) : "";
        return new TrackerStageDto(STAGE_NAMES[index], STAGE_OFFS[index], state, date, note, steps);
    }

    // ─────────────────────────────── Шаги согласований ───────────────────────────────

    /** Унифицированная строка согласования для маппинга шагов. */
    private record ApprovalRow(String role, String stage, LocalDateTime assignment, LocalDateTime completion, Integer days) {}

    private List<ApprovalRow> toApprovalRows(List<PurchaseRequestApproval> list) {
        return list.stream()
                .map(a -> new ApprovalRow(a.getRole(), a.getStage(), a.getAssignmentDate(), a.getCompletionDate(), a.getDaysInWork()))
                .collect(Collectors.toList());
    }

    private List<ApprovalRow> toPurchaseRows(List<PurchaseApproval> list) {
        return list.stream()
                .map(a -> new ApprovalRow(a.getRole(), a.getStage(), a.getAssignmentDate(), a.getCompletionDate(), a.getDaysInWork()))
                .collect(Collectors.toList());
    }

    private List<ApprovalRow> toContractRows(List<ContractApproval> list) {
        return list.stream()
                .map(a -> new ApprovalRow(a.getRole(), a.getStage(), a.getAssignmentDate(), a.getCompletionDate(), null))
                .collect(Collectors.toList());
    }

    private List<TrackerStepDto> mapApprovalSteps(List<ApprovalRow> rows) {
        return rows.stream()
                .sorted(Comparator.comparing(ApprovalRow::assignment, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(r -> {
                    String state = r.completion() != null ? "done" : (r.assignment() != null ? "current" : "wait");
                    String date;
                    if ("done".equals(state)) {
                        date = r.completion().format(DATE_SHORT);
                    } else if ("current".equals(state)) {
                        date = "с " + r.assignment().format(DATE_SHORT);
                    } else {
                        date = "";
                    }
                    String who = firstNonBlank(r.role(), r.stage());
                    return new TrackerStepDto(who, who, state, date, r.days() != null ? r.days() : 0);
                })
                .collect(Collectors.toList());
    }

    /** Технические этапы согласования договора/спецификации, сворачиваемые в подшаг «Подписание». */
    private static final Set<String> TECHNICAL_CONTRACT_STAGE_PREFIXES = Set.of(
            "синхронизация", "принятие на хранение", "регистрация");

    /** Технический этап договора (регистрация/синхронизация/принятие на хранение) — по префиксу названия. */
    private static boolean isTechnicalContractStage(String stage) {
        if (stage == null || stage.isBlank()) return false;
        String normalized = stage.trim().toLowerCase();
        return TECHNICAL_CONTRACT_STAGE_PREFIXES.stream().anyMatch(normalized::startsWith);
    }

    /**
     * Финальный подшаг этапа «Договор» — «Подписание» (сюда свёрнуты технические этапы
     * регистрации/синхронизации). Присутствует всегда: done — договор/спецификация подписан(а);
     * current — только когда статус договора/спецификации «На регистрации»/«На синхронизации»;
     * wait — иначе. Дата: для current — «с DD.MM» (старт технической задачи, если известен).
     */
    private TrackerStepDto buildSigningStep(boolean contractSigned, boolean signingByStatus,
                                            List<ApprovalRow> technicalRows,
                                            Contract primaryContract, List<ContractApproval> approvals) {
        LocalDateTime signingStart = technicalRows.stream()
                .map(ApprovalRow::assignment)
                .filter(Objects::nonNull)
                .min(Comparator.naturalOrder())
                .orElse(null);
        String state = contractSigned ? "done" : (signingByStatus ? "current" : "wait");
        String date;
        if (contractSigned) {
            LocalDateTime signedDate = contractSignedDate(primaryContract, approvals);
            date = signedDate != null ? signedDate.format(DATE_SHORT) : "";
        } else if ("current".equals(state) && signingStart != null) {
            date = "с " + signingStart.format(DATE_SHORT);
        } else {
            date = "";
        }
        return new TrackerStepDto("Подписание", "Подписание", state, date, 0);
    }

    // ─────────────────────────────── Вспомогательные ───────────────────────────────

    /** Основной договор: приоритет подписанному, затем «родительскому» (не спецификация), затем самому свежему. */
    private Contract pickPrimaryContract(List<Contract> contracts) {
        if (contracts.isEmpty()) return null;
        return contracts.stream()
                .filter(c -> c.getStatus() == ContractStatus.SIGNED)
                .findFirst()
                .orElseGet(() -> contracts.stream()
                        .sorted(Comparator
                                .comparing((Contract c) -> c.getParentContractId() == null ? 0 : 1)
                                .thenComparing(c -> c.getContractCreationDate(),
                                        Comparator.nullsLast(Comparator.reverseOrder())))
                        .findFirst()
                        .orElse(null));
    }

    private LocalDateTime maxCompletion(List<ApprovalRow> rows) {
        return rows.stream()
                .map(ApprovalRow::completion)
                .filter(java.util.Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
    }

    private LocalDateTime contractSignedDate(Contract contract, List<ContractApproval> approvals) {
        LocalDateTime fromApprovals = approvals.stream()
                .map(ContractApproval::getCompletionDate)
                .filter(java.util.Objects::nonNull)
                .max(Comparator.naturalOrder())
                .orElse(null);
        if (fromApprovals != null) return fromApprovals;
        return contract != null ? contract.getContractCreationDate() : null;
    }

    private String suppliersLabel(Set<Supplier> suppliers) {
        if (suppliers == null || suppliers.isEmpty()) return "";
        return suppliers.stream()
                .map(Supplier::getName)
                .filter(n -> n != null && !n.isBlank())
                .collect(Collectors.joining(", "));
    }

    private String stageNote(int index, boolean done, boolean current, boolean isOrder) {
        // Для прямых заказов (requiresPurchase = false) на 3-м этапе речь идёт о спецификации,
        // а не о договоре — поэтому подписи «Договор …» заменяются на «Спецификация …».
        return switch (index) {
            case 1 -> done ? "Согласование пройдено" : (current ? "На согласовании" : "");
            case 2 -> done ? "Поставщик выбран" : (current ? "Идёт выбор поставщика" : "Начнётся после согласования заявки");
            case 3 -> done
                    ? (isOrder ? "Спецификация подписана" : "Договор подписан")
                    : (current ? (isOrder ? "Спецификация в работе" : "Договор в работе") : "Начнётся после выбора поставщика");
            default -> "";
        };
    }

    private String statusPhrase(boolean allDone, int stageIdx, boolean isOrder) {
        if (allDone) return (isOrder ? "Спецификация подписана" : "Договор подписан") + " — закупка завершена";
        return switch (stageIdx) {
            case 0 -> "Заявка создана";
            case 1 -> "Заявка на согласовании";
            case 2 -> "Закупщик выбирает поставщика";
            case 3 -> isOrder ? "Спецификация в работе" : "Договор в работе";
            default -> "";
        };
    }

    /** Компактный формат суммы: млрд / млн / тыс. с валютой (по умолчанию UZS). */
    private String formatBudget(BigDecimal amount, String currency) {
        if (amount == null) return "";
        String cur = (currency == null || currency.isBlank()) ? "UZS" : currency.trim();
        double v = amount.doubleValue();
        if (v >= 1_000_000_000d) {
            return String.format(RU, "%.1f млрд %s", v / 1_000_000_000d, cur);
        } else if (v >= 1_000_000d) {
            return String.format(RU, "%.0f млн %s", v / 1_000_000d, cur);
        } else if (v >= 1_000d) {
            return String.format(RU, "%.0f тыс %s", v / 1_000d, cur);
        }
        return String.format(RU, "%.0f %s", v, cur);
    }

    /** Прогноз даты договора (заглушка): +N рабочих дней от текущей даты, формат «к 16 июля». */
    private String computeForecast() {
        LocalDate date = workingDayService.addWorkingDaysAfterDate(LocalDate.now(), FORECAST_WORKING_DAYS);
        return "к " + date.getDayOfMonth() + " " + MONTHS_GENITIVE[date.getMonthValue() - 1];
    }

    /** Группировка списка по ключу (null-ключи отбрасываются). */
    private static <T> Map<Long, List<T>> groupBy(List<T> list, Function<T, Long> keyFn) {
        return list.stream()
                .filter(t -> keyFn.apply(t) != null)
                .collect(Collectors.groupingBy(keyFn));
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.isBlank()) return v;
        }
        return "";
    }

    private static String safe(String v) {
        return v == null ? "" : v;
    }
}
