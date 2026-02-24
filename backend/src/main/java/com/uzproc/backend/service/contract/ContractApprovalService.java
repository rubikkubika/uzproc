package com.uzproc.backend.service.contract;

import com.uzproc.backend.dto.contract.ContractApprovalDto;
import com.uzproc.backend.entity.contract.ContractApproval;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.contract.ContractApprovalRepository;
import com.uzproc.backend.repository.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Сервис для работы с согласованиями договоров (contract_approvals).
 */
@Service
@Transactional(readOnly = true)
public class ContractApprovalService {

    private final ContractApprovalRepository contractApprovalRepository;
    private final UserRepository userRepository;

    public ContractApprovalService(ContractApprovalRepository contractApprovalRepository,
                                   UserRepository userRepository) {
        this.contractApprovalRepository = contractApprovalRepository;
        this.userRepository = userRepository;
    }

    /**
     * Получить все согласования по id договора.
     */
    public List<ContractApprovalDto> findByContractId(Long contractId) {
        List<ContractApproval> list = contractApprovalRepository.findByContractId(contractId);
        return list.stream().map(this::toDto).collect(Collectors.toList());
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
