package com.uzproc.backend.service.purchase;

import com.uzproc.backend.dto.PurchaseApprovalDto;
import com.uzproc.backend.entity.PurchaseApproval;
import com.uzproc.backend.repository.PurchaseApprovalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PurchaseApprovalService {

    private final PurchaseApprovalRepository approvalRepository;

    public PurchaseApprovalService(PurchaseApprovalRepository approvalRepository) {
        this.approvalRepository = approvalRepository;
    }

    /**
     * Получить все согласования для закупки по purchaseRequestId
     */
    public List<PurchaseApprovalDto> findByPurchaseRequestId(Long purchaseRequestId) {
        List<PurchaseApproval> approvals = approvalRepository.findByPurchaseRequestId(purchaseRequestId);
        return approvals.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Получить согласования для закупки по этапу
     */
    public List<PurchaseApprovalDto> findByPurchaseRequestIdAndStage(Long purchaseRequestId, String stage) {
        List<PurchaseApproval> approvals = approvalRepository.findByPurchaseRequestIdAndStage(purchaseRequestId, stage);
        return approvals.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Конвертирует PurchaseApproval entity в PurchaseApprovalDto
     */
    private PurchaseApprovalDto toDto(PurchaseApproval entity) {
        PurchaseApprovalDto dto = new PurchaseApprovalDto();
        dto.setId(entity.getId());
        dto.setPurchaseRequestId(entity.getPurchaseRequestId());
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

