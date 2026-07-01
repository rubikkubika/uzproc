package com.uzproc.backend.entity.sendingcenter;

import com.uzproc.backend.entity.user.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Переопределённый получатель письма по спецификациям для ЦФО (Центр отправки).
 * Наличие записи означает, что выбран НЕ руководитель ЦФО.
 */
@Entity
@Table(name = "specification_sending_recipients")
public class SpecificationSendingRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cfo_name", nullable = false, unique = true, length = 255)
    private String cfoName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    /** Снимок ФИО на момент выбора. */
    @Column(name = "full_name", length = 512)
    private String fullName;

    /** Снимок email на момент выбора. */
    @Column(name = "email", length = 255)
    private String email;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public SpecificationSendingRecipient() {
    }

    public SpecificationSendingRecipient(String cfoName) {
        this.cfoName = cfoName;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCfoName() {
        return cfoName;
    }

    public void setCfoName(String cfoName) {
        this.cfoName = cfoName;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
