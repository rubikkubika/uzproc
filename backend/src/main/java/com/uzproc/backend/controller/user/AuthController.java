package com.uzproc.backend.controller.user;

import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.entity.user.UserRole;
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

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        try {
            logger.info("Login attempt received");
            
            String email = credentials.get("email");
            String password = credentials.get("password");

            if (email == null || password == null || email.trim().isEmpty() || password.trim().isEmpty()) {
                logger.warn("Login attempt with empty email or password");
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Email и пароль обязательны");
                return ResponseEntity.badRequest().body(error);
            }

            String normalizedEmail = email.trim();
            String normalizedPassword = password.trim();
            
            logger.info("Login attempt for email: {}", normalizedEmail);

            // Альтернативный вход через admin/2025
            if ("admin".equalsIgnoreCase(normalizedEmail) && "2025".equals(normalizedPassword)) {
                logger.info("Admin login successful");
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("email", "admin");
                response.put("username", "admin");
                response.put("role", "admin");
                return ResponseEntity.ok(response);
            }

            // Обычная аутентификация через БД
            User user = userService.findByEmail(normalizedEmail);
            
            // Проверяем существование пользователя и пароль
            if (user == null || !userService.authenticate(normalizedEmail, normalizedPassword)) {
                logger.warn("Login failed for email: {} (user not found or wrong password)", normalizedEmail);
                // Используем общее сообщение для безопасности (не раскрываем, существует ли пользователь)
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Неверный email или пароль");
                return ResponseEntity.status(401).body(error);
            }
            
            // Пользователь найден и пароль верный
            logger.info("Login successful for email: {}", normalizedEmail);
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("email", user.getEmail());
            response.put("username", user.getUsername());
            // Используем роль из базы данных
            UserRole userRole = user.getRole();
            if (userRole == null) {
                // Fallback: определяем роль по email/username, если роль не задана в БД
                userRole = (user.getEmail() != null && user.getEmail().toLowerCase().contains("admin")) ||
                          (user.getUsername() != null && user.getUsername().toLowerCase().contains("admin"))
                          ? UserRole.ADMIN : UserRole.USER;
            }
            response.put("role", userRole.getCode());
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error during login", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Внутренняя ошибка сервера");
            return ResponseEntity.status(500).body(error);
        }
    }
}

