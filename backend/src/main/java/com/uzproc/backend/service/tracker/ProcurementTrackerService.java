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
import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.repository.contract.ContractApprovalRepository;
import com.uzproc.backend.repository.contract.ContractRepository;
import com.uzproc.backend.repository.purchase.PurchaseApprovalRepository;
import com.uzproc.backend.repository.purchase.PurchaseRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestApprovalRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
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

    private final PurchaseRequestRepository requestRepository;
    private final PurchaseRequestApprovalRepository requestApprovalRepository;
    private final PurchaseRepository purchaseRepository;
    private final PurchaseApprovalRepository purchaseApprovalRepository;
    private final ContractRepository contractRepository;
    private final ContractApprovalRepository contractApprovalRepository;

    public ProcurementTrackerService(
            PurchaseRequestRepository requestRepository,
            PurchaseRequestApprovalRepository requestApprovalRepository,
            PurchaseRepository purchaseRepository,
            PurchaseApprovalRepository purchaseApprovalRepository,
            ContractRepository contractRepository,
            ContractApprovalRepository contractApprovalRepository) {
        this.requestRepository = requestRepository;
        this.requestApprovalRepository = requestApprovalRepository;
        this.purchaseRepository = purchaseRepository;
        this.purchaseApprovalRepository = purchaseApprovalRepository;
        this.contractRepository = contractRepository;
        this.contractApprovalRepository = contractApprovalRepository;
    }

    /** Поиск закупок по номеру/предмету/инициатору. Пустой запрос → пустой результат (страница публичная). */
    @Transactional(readOnly = true)
    public List<ProcurementTrackerDto> search(String query) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }
        List<PurchaseRequest> found = requestRepository.searchForTracker(
                query.trim(), PageRequest.of(0, SEARCH_LIMIT));
        return found.stream().map(this::buildDto).collect(Collectors.toList());
    }

    /** Детальная модель одной закупки по номеру заявки. */
    @Transactional(readOnly = true)
    public ProcurementTrackerDto getByIdPurchaseRequest(Long idPurchaseRequest) {
        return requestRepository.findByIdPurchaseRequest(idPurchaseRequest)
                .map(this::buildDto)
                .orElse(null);
    }

    // ─────────────────────────────── Построение модели ───────────────────────────────

    private ProcurementTrackerDto buildDto(PurchaseRequest pr) {
        Long id = pr.getIdPurchaseRequest();

        List<PurchaseRequestApproval> reqApprovals = id == null
                ? Collections.emptyList() : requestApprovalRepository.findByIdPurchaseRequest(id);
        List<Purchase> purchases = id == null
                ? Collections.emptyList() : purchaseRepository.findByPurchaseRequestId(id);
        List<PurchaseApproval> purchaseApprovals = id == null
                ? Collections.emptyList() : purchaseApprovalRepository.findByPurchaseRequestId(id);
        List<Contract> contracts = id == null
                ? Collections.emptyList() : contractRepository.findByPurchaseRequestId(id);

        Contract primaryContract = pickPrimaryContract(contracts);
        List<ContractApproval> contractApprovals = primaryContract == null
                ? Collections.emptyList() : contractApprovalRepository.findByContractId(primaryContract.getId());

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

        List<TrackerStageDto> stages = new ArrayList<>(4);
        stages.add(buildStage(0, doneArr, currentIdx, allDone, Collections.emptyList(),
                pr.getPurchaseRequestCreationDate(),
                pr.getPurchaseRequestInitiator() != null ? "Инициатор: " + pr.getPurchaseRequestInitiator() : ""));
        stages.add(buildStage(1, doneArr, currentIdx, allDone, mapApprovalSteps(toApprovalRows(reqApprovals)),
                maxCompletion(toApprovalRows(reqApprovals)), stageNote(1, doneArr[1], currentIdx == 1)));
        stages.add(buildStage(2, doneArr, currentIdx, allDone, mapApprovalSteps(toPurchaseRows(purchaseApprovals)),
                maxCompletion(toPurchaseRows(purchaseApprovals)), stageNote(2, doneArr[2], currentIdx == 2)));
        stages.add(buildStage(3, doneArr, currentIdx, allDone, mapApprovalSteps(toContractRows(contractApprovals)),
                contractSigned ? contractSignedDate(primaryContract, contractApprovals) : null,
                stageNote(3, doneArr[3], currentIdx == 3)));

        String signed = null, contractor = null, contractSum = null;
        if (contractSigned && primaryContract != null) {
            LocalDateTime signedDate = contractSignedDate(primaryContract, contractApprovals);
            signed = signedDate != null ? signedDate.format(DATE_FULL) : "";
            contractor = suppliersLabel(primaryContract.getSuppliers());
            contractSum = formatBudget(primaryContract.getBudgetAmount(), primaryContract.getCurrency());
        }

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
                null,
                signed,
                contractor,
                contractSum,
                statusPhrase(allDone, stageIdx),
                stages
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

    private String stageNote(int index, boolean done, boolean current) {
        return switch (index) {
            case 1 -> done ? "Согласование пройдено" : (current ? "На согласовании" : "");
            case 2 -> done ? "Поставщик выбран" : (current ? "Идёт выбор поставщика" : "Начнётся после согласования заявки");
            case 3 -> done ? "Договор подписан" : (current ? "Договор в работе" : "Начнётся после выбора поставщика");
            default -> "";
        };
    }

    private String statusPhrase(boolean allDone, int stageIdx) {
        if (allDone) return "Договор подписан — закупка завершена";
        return switch (stageIdx) {
            case 0 -> "Заявка создана";
            case 1 -> "Заявка на согласовании";
            case 2 -> "Закупщик выбирает поставщика";
            case 3 -> "Договор в работе";
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
