package com.uzproc.backend.controller;

import com.uzproc.backend.entity.User;
import com.uzproc.backend.entity.UserRole;
import com.uzproc.backend.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Component
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final UserService userService;

    public AuthController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        if (email == null || password == null || email.trim().isEmpty() || password.trim().isEmpty()) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Email и пароль обязательны");
            return ResponseEntity.badRequest().body(error);
        }

        String normalizedEmail = email.trim();
        String normalizedPassword = password.trim();

        // Альтернативный вход через admin/2025
        if ("admin".equalsIgnoreCase(normalizedEmail) && "2025".equals(normalizedPassword)) {
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
            // Используем общее сообщение для безопасности (не раскрываем, существует ли пользователь)
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Неверный email или пароль");
            return ResponseEntity.status(401).body(error);
        }
        
        // Пользователь найден и пароль верный
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
    }
}

