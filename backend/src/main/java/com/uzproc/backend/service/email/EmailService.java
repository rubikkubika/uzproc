package com.uzproc.backend.service.email;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
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
        sendEmailWithCc(to, null, subject, text);
    }

    /**
     * Отправка письма с указанием получателей и копии.
     *
     * @param to      адрес получателя (обязателен)
     * @param cc      адреса в копии (может быть null или пустой)
     * @param subject тема письма
     * @param text    тело письма (HTML)
     */
    public void sendEmailWithCc(String to, String[] cc, String subject, String text) {
        try {
            logger.debug("Attempting to send email to: {}, cc: {}, from: {}", to, cc != null ? String.join(", ", cc) : "none", fromEmail);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "Система управления закупками uzProc");
            helper.setTo(to);
            if (cc != null && cc.length > 0) {
                helper.setCc(cc);
            }
            helper.setSubject(subject);
            helper.setText(text, true); // true для HTML
            // Вложение логотипа по CID (PNG) — Gmail и др. не показывают SVG в письмах, PNG везде отображается
            helper.addInline(LOGO_CID, new ClassPathResource("email/logo.png"));

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

    /** Content-ID логотипа для вложения (cid:logo) — так логотип виден в веб-почте (Gmail, Outlook.com и др.) */
    private static final String LOGO_CID = "logo";

    /** Обёртка письма с ссылкой на логотип по CID (вложение), чтобы логотип отображался в веб-клиентах */
    private static final String EMAIL_HEADER_HTML = """
        <html>
        <head>
            <meta charset="UTF-8">
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px;">
                <div style="margin-bottom: 20px;">
                    <img src="cid:logo" alt="UzProc Logo" style="width: 24px; height: 24px; display: inline-block; vertical-align: middle; margin-right: 8px;" />
                    <span style="font-size: 18px; font-weight: bold; color: #000000; vertical-align: middle;">uzProc</span>
                </div>
                <div style="margin-top: 20px;">
        """;
    private static final String EMAIL_FOOTER_HTML = """
                </div>
                <div style="margin-top: 24px; padding-top: 12px; border-top: 1px solid #eeeeee; font-size: 11px; color: #888888;">
                    По всем техническим вопросам <a href="mailto:a.retsko@uzum.com" style="color: #666666;">a.retsko@uzum.com</a>
                </div>
            </div>
        </body>
        </html>
        """;

    /**
     * Оборачивает контент письма в стандартный шаблон (логотип, стили) как у тестового письма.
     */
    public String wrapWithStandardTemplate(String contentHtml) {
        return EMAIL_HEADER_HTML + (contentHtml != null ? contentHtml : "") + EMAIL_FOOTER_HTML;
    }

    public void sendTestEmail(String to) {
        String subject = "[uzProc] Тестовое сообщение от UzProc";
        String content = """
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
            """.formatted(java.time.LocalDateTime.now().format(java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss")));
        sendEmail(to, subject, wrapWithStandardTemplate(content));
    }
}

