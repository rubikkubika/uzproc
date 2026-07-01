package com.uzproc.backend.entity.cfo;

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
 * Руководитель ЦФО: привязка названия ЦФО к ФИО руководителя.
 * Сам список ЦФО формируется из существующих сущностей (заявки, закупки, договоры),
 * здесь хранится только ФИО руководителя для конкретного ЦФО.
 */
@Entity
@Table(name = "cfo_leaders")
public class CfoLeader {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cfo_name", nullable = false, unique = true, length = 255)
    private String cfoName;

    @Column(name = "leader_full_name", length = 512)
    private String leaderFullName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public CfoLeader() {
    }

    public CfoLeader(String cfoName, String leaderFullName) {
        this.cfoName = cfoName;
        this.leaderFullName = leaderFullName;
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

    public String getLeaderFullName() {
        return leaderFullName;
    }

    public void setLeaderFullName(String leaderFullName) {
        this.leaderFullName = leaderFullName;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
