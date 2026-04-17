package com.uzproc.backend.controller.user;

import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.entity.user.UserRole;
import com.uzproc.backend.security.JwtService;
import com.uzproc.backend.service.user.UserService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
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

    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
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

            logger.info("Login attempt for email: {}", normalizedEmail);

            User user = userService.findByEmail(normalizedEmail);

            int authStatus = userService.authenticateWithStatus(normalizedEmail, normalizedPassword);

            if (user == null || authStatus == 0) {
                logger.warn("Login failed for email: {}", normalizedEmail);
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Неверный email или пароль");
                return ResponseEntity.status(401).body(error);
            }

            logger.info("Login successful for email: {}, passwordChangeRequired: {}", normalizedEmail, authStatus == 2);

            UserRole userRole = user.getRole();
            if (userRole == null) {
                userRole = UserRole.USER;
            }

            // Генерируем JWT-токен
            String token = jwtService.generateToken(user.getEmail(), userRole.getCode(), user.getId());

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

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, Object>> changePassword(@RequestBody Map<String, String> body) {
        try {
            String email = body.get("email");
            String newPassword = body.get("newPassword");

            if (email == null || email.trim().isEmpty() || newPassword == null || newPassword.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Email и новый пароль обязательны"));
            }

            userService.changePassword(email.trim(), newPassword.trim());
            logger.info("Password changed via /auth/change-password for: {}", email.trim());
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
}
