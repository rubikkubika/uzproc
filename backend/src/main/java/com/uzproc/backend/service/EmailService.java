package com.uzproc.backend.service;

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
    }

    public void sendEmail(String to, String subject, String text) {
        try {
            logger.debug("Attempting to send email to: {}, from: {}", to, fromEmail);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
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
            <body>
                <h2>Тестовое сообщение</h2>
                <p>Это тестовое сообщение от системы UzProc.</p>
                <p>Если вы получили это письмо, значит настройки почты работают корректно.</p>
                <p>Дата отправки: <strong>%s</strong></p>
            </body>
            </html>
            """.formatted(java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")));
        
        sendEmail(to, subject, text);
    }
}

