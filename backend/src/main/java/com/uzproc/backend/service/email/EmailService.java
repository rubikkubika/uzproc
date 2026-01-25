package com.uzproc.backend.service.email;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
        // Логируем настройки почты для диагностики (без пароля)
        logger.info("EmailService initialized. From email: {}", fromEmail);
        String mailHost = System.getenv("MAIL_HOST");
        String mailPasswordSet = System.getenv("MAIL_PASSWORD") != null && !System.getenv("MAIL_PASSWORD").isEmpty() ? "SET" : "NOT SET";
        logger.info("Mail configuration - Host: {}, Password: {}", mailHost != null ? mailHost : "default", mailPasswordSet);
    }

    public void sendEmail(String to, String subject, String text) {
        try {
            logger.debug("Attempting to send email to: {}, from: {}", to, fromEmail);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "uzProc");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, true); // true для HTML

            mailSender.send(message);
            logger.info("Email sent successfully to: {}", to);
        } catch (jakarta.mail.MessagingException e) {
            logger.error("Error sending email to: {}", to, e);
            String errorMessage = "Mail server connection failed. Failed messages: " + e.getMessage();
            if (e.getCause() != null) {
                errorMessage += " Cause: " + e.getCause().getMessage();
            }
            throw new RuntimeException(errorMessage, e);
        } catch (Exception e) {
            logger.error("Unexpected error sending email to: {}", to, e);
            throw new RuntimeException("Failed to send email: " + e.getMessage(), e);
        }
    }

    public void sendTestEmail(String to) {
        String subject = "Тестовое сообщение от UzProc";
        String text = """
            <html>
            <head>
                <meta charset="UTF-8">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
                    <!-- Логотип слева вверху -->
                    <div style="margin-bottom: 20px;">
                        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDEiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MSA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTQwLjUgMTkuOTUzM0M0MC41MDg1IDIzLjkwNzkgMzkuMzQxNyAyNy43ODUzIDM3LjE1MzggMzEuMDc5NEMzNC45NjYgMzQuMzczNSAzMS44NDI5IDM2Ljk0NyAyOC4xODc5IDM4LjQ2NTRDMjQuNTMzIDM5Ljk4MzcgMjAuNTA5IDQwLjM4NjkgMTYuNjMxIDM5LjYyMzVDMTIuNzQ0MyAzOC44NiA5LjE3NTEzIDM2Ljk1NTYgNi4zNzgxMiAzNC4xNTkxQzMuNTcyNTIgMzEuMzYyNSAxLjY2NzgxIDI3LjgwMjUgMC44ODcwNDkgMjMuOTE2NUMwLjExNDg2OCAyMC4wMzkxIDAuNTAwOTU5IDE2LjAxNTkgMi4wMTk1OCAxMi4zNTI5QzMuNTI5NjMgOC42OTg1NCA2LjA5NDk4IDUuNTY3NDUgOS4zODk2MiAzLjM3MTM5QzEyLjY2NzEgMS4xNzUzNCAxNi41MzY2IDAuMDAwMTA1NDkgMjAuNDkxOSAwLjAwMDEwNTQ5QzIzLjExNzMgLTAuMDA4NDcyODUgMjUuNzE3IDAuNTA2MjI4IDI4LjEzNjUgMS41MDk4OUMyOC41NjQ2IDIuNTEzNTYgMzIuNzY5NiAzLjk4MDQ2IDM0LjYyMjggNS44MzMzOEMzNi40ODQ2IDcuNjg2MyAzNy45NTE4IDkuODkwOTMgMzguOTY0MiAxMi4zMUMzOS45NzY2IDE0LjcyOTEgNDAuNDkxNCAxNy4zMjg0IDQwLjUgMTkuOTUzM1pNMjIuNzkxMyA2LjkzMTRDMjIuMDQ0OCA2Ljg2Mjc4IDIxLjI3MjYgNi44Mjg0NiAyMC40OTE5IDYuODI4NDZDMTkuNzExMSA2LjgyODQ2IDE4Ljk1NjEgNi44NTQyIDE4LjIwOTcgNi45MzE0VjE3LjU2ODVIMjIuNzk5OEwyMi43OTEzIDYuOTMxNFpNMzMuMzcwMSAxMy4xMjVDMzEuNjk3MSAxMi41NzYgMjkuOTg5NyAxMi4xNDcgMjguMjU2NiAxMS44MzgyVjIwLjc2ODNDMjguMjU2NiAyNy4yMDIgMjUuNTE5NiAzMC41ODE5IDIwLjQ5MTkgMzAuNTgxOUMxNS40NjQxIDMwLjU4MTkgMTIuNzI3MiAyNy4yMDIgMTIuNzI3MiAyMC43NjgzVjExLjg0NjhDMTAuOTk0IDEyLjE1NTYgOS4yODY2NyAxMi41ODQ1IDcuNjEzNjEgMTMuMTMzNVYyMC44MjgzQzcuNzI1MTQgMjQuMTY1MyA5LjEzMjIzIDI3LjMzOTMgMTEuNTM0NiAyOS42NjRDMTMuOTM2OSAzMS45ODg3IDE3LjE0NTggMzMuMjg0MSAyMC40OTE5IDMzLjI4NDFDMjMuODM4IDMzLjI4NDEgMjcuMDQ2OCAzMS45ODg3IDI5LjQ0OTIgMjkuNjY0QzMxLjg1MTUgMjcuMzM5MyAzMy4yNTg2IDI0LjE3MzkgMzMuMzcwMSAyMC44MjgzVjEzLjEyNVoiIGZpbGw9IiM3MDAwRkYiLz4KPC9zdmc+" 
                             alt="UzProc Logo" 
                             style="width: 24px; height: 24px; display: inline-block; vertical-align: middle; margin-right: 8px;" />
                        <span style="font-size: 18px; font-weight: bold; color: #000000; vertical-align: middle;">uzProc</span>
                    </div>
                    
                    <!-- Содержимое письма -->
                    <div style="margin-top: 20px;">
                        <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 15px;">
                            Здравствуйте!
                        </p>
                        <h2 style="color: #333333; font-size: 20px; margin-bottom: 15px;">Тестовое сообщение</h2>
                        <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
                            Это тестовое сообщение от системы UzProc.
                        </p>
                        <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 10px;">
                            Если вы получили это письмо, значит настройки почты работают корректно.
                        </p>
                        <p style="color: #666666; font-size: 14px; line-height: 1.6;">
                            Дата отправки: <strong style="color: #333333;">%s</strong>
                        </p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")));
        
        sendEmail(to, subject, text);
    }
}

