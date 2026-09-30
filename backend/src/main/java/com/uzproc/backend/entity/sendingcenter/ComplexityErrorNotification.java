package com.uzproc.backend.entity.sendingcenter;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Отправленное уведомление «Ошибка сложности» (Центр отправки → Закупки):
 * письмо закупщику со списком заявок года без сложности.
 */
@Entity
@Table(name = "complexity_error_notifications")
public class ComplexityErrorNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Год заявок (по дате создания заявки). */
    @Column(name = "year", nullable = false)
    private Integer year;

    /** Нормализованное ФИО закупщика — ключ группировки. */
    @Column(name = "purchaser_key", nullable = false, length = 255)
    private String purchaserKey;

    @Column(name = "purchaser_name", length = 512)
    private String purchaserName;

    @Column(name = "recipient_email", nullable = false, length = 255)
    private String recipientEmail;

    /** Адреса в копии через запятую. */
    @Column(name = "cc_emails", length = 1000)
    private String ccEmails;

    /** ID заявок (purchase_requests.id) из письма через запятую — по ним считается «+N новых» (V164). */
    @Column(name = "request_ids", columnDefinition = "TEXT")
    private String requestIds;

    /** ID связанных закупок (purchases.id) из письма через запятую, если есть. */
    @Column(name = "purchase_ids", columnDefinition = "TEXT")
    private String purchaseIds;

    /** Количество заявок в письме (имя колонки историческое). */
    @Column(name = "purchase_count", nullable = false)
    private Integer purchaseCount;

    @Column(name = "sent_by_user_id")
    private Long sentByUserId;

    @Column(name = "sent_by_name", length = 512)
    private String sentByName;

    @CreationTimestamp
    @Column(name = "sent_at", nullable = false, updatable = false)
    private LocalDateTime sentAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getYear() { return year; }
    public void setYear(Integer year) { this.year = year; }

    public String getPurchaserKey() { return purchaserKey; }
    public void setPurchaserKey(String purchaserKey) { this.purchaserKey = purchaserKey; }

    public String getPurchaserName() { return purchaserName; }
    public void setPurchaserName(String purchaserName) { this.purchaserName = purchaserName; }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public String getCcEmails() { return ccEmails; }
    public void setCcEmails(String ccEmails) { this.ccEmails = ccEmails; }

    public String getRequestIds() { return requestIds; }
    public void setRequestIds(String requestIds) { this.requestIds = requestIds; }

    public String getPurchaseIds() { return purchaseIds; }
    public void setPurchaseIds(String purchaseIds) { this.purchaseIds = purchaseIds; }

    public Integer getPurchaseCount() { return purchaseCount; }
    public void setPurchaseCount(Integer purchaseCount) { this.purchaseCount = purchaseCount; }

    public Long getSentByUserId() { return sentByUserId; }
    public void setSentByUserId(Long sentByUserId) { this.sentByUserId = sentByUserId; }

    public String getSentByName() { return sentByName; }
    public void setSentByName(String sentByName) { this.sentByName = sentByName; }

    public LocalDateTime getSentAt() { return sentAt; }
    public void setSentAt(LocalDateTime sentAt) { this.sentAt = sentAt; }
}
