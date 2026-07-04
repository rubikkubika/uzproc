package com.uzproc.backend.controller.tracker;

import com.uzproc.backend.dto.tracker.ProcurementTrackerDto;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.service.tracker.ProcurementFavoriteService;
import com.uzproc.backend.service.user.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Избранные закупки пользователя (страница «Трекер закупок»).
 * Требует аутентификации в production (SecurityConfig — anyRequest().authenticated()).
 * userId определяется по JWT; параметр userId используется как fallback при отключённой auth (локально).
 */
@RestController
@RequestMapping("/procurement-favorites")
public class ProcurementFavoriteController {

    private final ProcurementFavoriteService favoriteService;
    private final UserService userService;

    public ProcurementFavoriteController(ProcurementFavoriteService favoriteService, UserService userService) {
        this.favoriteService = favoriteService;
        this.userService = userService;
    }

    /** Избранные закупки пользователя (полные модели трекера). */
    @GetMapping
    public ResponseEntity<List<ProcurementTrackerDto>> list(Authentication authentication,
                                                            @RequestParam(name = "userId", required = false) Long userIdParam) {
        Long userId = resolveUserId(authentication, userIdParam);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(favoriteService.listFavorites(userId));
    }

    /** Номера заявок в избранном (для отметки «звёздочек» в результатах поиска). */
    @GetMapping("/ids")
    public ResponseEntity<Set<Long>> ids(Authentication authentication,
                                         @RequestParam(name = "userId", required = false) Long userIdParam) {
        Long userId = resolveUserId(authentication, userIdParam);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(favoriteService.favoriteIds(userId));
    }

    /** Добавить закупку в избранное. Тело: {"idPurchaseRequest": 123, "userId": 1 (опц.)}. */
    @PostMapping
    public ResponseEntity<Void> add(Authentication authentication, @RequestBody Map<String, Long> body) {
        Long idPurchaseRequest = body.get("idPurchaseRequest");
        Long userId = resolveUserId(authentication, body.get("userId"));
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        if (idPurchaseRequest == null) {
            return ResponseEntity.badRequest().build();
        }
        favoriteService.addFavorite(userId, idPurchaseRequest);
        return ResponseEntity.ok().build();
    }

    /** Убрать закупку из избранного. */
    @DeleteMapping("/{idPurchaseRequest}")
    public ResponseEntity<Void> remove(Authentication authentication,
                                       @PathVariable Long idPurchaseRequest,
                                       @RequestParam(name = "userId", required = false) Long userIdParam) {
        Long userId = resolveUserId(authentication, userIdParam);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        favoriteService.removeFavorite(userId, idPurchaseRequest);
        return ResponseEntity.ok().build();
    }

    /**
     * userId из подписанного JWT (production) или из параметра запроса (локально, при отключённой auth).
     * Приоритет — за аутентифицированным пользователем, чтобы нельзя было подделать чужой userId.
     */
    private Long resolveUserId(Authentication authentication, Long userIdParam) {
        if (authentication != null && authentication.getName() != null && !authentication.getName().isBlank()) {
            User user = userService.findByEmail(authentication.getName());
            if (user != null) {
                return user.getId();
            }
        }
        return userIdParam;
    }
}
