package com.uzproc.backend.service.purchaseplan;

import com.uzproc.backend.dto.PurchasePlanItemCommentDto;
import com.uzproc.backend.entity.PurchasePlanItemComment;
import com.uzproc.backend.entity.User;
import com.uzproc.backend.repository.PurchasePlanItemCommentRepository;
import com.uzproc.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PurchasePlanItemCommentService {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanItemCommentService.class);

    private final PurchasePlanItemCommentRepository commentRepository;
    private final UserRepository userRepository;

    public PurchasePlanItemCommentService(
            PurchasePlanItemCommentRepository commentRepository,
            UserRepository userRepository) {
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
    }

    /**
     * Получить все комментарии для элемента плана закупок
     * @param purchasePlanItemId ID элемента плана закупок
     * @param includePrivate включать ли приватные комментарии (для внутренних пользователей)
     * @return список комментариев
     */
    public List<PurchasePlanItemCommentDto> findByPurchasePlanItemId(Long purchasePlanItemId, Boolean includePrivate) {
        List<PurchasePlanItemComment> comments;
        if (includePrivate != null && includePrivate) {
            comments = commentRepository.findByPurchasePlanItemIdOrderByCreatedAtDesc(purchasePlanItemId);
        } else {
            comments = commentRepository.findByPurchasePlanItemIdWithVisibility(purchasePlanItemId, false);
        }
        return comments.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Получить комментарии с пагинацией
     */
    public Page<PurchasePlanItemCommentDto> findByPurchasePlanItemId(
            Long purchasePlanItemId, 
            Boolean includePrivate,
            int page, 
            int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<PurchasePlanItemComment> comments;
        if (includePrivate != null && includePrivate) {
            comments = commentRepository.findByPurchasePlanItemIdOrderByCreatedAtDesc(purchasePlanItemId, pageable);
        } else {
            comments = commentRepository.findByPurchasePlanItemIdWithVisibility(purchasePlanItemId, false, pageable);
        }
        return comments.map(this::toDto);
    }

    /**
     * Создать новый комментарий
     */
    @Transactional
    public PurchasePlanItemCommentDto createComment(
            Long purchasePlanItemId, 
            String text, 
            Boolean isPublic,
            String authorEmail) {
        if (text == null || text.trim().isEmpty()) {
            throw new IllegalArgumentException("Текст комментария не может быть пустым");
        }

        PurchasePlanItemComment comment = new PurchasePlanItemComment();
        comment.setPurchasePlanItemId(purchasePlanItemId);
        comment.setText(text.trim());
        comment.setIsPublic(isPublic != null ? isPublic : false);

        // Если указан email автора, пытаемся найти пользователя
        if (authorEmail != null && !authorEmail.trim().isEmpty()) {
            userRepository.findByEmail(authorEmail.trim()).ifPresent(author -> {
                comment.setAuthor(author);
                // Формируем имя автора
                String authorName = buildAuthorName(author);
                comment.setAuthorName(authorName);
            });
            // Если пользователь не найден, используем email как имя
            if (comment.getAuthor() == null) {
                comment.setAuthorName(authorEmail.trim());
            }
        }

        PurchasePlanItemComment saved = commentRepository.save(comment);
        logger.info("Created comment {} for purchase plan item {}", saved.getId(), purchasePlanItemId);
        return toDto(saved);
    }

    /**
     * Удалить комментарий
     */
    @Transactional
    public void deleteComment(Long commentId) {
        commentRepository.deleteById(commentId);
        logger.info("Deleted comment {}", commentId);
    }

    /**
     * Преобразовать entity в DTO
     */
    private PurchasePlanItemCommentDto toDto(PurchasePlanItemComment comment) {
        PurchasePlanItemCommentDto dto = new PurchasePlanItemCommentDto();
        dto.setId(comment.getId());
        dto.setPurchasePlanItemId(comment.getPurchasePlanItemId());
        dto.setText(comment.getText());
        dto.setIsPublic(comment.getIsPublic());
        if (comment.getAuthor() != null) {
            dto.setAuthorId(comment.getAuthor().getId());
            dto.setAuthorName(comment.getAuthorName() != null ? comment.getAuthorName() : buildAuthorName(comment.getAuthor()));
        } else if (comment.getAuthorName() != null) {
            dto.setAuthorName(comment.getAuthorName());
        }
        dto.setCreatedAt(comment.getCreatedAt());
        dto.setUpdatedAt(comment.getUpdatedAt());
        return dto;
    }

    /**
     * Построить имя автора из данных пользователя
     */
    private String buildAuthorName(User user) {
        if (user == null) {
            return null;
        }
        StringBuilder name = new StringBuilder();
        if (user.getSurname() != null && !user.getSurname().trim().isEmpty()) {
            name.append(user.getSurname().trim());
        }
        if (user.getName() != null && !user.getName().trim().isEmpty()) {
            if (name.length() > 0) {
                name.append(" ");
            }
            name.append(user.getName().trim());
        }
        if (name.length() == 0 && user.getEmail() != null) {
            name.append(user.getEmail());
        }
        return name.length() > 0 ? name.toString() : user.getUsername();
    }
}
