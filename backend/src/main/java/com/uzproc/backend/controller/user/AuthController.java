package com.uzproc.backend.controller.user;

import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.entity.user.UserRole;
import com.uzproc.backend.security.JwtService;
import com.uzproc.backend.security.LoginRateLimiter;
import com.uzproc.backend.service.user.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Component
@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    private final UserService userService;
    private final JwtService jwtService;
    private final LoginRateLimiter loginRateLimiter;

    public AuthController(UserService userService, JwtService jwtService, LoginRateLimiter loginRateLimiter) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.loginRateLimiter = loginRateLimiter;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials,
                                                     HttpServletRequest request) {
        try {
            String email = credentials.get("email");
            String password = credentials.get("password");

            if (email == null || password == null || email.trim().isEmpty() || password.trim().isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Email и пароль обязательны");
                return ResponseEntity.badRequest().body(error);
            }

            String normalizedEmail = email.trim();
            String normalizedPassword = password.trim();

            // Rate limiting: ключ по email + IP (T4 fix, CWE-307)
            String rateLimitKey = normalizedEmail.toLowerCase() + "|" + clientIp(request);
            long retryAfter = loginRateLimiter.retryAfterSeconds(rateLimitKey);
            if (retryAfter > 0) {
                logger.warn("Login rate-limited for email: {} (retry after {}s)", normalizedEmail, retryAfter);
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Слишком много попыток входа. Повторите позже.");
                return ResponseEntity.status(429)
                        .header("Retry-After", String.valueOf(retryAfter))
                        .body(error);
            }

            logger.info("Login attempt for email: {}", normalizedEmail);

            User user = userService.findByEmail(normalizedEmail);

            int authStatus = userService.authenticateWithStatus(normalizedEmail, normalizedPassword);

            if (user == null || authStatus == 0) {
                loginRateLimiter.recordFailure(rateLimitKey);
                logger.warn("Login failed for email: {}", normalizedEmail);
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Неверный email или пароль");
                return ResponseEntity.status(401).body(error);
            }

            loginRateLimiter.reset(rateLimitKey);
            logger.info("Login successful for email: {}, passwordChangeRequired: {}", normalizedEmail, authStatus == 2);

            UserRole userRole = user.getRole();
            if (userRole == null) {
                userRole = UserRole.USER;
            }

            // Генерируем JWT-токен (с флагами ролей и ФИО — для ролевого доступа на фронте)
            String token = jwtService.generateToken(
                    user.getEmail(), userRole.getCode(), user.getId(),
                    Boolean.TRUE.equals(user.getIsPurchaser()),
                    Boolean.TRUE.equals(user.getIsContractor()),
                    user.getName(), user.getSurname());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("token", token);
            response.put("email", user.getEmail());
            response.put("username", user.getUsername());
            response.put("role", userRole.getCode());
            response.put("passwordChangeRequired", authStatus == 2);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            logger.error("Error during login", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Внутренняя ошибка сервера");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Смена пароля. Требует валидного JWT (эндпоинт защищён в SecurityConfig).
     * Пользователь меняет ТОЛЬКО свой пароль — email берётся из подписанного токена,
     * а не из тела запроса. Дополнительно проверяется текущий (в т.ч. временный) пароль.
     * Закрывает CWE-620/CWE-306: захват чужого аккаунта без аутентификации (T1 fix).
     */
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(@RequestBody Map<String, String> body,
                                                              Authentication authentication) {
        try {
            // Аутентификация обязательна: email определяется по токену, не по телу запроса
            if (authentication == null || authentication.getName() == null
                    || authentication.getName().isBlank()) {
                return ResponseEntity.status(401).body(Map.of("error", "Требуется аутентификация"));
            }
            String email = authentication.getName();

            String currentPassword = body.get("currentPassword");
            String newPassword = body.get("newPassword");

            if (newPassword == null || newPassword.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Новый пароль обязателен"));
            }
            if (currentPassword == null || currentPassword.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Текущий пароль обязателен"));
            }

            // Проверяем текущий пароль (временный или постоянный) — защита от смены по украденному токену
            if (!userService.authenticate(email, currentPassword.trim())) {
                logger.warn("Change-password rejected: wrong current password for {}", email);
                return ResponseEntity.status(403).body(Map.of("error", "Текущий пароль неверен"));
            }

            userService.changePassword(email, newPassword.trim());
            logger.info("Password changed via /auth/change-password for: {}", email);
            return ResponseEntity.ok(Map.of("success", true));

        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error during change-password", e);
            return ResponseEntity.status(500).body(Map.of("error", "Внутренняя ошибка сервера"));
        }
    }

    /** Определяет IP клиента с учётом обратного прокси (nginx) через X-Forwarded-For. */
    private String clientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // Первый адрес в цепочке — исходный клиент
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
