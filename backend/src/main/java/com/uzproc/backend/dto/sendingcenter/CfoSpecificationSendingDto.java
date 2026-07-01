package com.uzproc.backend.dto.sendingcenter;

import java.math.BigDecimal;

/**
 * Строка Центра отправки (вкладка «Спецификации»): агрегат подписанных спецификаций
 * по одному ЦФО за выбранный месяц (по дате синхронизации).
 */
public class CfoSpecificationSendingDto {

    /** Название ЦФО. */
    private String cfoName;

    /** Количество подписанных спецификаций ЦФО за месяц. */
    private long specificationCount;

    /** Суммарная сумма спецификаций (budget_amount). */
    private BigDecimal totalAmount;

    /** ID пользователя-руководителя ЦФО из справочника (null, если не назначен). */
    private Long leaderUserId;

    /** ФИО руководителя ЦФО из справочника. */
    private String leaderFullName;

    /** Email руководителя ЦФО. */
    private String leaderEmail;

    /** Эффективный получатель письма (по умолчанию — руководитель, либо переопределённый). */
    private Long recipientUserId;
    private String recipientFullName;
    private String recipientEmail;

    /** true, если получатель переопределён (выбран НЕ руководитель ЦФО). */
    private boolean recipientOverridden;

    /** Приглашение на оценку за этот месяц уже отправлено. */
    private boolean sent;

    /** Руководитель уже заполнил оценку. */
    private boolean rated;

    /** Токен публичной ссылки на форму оценки (если приглашение создано). */
    private String token;

    /** Кому фактически отправлено письмо (email), если отправлено. */
    private String sentTo;

    /** Когда отправлено (ISO), если отправлено. */
    private String sentAt;

    public CfoSpecificationSendingDto() {
    }

    public CfoSpecificationSendingDto(String cfoName, long specificationCount, BigDecimal totalAmount,
                                      Long leaderUserId, String leaderFullName, String leaderEmail) {
        this.cfoName = cfoName;
        this.specificationCount = specificationCount;
        this.totalAmount = totalAmount;
        this.leaderUserId = leaderUserId;
        this.leaderFullName = leaderFullName;
        this.leaderEmail = leaderEmail;
    }

    public Long getRecipientUserId() {
        return recipientUserId;
    }

    public void setRecipientUserId(Long recipientUserId) {
        this.recipientUserId = recipientUserId;
    }

    public String getRecipientFullName() {
        return recipientFullName;
    }

    public void setRecipientFullName(String recipientFullName) {
        this.recipientFullName = recipientFullName;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    public boolean isRecipientOverridden() {
        return recipientOverridden;
    }

    public void setRecipientOverridden(boolean recipientOverridden) {
        this.recipientOverridden = recipientOverridden;
    }

    public boolean isSent() {
        return sent;
    }

    public void setSent(boolean sent) {
        this.sent = sent;
    }

    public boolean isRated() {
        return rated;
    }

    public void setRated(boolean rated) {
        this.rated = rated;
    }

    public String getToken() {
        return token;
    }

    public void setToken(String token) {
        this.token = token;
    }

    public String getSentTo() {
        return sentTo;
    }

    public void setSentTo(String sentTo) {
        this.sentTo = sentTo;
    }

    public String getSentAt() {
        return sentAt;
    }

    public void setSentAt(String sentAt) {
        this.sentAt = sentAt;
    }

    public String getCfoName() {
        return cfoName;
    }

    public void setCfoName(String cfoName) {
        this.cfoName = cfoName;
    }

    public long getSpecificationCount() {
        return specificationCount;
    }

    public void setSpecificationCount(long specificationCount) {
        this.specificationCount = specificationCount;
    }

    public BigDecimal getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(BigDecimal totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Long getLeaderUserId() {
        return leaderUserId;
    }

    public void setLeaderUserId(Long leaderUserId) {
        this.leaderUserId = leaderUserId;
    }

    public String getLeaderFullName() {
        return leaderFullName;
    }

    public void setLeaderFullName(String leaderFullName) {
        this.leaderFullName = leaderFullName;
    }

    public String getLeaderEmail() {
        return leaderEmail;
    }

    public void setLeaderEmail(String leaderEmail) {
        this.leaderEmail = leaderEmail;
    }
}
