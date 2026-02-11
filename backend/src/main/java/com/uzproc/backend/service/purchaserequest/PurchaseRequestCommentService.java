package com.uzproc.backend.service.purchaserequest;

import com.uzproc.backend.dto.purchaserequest.PurchaseRequestCommentDto;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestComment;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestCommentType;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestCommentRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
import com.uzproc.backend.repository.user.UserRepository;
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
    private final UserRepository userRepository;

    public PurchaseRequestCommentService(
            PurchaseRequestCommentRepository commentRepository,
            PurchaseRequestRepository purchaseRequestRepository,
            UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.userRepository = userRepository;
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

    /**
     * Возвращает комментарии заявки по бизнес-идентификатору (id_purchase_request).
     * Используется из плана закупок, где хранится id_purchase_request, а не JPA id.
     */
    @Transactional(readOnly = true)
    public List<PurchaseRequestCommentDto> getCommentsByIdPurchaseRequest(Long idPurchaseRequest, PurchaseRequestCommentType type) {
        if (idPurchaseRequest == null) {
            return Collections.emptyList();
        }
        PurchaseRequest request = purchaseRequestRepository.findByIdPurchaseRequest(idPurchaseRequest).orElse(null);
        if (request == null) {
            return Collections.emptyList();
        }
        return getCommentsByPurchaseRequestIdAndType(request.getId(), type);
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

    @Transactional(readOnly = true)
    public Map<Long, Long> getCommentCountByPurchaseRequestIds(List<Long> purchaseRequestIds) {
        if (purchaseRequestIds == null || purchaseRequestIds.isEmpty()) {
            return Collections.emptyMap();
        }
        List<Object[]> rows = commentRepository.countByPurchaseRequestIdIn(purchaseRequestIds);
        return rows.stream()
                .collect(Collectors.toMap(
                        row -> (Long) row[0],
                        row -> ((Number) row[1]).longValue(),
                        (a, b) -> a));
    }

    @Transactional
    public PurchaseRequestCommentDto createComment(Long purchaseRequestId, PurchaseRequestCommentType type, String text, Long createdByUserId) {
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
        if (createdByUserId != null) {
            userRepository.findById(createdByUserId).ifPresent(comment::setCreatedBy);
        }
        comment = commentRepository.save(comment);
        return toDto(comment);
    }

    private String userDisplayName(User u) {
        if (u == null) return null;
        String surname = u.getSurname();
        String name = u.getName();
        if (surname != null && !surname.isBlank() || name != null && !name.isBlank()) {
            return (surname != null ? surname.trim() : "").trim() + " " + (name != null ? name.trim() : "").trim();
        }
        return u.getUsername();
    }

    private PurchaseRequestCommentDto toDto(PurchaseRequestComment c) {
        PurchaseRequestCommentDto dto = new PurchaseRequestCommentDto();
        dto.setId(c.getId());
        dto.setPurchaseRequestId(c.getPurchaseRequest() != null ? c.getPurchaseRequest().getId() : null);
        dto.setType(c.getType());
        dto.setText(c.getText());
        dto.setCreatedByUserName(userDisplayName(c.getCreatedBy()));
        dto.setCreatedAt(c.getCreatedAt());
        return dto;
    }
}
