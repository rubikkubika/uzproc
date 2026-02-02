package com.uzproc.backend.controller.email;

import com.uzproc.backend.service.email.EmailService;
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

    /**
     * Отправка письма об обратной связи по заявке (получатель, копия, тема, тело).
     * Использует тот же почтовый сервер, что и тестовое письмо.
     */
    @PostMapping("/send-feedback")
    public ResponseEntity<?> sendFeedbackEmail(@RequestBody SendFeedbackRequest request) {
        try {
            if (request.to == null || request.to.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Email получателя не указан"));
            }
            if (!request.to.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Некорректный формат email получателя"));
            }
            if (request.subject == null || request.subject.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new ErrorResponse("Тема письма не указана"));
            }

            String[] cc = null;
            if (request.cc != null && !request.cc.isEmpty()) {
                cc = request.cc.stream()
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .filter(s -> s.matches("^[A-Za-z0-9+_.-]+@(.+)$"))
                    .toArray(String[]::new);
            }

            String contentHtml = request.body != null && !request.body.trim().isEmpty()
                ? "<p style=\"color: #666666; font-size: 14px; line-height: 1.6; white-space: pre-wrap;\">"
                    + request.body.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\n", "<br/>")
                    + "</p>"
                : "<p style=\"color: #666666; font-size: 14px; line-height: 1.6;\">Нет текста.</p>";
            String htmlBody = emailService.wrapWithStandardTemplate(contentHtml);

            String subject = request.subject.trim();
            if (!subject.startsWith("[uzProc]")) {
                subject = "[uzProc] " + subject;
            }
            emailService.sendEmailWithCc(request.to.trim(), cc, subject, htmlBody);
            return ResponseEntity.ok(new SuccessResponse("Письмо успешно отправлено на " + request.to));
        } catch (Exception e) {
            logger.error("Error sending feedback email", e);
            return ResponseEntity.status(500)
                .body(new ErrorResponse("Ошибка при отправке письма: " + e.getMessage()));
        }
    }

    public static class TestEmailRequest {
        public String email;
    }

    public static class SendFeedbackRequest {
        public String to;
        public java.util.List<String> cc;
        public String subject;
        public String body;
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








