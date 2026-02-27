package com.uzproc.backend.service.contract;

import com.uzproc.backend.dto.contract.ContractApprovalDto;
import com.uzproc.backend.entity.contract.ContractApproval;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.contract.ContractApprovalRepository;
import com.uzproc.backend.repository.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Сервис для работы с согласованиями договоров (contract_approvals).
 * Этапы «Синхронизация», «Принятие на хранение», «Регистрация» не отдаются в API.
 */
@Service
@Transactional(readOnly = true)
public class ContractApprovalService {

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
