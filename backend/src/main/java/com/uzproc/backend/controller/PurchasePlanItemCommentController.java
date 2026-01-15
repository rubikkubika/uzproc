package com.uzproc.backend.controller;

import com.uzproc.backend.dto.PurchasePlanItemCommentDto;
import com.uzproc.backend.service.PurchasePlanItemCommentService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/purchase-plan-items/{itemId}/comments")
public class PurchasePlanItemCommentController {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanItemCommentController.class);

    private final PurchasePlanItemCommentService commentService;

    public PurchasePlanItemCommentController(PurchasePlanItemCommentService commentService) {
        this.commentService = commentService;
    }

    /**
     * Получить все комментарии для элемента плана закупок
     * @param itemId ID элемента плана закупок
     * @param includePrivate включать ли приватные комментарии (для внутренних пользователей)
     * @return список комментариев
     */
    @GetMapping
    public ResponseEntity<List<PurchasePlanItemCommentDto>> getComments(
            @PathVariable Long itemId,
            @RequestParam(required = false, defaultValue = "false") Boolean includePrivate) {
        List<PurchasePlanItemCommentDto> comments = commentService.findByPurchasePlanItemId(itemId, includePrivate);
        return ResponseEntity.ok(comments);
    }

    /**
     * Получить комментарии с пагинацией
     */
    @GetMapping("/paginated")
    public ResponseEntity<Page<PurchasePlanItemCommentDto>> getCommentsPaginated(
            @PathVariable Long itemId,
            @RequestParam(required = false, defaultValue = "false") Boolean includePrivate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<PurchasePlanItemCommentDto> comments = commentService.findByPurchasePlanItemId(itemId, includePrivate, page, size);
        return ResponseEntity.ok(comments);
    }

    /**
     * Создать новый комментарий
     * @param itemId ID элемента плана закупок
     * @param requestBody тело запроса с полями: text, isPublic, authorEmail
     * @return созданный комментарий
     */
    @PostMapping
    public ResponseEntity<?> createComment(
            @PathVariable Long itemId,
            @RequestBody Map<String, Object> requestBody) {
        try {
            String text = (String) requestBody.get("text");
            if (text == null || text.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Текст комментария обязателен");
            }

            Boolean isPublic = false;
            Object isPublicObj = requestBody.get("isPublic");
            if (isPublicObj != null) {
                if (isPublicObj instanceof Boolean) {
                    isPublic = (Boolean) isPublicObj;
                } else if (isPublicObj instanceof String) {
                    isPublic = Boolean.parseBoolean((String) isPublicObj);
                }
            }

            String authorEmail = null;
            Object authorEmailObj = requestBody.get("authorEmail");
            if (authorEmailObj != null) {
                authorEmail = authorEmailObj.toString();
            }

            PurchasePlanItemCommentDto comment = commentService.createComment(itemId, text, isPublic, authorEmail);
            return ResponseEntity.status(201).body(comment);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Error creating comment", e);
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    /**
     * Удалить комментарий
     */
    @DeleteMapping("/{commentId}")
    public ResponseEntity<?> deleteComment(@PathVariable Long itemId, @PathVariable Long commentId) {
        try {
            commentService.deleteComment(commentId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error deleting comment", e);
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }
}
