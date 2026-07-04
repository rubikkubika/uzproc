package com.uzproc.backend.entity.tracker;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Избранная закупка пользователя на странице «Трекер закупок».
 * Закупка идентифицируется номером заявки (id_purchase_request), как в {@code ProcurementTrackerDto.id}.
 */
@Entity
@Table(name = "procurement_favorites",
        uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "id_purchase_request"}))
public class ProcurementFavorite {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "id_purchase_request", nullable = false)
    private Long idPurchaseRequest;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public ProcurementFavorite() {
    }

    public ProcurementFavorite(Long userId, Long idPurchaseRequest) {
        this.userId = userId;
        this.idPurchaseRequest = idPurchaseRequest;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getIdPurchaseRequest() {
        return idPurchaseRequest;
    }

    public void setIdPurchaseRequest(Long idPurchaseRequest) {
        this.idPurchaseRequest = idPurchaseRequest;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
