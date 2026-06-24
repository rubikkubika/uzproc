package com.uzproc.backend.service.purchaserequest;

import com.uzproc.backend.dto.purchaserequest.PurchaseRequestApprovalDto;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestApproval;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestApprovalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
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
        // Карточка показывает историю всех кругов согласования
        List<PurchaseRequestApproval> approvals = approvalRepository.findAllByIdPurchaseRequestOrderByStageAscRoleAscRoundAsc(idPurchaseRequest);
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
     * Устанавливает учитываемый в SLA круг согласования для заявки.
     * Логика выбора круга идентична закупкам (точное совпадение → ближайший меньший → последний).
     * round = null → вернуться к последнему кругу.
     */
    @Transactional
    public List<PurchaseRequestApprovalDto> setCountedRound(Long idPurchaseRequest, Integer round) {
        List<PurchaseRequestApproval> all = approvalRepository
                .findAllByIdPurchaseRequestOrderByStageAscRoleAscRoundAsc(idPurchaseRequest);
        Map<String, List<PurchaseRequestApproval>> byStageRole = all.stream()
                .collect(Collectors.groupingBy(a -> a.getStage() + " " + a.getRole()));
        List<PurchaseRequestApproval> toSave = new ArrayList<>();
        for (List<PurchaseRequestApproval> group : byStageRole.values()) {
            PurchaseRequestApproval target = pickRound(group, round);
            for (PurchaseRequestApproval a : group) {
                boolean shouldCount = a == target;
                if (!Boolean.valueOf(shouldCount).equals(a.getCountedInSla())) {
                    a.setCountedInSla(shouldCount);
                    toSave.add(a);
                }
            }
        }
        if (!toSave.isEmpty()) {
            approvalRepository.saveAll(toSave);
        }
        return findByPurchaseRequestId(idPurchaseRequest);
    }

    private PurchaseRequestApproval pickRound(List<PurchaseRequestApproval> group, Integer round) {
        if (round == null) {
            return group.stream().max(Comparator.comparingInt(PurchaseRequestApproval::getRound)).orElse(null);
        }
        PurchaseRequestApproval exact = group.stream()
                .filter(a -> round.equals(a.getRound())).findFirst().orElse(null);
        if (exact != null) {
            return exact;
        }
        PurchaseRequestApproval leqMax = group.stream()
                .filter(a -> a.getRound() <= round)
                .max(Comparator.comparingInt(PurchaseRequestApproval::getRound)).orElse(null);
        if (leqMax != null) {
            return leqMax;
        }
        return group.stream().max(Comparator.comparingInt(PurchaseRequestApproval::getRound)).orElse(null);
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
        dto.setRound(entity.getRound());
        dto.setCountedInSla(entity.getCountedInSla());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}

