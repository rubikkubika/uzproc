package com.uzproc.backend.service.contract;

import com.uzproc.backend.dto.contract.ContractApprovalDto;
import com.uzproc.backend.dto.contract.ContractRemarkDashboardEntryDto;
import com.uzproc.backend.dto.contract.ContractRemarkDto;
import com.uzproc.backend.dto.contract.ContractRemarksDashboardCategoryDto;
import com.uzproc.backend.dto.contract.ContractRemarksDashboardResponseDto;
import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.contract.ContractApproval;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.contract.ContractApprovalRepository;
import com.uzproc.backend.repository.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Сервис для работы с согласованиями договоров (contract_approvals).
 * Этапы «Синхронизация», «Принятие на хранение», «Регистрация» не отдаются в API.
 */
@Service
@Transactional(readOnly = true)
public class ContractApprovalService {

    /** Категории замечаний в порядке приоритета совпадения. */
    private static final List<String> CATEGORY_ORDER = List.of(
        "Внесены правки",
        "ИКПУ",
        "ЭТТН / ЭСФ",
        "Условия оплаты",
        "НДС и налоги",
        "Реквизиты",
        "Адрес и контакты",
        "Приложения",
        "Спецификация и прайс-лист",
        "Формулировки",
        "Противоречия и несоответствия",
        "Гарантийный срок",
        "Задолженность контрагента",
        "Шаблон договора"
    );

    private static final Map<String, List<String>> CATEGORY_KEYWORDS = new LinkedHashMap<>();
    static {
        CATEGORY_KEYWORDS.put("Внесены правки", List.of(
            "внесены правки", "с учетом замечаний", "учесть замечани",
            "учесть коментари", "учесть комментари", "исправил договор", "исправлен согласно"
        ));
        CATEGORY_KEYWORDS.put("ИКПУ", List.of("икпу"));
        CATEGORY_KEYWORDS.put("ЭТТН / ЭСФ", List.of("эттн", "эсф"));
        CATEGORY_KEYWORDS.put("Условия оплаты", List.of(
            "аванс", "предоплата", "постоплату", "88/12", "30/70",
            "условия оплат", "порядок оплат", "разбивку оплат", "график оплат"
        ));
        CATEGORY_KEYWORDS.put("НДС и налоги", List.of("ндс", "налог"));
        CATEGORY_KEYWORDS.put("Реквизиты", List.of(
            "директор", "реквизит", "должност", "латиниц", "наименование фирм"
        ));
        CATEGORY_KEYWORDS.put("Адрес и контакты", List.of(
            "адрес", "почта", "e-mail", "email", "адрес поставки"
        ));
        CATEGORY_KEYWORDS.put("Приложения", List.of(
            "приложени", "образец акта", "образец дефект", "акт приема", "дефектный акт"
        ));
        CATEGORY_KEYWORDS.put("Спецификация и прайс-лист", List.of(
            "спецификаци", "прайс-лист", "прайс лист", "прайсе", "в прайс",
            "номенклатур", "позиц"
        ));
        CATEGORY_KEYWORDS.put("Формулировки", List.of(
            "перефразировать", "тавтологи", "формулировк", "размытая", "перефразир",
            "заменить на"
        ));
        CATEGORY_KEYWORDS.put("Противоречия и несоответствия", List.of(
            "противоречи", "несоответстви", "дублируют", "противоречат", "несоответствие"
        ));
        CATEGORY_KEYWORDS.put("Гарантийный срок", List.of("гарантийный", "гарантийн"));
        CATEGORY_KEYWORDS.put("Задолженность контрагента", List.of(
            "долг", "задолженност", "не выполняет свои обязательств"
        ));
        CATEGORY_KEYWORDS.put("Шаблон договора", List.of(
            "шаблон договора", "шаблон нашего", "шаблон по", "не использован шаблон",
            "используйте шаблон"
        ));
    }

    private static String categorizeRemark(String text) {
        if (text == null || text.trim().isEmpty()) return "Прочие";
        String lower = text.toLowerCase();
        for (String category : CATEGORY_ORDER) {
            List<String> keywords = CATEGORY_KEYWORDS.get(category);
            if (keywords != null && keywords.stream().anyMatch(lower::contains)) {
                return category;
            }
        }
        return "Прочие";
    }

    private static final Set<String> EXCLUDED_STAGE_PREFIXES = Set.of(
        "синхронизация",
        "принятие на хранение",
        "принятие на хранение:",
        "регистрация",
        "регистрация договора",
        "регистрация:"
    );

    private static boolean isExcludedStage(String stage) {
        if (stage == null || stage.trim().isEmpty()) return true;
        String normalized = stage.trim().toLowerCase();
        return EXCLUDED_STAGE_PREFIXES.stream().anyMatch(normalized::startsWith);
    }

    private final ContractApprovalRepository contractApprovalRepository;
    private final UserRepository userRepository;

    public ContractApprovalService(ContractApprovalRepository contractApprovalRepository,
                                   UserRepository userRepository) {
        this.contractApprovalRepository = contractApprovalRepository;
        this.userRepository = userRepository;
    }

    /**
     * Получить все согласования по id договора (без этапов Синхронизация, Принятие на хранение, Регистрация).
     */
    public List<ContractApprovalDto> findByContractId(Long contractId) {
        List<ContractApproval> list = contractApprovalRepository.findByContractId(contractId);
        return list.stream()
            .filter(a -> !isExcludedStage(a.getStage()))
            .map(this::toDto)
            .collect(Collectors.toList());
    }

