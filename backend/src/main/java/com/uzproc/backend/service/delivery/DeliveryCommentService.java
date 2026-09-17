package com.uzproc.backend.service.delivery;

import com.uzproc.backend.dto.delivery.DeliveryCommentDto;
import com.uzproc.backend.entity.delivery.Delivery;
import com.uzproc.backend.entity.delivery.DeliveryComment;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.entity.user.UserRole;
import com.uzproc.backend.repository.delivery.DeliveryCommentRepository;
import com.uzproc.backend.repository.delivery.DeliveryRepository;
import com.uzproc.backend.service.user.CurrentUserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Комментарии к поставке: список, добавление и редактирование прямо из таблицы поставок.
 * Редактировать можно свой комментарий; администратор — любой; комментарий из отчёта (без автора) — любой пользователь.
 */
@Service
public class DeliveryCommentService {

    private final DeliveryCommentRepository commentRepository;
    private final DeliveryRepository deliveryRepository;
    private final CurrentUserService currentUserService;

    public DeliveryCommentService(DeliveryCommentRepository commentRepository,
                                  DeliveryRepository deliveryRepository,
                                  CurrentUserService currentUserService) {
        this.commentRepository = commentRepository;
        this.deliveryRepository = deliveryRepository;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<DeliveryCommentDto> getComments(Long deliveryId) {
        User current = currentUserService.getCurrentUser().orElse(null);
        return commentRepository.findByDelivery_IdOrderByCreatedAtAscIdAsc(deliveryId).stream()
                .map(c -> toDto(c, current))
                .toList();
    }

    @Transactional
    public DeliveryCommentDto createComment(Long deliveryId, String text) {
        String normalized = requireText(text);
        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new IllegalArgumentException("Поставка не найдена: id=" + deliveryId));
        Optional<User> current = currentUserService.getCurrentUser();
        DeliveryComment comment = new DeliveryComment();
        comment.setDelivery(delivery);
        comment.setText(normalized);
        current.ifPresent(comment::setCreatedBy);
        return toDto(commentRepository.save(comment), current.orElse(null));
    }

    @Transactional
    public DeliveryCommentDto updateComment(Long commentId, String text) {
        String normalized = requireText(text);
        DeliveryComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new IllegalArgumentException("Комментарий не найден: id=" + commentId));
        User current = currentUserService.getCurrentUser().orElse(null);
        if (!canEdit(comment, current)) {
            throw new IllegalStateException("Редактировать можно только свой комментарий");
        }
        comment.setText(normalized);
        return toDto(commentRepository.saveAndFlush(comment), current);
    }

    /** Комментарий из ручного отчёта: добавляется без автора, повторная загрузка того же текста дубль не создаёт. */
    @Transactional
    public void addReportComment(Delivery delivery, String text) {
        if (delivery == null || delivery.getId() == null || text == null || text.isBlank()) return;
        String normalized = text.trim();
        if (commentRepository.existsByDelivery_IdAndText(delivery.getId(), normalized)) return;
        DeliveryComment comment = new DeliveryComment();
        comment.setDelivery(delivery);
        comment.setText(normalized);
        commentRepository.save(comment);
    }

    private static String requireText(String text) {
        if (text == null || text.isBlank()) {
            throw new IllegalArgumentException("Текст комментария не может быть пустым");
        }
        return text.trim();
    }

    private static boolean canEdit(DeliveryComment comment, User current) {
        if (current == null) return false;
        if (comment.getCreatedBy() == null || current.getRole() == UserRole.ADMIN) return true;
        return Objects.equals(comment.getCreatedBy().getId(), current.getId());
    }

    private static DeliveryCommentDto toDto(DeliveryComment c, User current) {
        DeliveryCommentDto dto = new DeliveryCommentDto();
        dto.setId(c.getId());
        dto.setDeliveryId(c.getDelivery() != null ? c.getDelivery().getId() : null);
        dto.setText(c.getText());
        dto.setCreatedByUserName(CurrentUserService.displayName(c.getCreatedBy()));
        dto.setCreatedAt(c.getCreatedAt());
        dto.setUpdatedAt(c.getUpdatedAt());
        dto.setEditable(canEdit(c, current));
        return dto;
    }
}
