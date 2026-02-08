package com.uzproc.backend.service.purchaserequest;

import com.uzproc.backend.dto.purchaserequest.PurchaseRequestCommentDto;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestComment;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestCommentType;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestCommentRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PurchaseRequestCommentService {

    private final PurchaseRequestCommentRepository commentRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;

    public PurchaseRequestCommentService(
            PurchaseRequestCommentRepository commentRepository,
            PurchaseRequestRepository purchaseRequestRepository) {
        this.commentRepository = commentRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
    }

    @Transactional(readOnly = true)
    public List<PurchaseRequestCommentDto> getCommentsByPurchaseRequestIdAndType(Long purchaseRequestId, PurchaseRequestCommentType type) {
        if (purchaseRequestId == null) {
            return Collections.emptyList();
        }
        List<PurchaseRequestComment> list = type != null
                ? commentRepository.findByPurchaseRequest_IdAndTypeOrderByCreatedAtDesc(purchaseRequestId, type)
                : commentRepository.findByPurchaseRequest_IdOrderByCreatedAtDesc(purchaseRequestId);
        return list.stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Map<Long, Long> getSlaCommentCountByPurchaseRequestIds(List<Long> purchaseRequestIds) {
        if (purchaseRequestIds == null || purchaseRequestIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Object[]> rows = commentRepository.countByPurchaseRequestIdInAndType(
                purchaseRequestIds, PurchaseRequestCommentType.SLA_COMMENT);
        return rows.stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> ((Number) row[1]).longValue(),
                        (a, b) -> a));
    }

    @Transactional
    public PurchaseRequestCommentDto createComment(Long purchaseRequestId, PurchaseRequestCommentType type, String text) {
        if (purchaseRequestId == null || type == null || text == null || text.trim().isEmpty()) {
            return null;
        }
        PurchaseRequest request = purchaseRequestRepository.findById(purchaseRequestId).orElse(null);
        if (request == null) {
            return null;
        }
        PurchaseRequestComment comment = new PurchaseRequestComment();
        comment.setPurchaseRequest(request);
        comment.setType(type);
        comment.setText(text.trim());
        comment = commentRepository.save(comment);
        return toDto(comment);
    }

    private PurchaseRequestCommentDto toDto(PurchaseRequestComment c) {
        PurchaseRequestCommentDto dto = new PurchaseRequestCommentDto();
        dto.setId(c.getId());
        dto.setPurchaseRequestId(c.getPurchaseRequest() != null ? c.getPurchaseRequest().getId() : null);
        dto.setType(c.getType());
        dto.setText(c.getText());
        dto.setCreatedAt(c.getCreatedAt());
        return dto;
    }
}
