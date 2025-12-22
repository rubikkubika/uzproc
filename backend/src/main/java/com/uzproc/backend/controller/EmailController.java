package com.uzproc.backend.controller;

import com.uzproc.backend.service.EmailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/email")
public class EmailController {

    private static final Logger logger = LoggerFactory.getLogger(EmailController.class);
    private final EmailService emailService;

    public EmailController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/test")
    public ResponseEntity<?> sendTestEmail(@RequestBody TestEmailRequest request) {
        try {
            if (request.email == null || request.email.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Email адрес не указан"));
            }

            // Простая валидация email
            if (!request.email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Некорректный формат email адреса"));
            }

            emailService.sendTestEmail(request.email);
            return ResponseEntity.ok(new SuccessResponse("Тестовое сообщение успешно отправлено на " + request.email));
        } catch (Exception e) {
            logger.error("Error sending test email", e);
            return ResponseEntity.status(500)
                .body(new ErrorResponse("Ошибка при отправке письма: " + e.getMessage()));
        }
    }

    public static class TestEmailRequest {
        public String email;
    }

    public static class SuccessResponse {
        public String message;

        public SuccessResponse(String message) {
            this.message = message;
        }
    }

    public static class ErrorResponse {
        public String error;

        public ErrorResponse(String error) {
            this.error = error;
        }
    }
}

