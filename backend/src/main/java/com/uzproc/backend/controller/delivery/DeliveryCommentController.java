package com.uzproc.backend.controller.delivery;

import com.uzproc.backend.dto.delivery.DeliveryCommentDto;
import com.uzproc.backend.service.delivery.DeliveryCommentService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/** Комментарии к поставке: список, добавление, редактирование. */
@RestController
@RequestMapping("/deliveries")
public class DeliveryCommentController {

    private final DeliveryCommentService commentService;

    public DeliveryCommentController(DeliveryCommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<DeliveryCommentDto>> getComments(@PathVariable Long id) {
        return ResponseEntity.ok(commentService.getComments(id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<DeliveryCommentDto> createComment(@PathVariable Long id,
                                                            @RequestBody Map<String, String> body) {
        String text = body != null ? body.get("text") : null;
        try {
            return ResponseEntity.ok(commentService.createComment(id, text));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/comments/{commentId}")
    public ResponseEntity<DeliveryCommentDto> updateComment(@PathVariable Long commentId,
                                                            @RequestBody Map<String, String> body) {
        String text = body != null ? body.get("text") : null;
        try {
            return ResponseEntity.ok(commentService.updateComment(commentId, text));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
    }
}
