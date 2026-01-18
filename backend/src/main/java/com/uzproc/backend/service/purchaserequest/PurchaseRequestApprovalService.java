package com.uzproc.backend.service.purchaserequest;

import com.uzproc.backend.dto.PurchaseRequestApprovalDto;
import com.uzproc.backend.entity.PurchaseRequestApproval;
import com.uzproc.backend.repository.PurchaseRequestApprovalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PurchaseRequestApprovalService {

    private final PurchaseRequestApprovalRepository approvalRepository;

    public PurchaseRequestApprovalService(PurchaseRequestApprovalRepository approvalRepository) {
        this.approvalRepository = approvalRepository;
    }

    /**
     * Получить все согласования для заявки по id_purchase_request
     */
    public List<PurchaseRequestApprovalDto> findByPurchaseRequestId(Long idPurchaseRequest) {
        List<PurchaseRequestApproval> approvals = approvalRepository.findByIdPurchaseRequest(idPurchaseRequest);
        return approvals.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Получить согласования для заявки по этапу
     */
    public List<PurchaseRequestApprovalDto> findByPurchaseRequestIdAndStage(Long idPurchaseRequest, String stage) {
        List<PurchaseRequestApproval> approvals = approvalRepository.findByIdPurchaseRequestAndStage(idPurchaseRequest, stage);
        return approvals.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Конвертирует PurchaseRequestApproval entity в PurchaseRequestApprovalDto
     */
    private PurchaseRequestApprovalDto toDto(PurchaseRequestApproval entity) {
        PurchaseRequestApprovalDto dto = new PurchaseRequestApprovalDto();
        dto.setId(entity.getId());
        dto.setIdPurchaseRequest(entity.getIdPurchaseRequest());
        dto.setStage(entity.getStage());
        dto.setRole(entity.getRole());
        dto.setAssignmentDate(entity.getAssignmentDate());
        dto.setCompletionDate(entity.getCompletionDate());
        dto.setDaysInWork(entity.getDaysInWork());
        dto.setCompletionResult(entity.getCompletionResult());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}