    private String formatExecutorName(User user) {
        if (user == null) return null;
        String surname = user.getSurname();
        String name = user.getName();
        if (surname != null && name != null) return surname + " " + name;
        if (name != null) return name;
        if (surname != null) return surname;
        return user.getEmail();
    }

    /**
     * Получить замечания из согласований договоров, подготовленных исполнителями (isContractor=true).
     * Отсортированы от новых к старым. Поддерживает пагинацию.
     */
    public Page<ContractRemarkDto> findAllRemarks(int page, int size) {
        return contractApprovalRepository.findAllRemarksFromContractors(PageRequest.of(page, size))
                .map(this::toRemarkDto);
    }

    private List<ContractApproval> loadRemarksForDashboard(LocalDate dateFrom, LocalDate dateTo) {
        String from = dateFrom != null ? dateFrom.atStartOfDay().toString() : null;
        String to = dateTo != null ? dateTo.atTime(23, 59, 59).toString() : null;
        List<Long> ids = contractApprovalRepository.findRemarkIdsForDashboard(from, to);
        if (ids.isEmpty()) return List.of();
        // Загружаем с join fetch по найденным ID
        return contractApprovalRepository.findAllWithContractAndExecutorByIds(ids);
    }

    /**
     * Дашборд замечаний: категории с количеством, фильтр по дате создания.
     */
    public ContractRemarksDashboardResponseDto getRemarksDashboard(LocalDate dateFrom, LocalDate dateTo) {
        List<ContractApproval> remarks = loadRemarksForDashboard(dateFrom, dateTo);

        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String cat : CATEGORY_ORDER) counts.put(cat, 0);
        counts.put("Прочие", 0);

        for (ContractApproval r : remarks) {
            String cat = categorizeRemark(r.getCommentText());
            counts.merge(cat, 1, Integer::sum);
        }

        List<ContractRemarksDashboardCategoryDto> categories = counts.entrySet().stream()
            .filter(e -> e.getValue() > 0)
            .map(e -> new ContractRemarksDashboardCategoryDto(e.getKey(), e.getValue()))
            .collect(Collectors.toList());

        ContractRemarksDashboardResponseDto response = new ContractRemarksDashboardResponseDto();
        response.setCategories(categories);
        response.setTotalCount(remarks.size());
        return response;
    }

    /**
     * Замечания по конкретной категории с фильтром по дате создания.
     */
    public List<ContractRemarkDashboardEntryDto> getRemarksByCategory(String category, LocalDate dateFrom, LocalDate dateTo) {
        List<ContractApproval> remarks = loadRemarksForDashboard(dateFrom, dateTo);

        return remarks.stream()
            .filter(r -> categorizeRemark(r.getCommentText()).equals(category))
            .map(this::toDashboardEntryDto)
            .collect(Collectors.toList());
    }

    private ContractRemarkDashboardEntryDto toDashboardEntryDto(ContractApproval entity) {
        ContractRemarkDashboardEntryDto dto = new ContractRemarkDashboardEntryDto();
        dto.setContractId(entity.getContractId());
        Contract contract = entity.getContract();
        if (contract != null) {
            dto.setContractInnerId(contract.getInnerId());
            dto.setContractName(contract.getName());
            if (contract.getPreparedBy() != null) {
                dto.setPreparedByName(formatExecutorName(contract.getPreparedBy()));
            }
        }
        User executor = entity.getExecutor();
        if (executor == null && entity.getExecutorId() != null) {
            executor = userRepository.findById(entity.getExecutorId()).orElse(null);
        }
        dto.setExecutorName(formatExecutorName(executor));
        dto.setStage(entity.getStage());
        dto.setRole(entity.getRole());
        dto.setCommentText(entity.getCommentText());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
    }

    private ContractRemarkDto toRemarkDto(ContractApproval entity) {
        ContractRemarkDto dto = new ContractRemarkDto();
        dto.setContractId(entity.getContractId());
        Contract contract = entity.getContract();
        if (contract != null) {
            dto.setContractInnerId(contract.getInnerId());
            dto.setContractName(contract.getName());
            if (contract.getPreparedBy() != null) {
                dto.setPreparedByName(formatExecutorName(contract.getPreparedBy()));
            }
        }
        User executor = entity.getExecutor();
        if (executor == null && entity.getExecutorId() != null) {
            executor = userRepository.findById(entity.getExecutorId()).orElse(null);
        }
        dto.setExecutorName(formatExecutorName(executor));
        dto.setStage(entity.getStage());
        dto.setRole(entity.getRole());
        dto.setCommentText(entity.getCommentText());
        dto.setCompletionDate(entity.getCompletionDate());
        return dto;
    }

    private ContractApprovalDto toDto(ContractApproval entity) {
        ContractApprovalDto dto = new ContractApprovalDto();
        dto.setId(entity.getId());
        dto.setContractId(entity.getContractId());
        dto.setDocumentForm(entity.getDocumentForm());
        dto.setStage(entity.getStage());
        dto.setRole(entity.getRole());
        User executor = entity.getExecutor();
        if (executor == null && entity.getExecutorId() != null) {
            executor = userRepository.findById(entity.getExecutorId()).orElse(null);
        }
        dto.setExecutorName(formatExecutorName(executor));
        dto.setAssignmentDate(entity.getAssignmentDate());
        dto.setPlannedCompletionDate(entity.getPlannedCompletionDate());
        dto.setCompletionDate(entity.getCompletionDate());
        dto.setCompletionResult(entity.getCompletionResult());
        dto.setCommentText(entity.getCommentText());
        dto.setIsWaiting(entity.getIsWaiting());
        return dto;
    }
}
