package com.uzproc.backend.service.contract;

import com.uzproc.backend.dto.contract.ContractDto;
import com.uzproc.backend.dto.contract.ContractSlaByPreparerDto;
import com.uzproc.backend.dto.contract.ContractSlaMonthDto;
import com.uzproc.backend.dto.contract.ContractSlaResponseDto;
import com.uzproc.backend.dto.contract.ContractSlaRowDto;
import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.contract.ContractStatus;
import com.uzproc.backend.repository.contract.ContractApprovalRepository;
import com.uzproc.backend.repository.contract.ContractRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Данные дашборда «SLA договоров»: по подписанным документам считается выполнение планового SLA
 * этапов «Подготовка», «Согласование» и «Подписание» (см. {@link ContractSlaPlan}).
 *
 * <p>Документ считается подписанным в дату регистрации (для спецификаций — синхронизации).
 * Нарушение SLA — просрочка хотя бы одного этапа, у которого задан плановый срок.
 *
 * <p>В расчёт попадают только документы, подготовленные договорником
 * (preparedBy.isContractor = true), — как на вкладке «Подписаны» таблицы договоров.
 */
@Service
@Transactional(readOnly = true)
public class ContractSlaDashboardService {

    private static final Logger logger = LoggerFactory.getLogger(ContractSlaDashboardService.class);

    private static final String SPECIFICATION_FORM = "Спецификация";
    private static final String NOT_ASSIGNED = "Не назначен";
    /** ЦФО, который исключает переключатель «без 1P» (как в таблице договоров). */
    private static final String CFO_1P = "M - Commerce 1Р";
    /** Размер порции договоров для обогащения (batch-запросы IN (...) не должны разрастаться). */
    private static final int ENRICH_CHUNK_SIZE = 500;

    private final ContractRepository contractRepository;
    private final ContractApprovalRepository contractApprovalRepository;
    private final ContractService contractService;

    public ContractSlaDashboardService(
            ContractRepository contractRepository,
            ContractApprovalRepository contractApprovalRepository,
            ContractService contractService) {
        this.contractRepository = contractRepository;
        this.contractApprovalRepository = contractApprovalRepository;
        this.contractService = contractService;
    }

    /**
     * Данные дашборда за год.
     *
     * @param year       год подписания документов
     * @param preparedBy опциональный фильтр по договорному специалисту (ФИО подготовившего)
     * @param exclude1p  переключатель «без 1P»: исключить документы ЦФО «M - Commerce 1Р»
     * @param month      месяц (1–12) для списков документов; null — текущий месяц (для прошлых лет декабрь)
     */
    public ContractSlaResponseDto getContractSlaData(int year, String preparedBy, boolean exclude1p, Integer month) {
        LocalDateTime from = LocalDateTime.of(year, 1, 1, 0, 0);
        LocalDateTime to = from.plusYears(1);

        List<Long> candidateIds = contractApprovalRepository.findContractIdsSignedBetween(from, to);
        String preparerFilter = (preparedBy != null && !preparedBy.trim().isEmpty()) ? preparedBy.trim() : null;
        String excludeCfoName = exclude1p ? CFO_1P : null;

        // Обогащение идёт чанками: за год подписываются тысячи документов, а enrichContracts
        // тянет зависимости batch-запросами IN (...) по переданному списку.
        List<ContractSlaRowDto> rows = new ArrayList<>();
        for (int start = 0; start < candidateIds.size(); start += ENRICH_CHUNK_SIZE) {
            List<Long> chunk = candidateIds.subList(start, Math.min(start + ENRICH_CHUNK_SIZE, candidateIds.size()));
            // Только подписанные документы, подготовленные договорником, — как на вкладке «Подписаны» таблицы договоров
            List<Contract> signedChunk = excludeCfoName != null
                    ? contractRepository.findByIdsAndStatusPreparedByContractorExcludingCfo(
                        chunk, ContractStatus.SIGNED, excludeCfoName)
                    : contractRepository.findByIdsAndStatusPreparedByContractor(chunk, ContractStatus.SIGNED);
            if (signedChunk.isEmpty()) continue;
            contractService.enrichContracts(signedChunk).stream()
                    .map(this::toSlaRow)
                    .filter(java.util.Objects::nonNull)
                    .filter(r -> r.signingDate().getYear() == year)
                    .filter(r -> preparerFilter == null || preparerFilter.equalsIgnoreCase(preparerName(r.preparedBy())))
                    .forEach(rows::add);
        }
        rows.sort(Comparator.comparing(ContractSlaRowDto::signingDate).reversed());

        // Месяц для списков документов: выбранный на диаграмме либо текущий
        int selectedMonth = (month != null && month >= 1 && month <= 12) ? month : resolveCurrentMonth(year);
        List<ContractSlaRowDto> currentMonthRows = rows.stream()
                .filter(r -> r.signingDate().getMonthValue() == selectedMonth)
                .collect(Collectors.toList());

        int totalSigned = rows.size();
        int metSla = (int) rows.stream().filter(r -> !r.slaViolated()).count();

        ContractSlaResponseDto response = new ContractSlaResponseDto(
                year,
                selectedMonth,
                buildSlaByMonth(rows),
                buildSlaByPreparer(rows),
                totalSigned,
                metSla,
                totalSigned > 0 ? (metSla * 100.0 / totalSigned) : null,
                currentMonthRows.stream().filter(ContractSlaRowDto::slaViolated).collect(Collectors.toList()),
                currentMonthRows.stream().filter(r -> !r.slaViolated()).collect(Collectors.toList()));

        logger.debug("Contract SLA dashboard for year {} (exclude1p={}): {} signed documents, {} met SLA, month {} — {} rows",
                year, exclude1p, totalSigned, metSla, selectedMonth, currentMonthRows.size());
        return response;
    }

    /** Месяц для блоков «подписаны в этом месяце»: текущий, если смотрим текущий год, иначе декабрь. */
    private int resolveCurrentMonth(int year) {
        LocalDate today = LocalDate.now();
        return today.getYear() == year ? today.getMonthValue() : 12;
    }

    /** Строка дашборда из обогащённого DTO договора; null — если дату подписания определить не удалось. */
    private ContractSlaRowDto toSlaRow(ContractDto dto) {
        boolean isSpecification = SPECIFICATION_FORM.equals(dto.getDocumentForm());
        LocalDateTime signingDate = isSpecification ? dto.getSynchronizationDate() : dto.getRegistrationDate();
        if (signingDate == null) {
            return null;
        }

        boolean violated = isOverdue(dto.getSlaDelta())
                || isOverdue(dto.getApprovalSlaDelta())
                || isOverdue(dto.getSigningSlaDelta());

        Integer totalFactual = sumStages(
                dto.getPlannedSlaDays() != null ? dto.getPreparationWorkingDays() : null,
                dto.getPlannedApprovalSlaDays() != null ? dto.getApprovalWorkingDays() : null,
                dto.getPlannedSigningSlaDays() != null ? dto.getSigningWorkingDays() : null);
        Integer totalPlanned = sumStages(
                dto.getPreparationWorkingDays() != null ? dto.getPlannedSlaDays() : null,
                dto.getApprovalWorkingDays() != null ? dto.getPlannedApprovalSlaDays() : null,
                dto.getSigningWorkingDays() != null ? dto.getPlannedSigningSlaDays() : null);

        return new ContractSlaRowDto(
                dto.getId(),
                dto.getInnerId(),
                dto.getName(),
                dto.getDocumentForm(),
                dto.getIsTypicalForm(),
                dto.getCfo(),
                dto.getPreparedBy(),
                dto.getPurchaseRequestSystemId(),
                dto.getPurchaseRequestInnerId(),
                signingDate,
                dto.getPreparationWorkingDays(),
                dto.getPlannedSlaDays(),
                dto.getSlaDelta(),
                dto.getApprovalWorkingDays(),
                dto.getPlannedApprovalSlaDays(),
                dto.getApprovalSlaDelta(),
                dto.getSigningWorkingDays(),
                dto.getPlannedSigningSlaDays(),
                dto.getSigningSlaDelta(),
                totalFactual,
                totalPlanned,
                violated);
    }

    private static boolean isOverdue(Integer delta) {
        return delta != null && delta < 0;
    }

    /** Сумма значений по этапам; null — если ни одного значения нет. */
    private static Integer sumStages(Integer... values) {
        int sum = 0;
        boolean any = false;
        for (Integer value : values) {
            if (value != null) {
                sum += value;
                any = true;
            }
        }
        return any ? sum : null;
    }

    /** Выполнение SLA по месяцам подписания (все 12 месяцев года). */
    private List<ContractSlaMonthDto> buildSlaByMonth(List<ContractSlaRowDto> rows) {
        List<ContractSlaMonthDto> result = new ArrayList<>(12);
        for (int month = 1; month <= 12; month++) {
            final int m = month;
            List<ContractSlaRowDto> monthRows = rows.stream()
                    .filter(r -> r.signingDate().getMonthValue() == m)
                    .collect(Collectors.toList());
            int total = monthRows.size();
            int met = (int) monthRows.stream().filter(r -> !r.slaViolated()).count();
            result.add(new ContractSlaMonthDto(month, total, met, total > 0 ? (met * 100.0 / total) : null));
        }
        return result;
    }

    /** Выполнение SLA за год по договорным специалистам; «Не назначен» — последним. */
    private List<ContractSlaByPreparerDto> buildSlaByPreparer(List<ContractSlaRowDto> rows) {
        Map<String, int[]> byPreparer = new LinkedHashMap<>();
        for (ContractSlaRowDto row : rows) {
            int[] counts = byPreparer.computeIfAbsent(preparerName(row.preparedBy()), k -> new int[2]);
            counts[0]++;
            if (!row.slaViolated()) counts[1]++;
        }
        List<ContractSlaByPreparerDto> result = byPreparer.entrySet().stream()
                .map(e -> {
                    int total = e.getValue()[0];
                    int met = e.getValue()[1];
                    return new ContractSlaByPreparerDto(e.getKey(), total, met, total > 0 ? (met * 100.0 / total) : null);
                })
                .collect(Collectors.toCollection(ArrayList::new));
        result.sort(Comparator.comparing(ContractSlaByPreparerDto::preparedBy, (a, b) -> {
            if (NOT_ASSIGNED.equals(a)) return 1;
            if (NOT_ASSIGNED.equals(b)) return -1;
            return a.compareTo(b);
        }));
        return result;
    }

    private static String preparerName(String preparedBy) {
        return (preparedBy == null || preparedBy.trim().isEmpty()) ? NOT_ASSIGNED : preparedBy.trim();
    }
}
