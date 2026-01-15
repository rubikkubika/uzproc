package com.uzproc.backend.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "csi_feedback_invitations")
public class CsiFeedbackInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Связь с PurchaseRequest
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "purchase_request_id", nullable = false)
    private PurchaseRequest purchaseRequest;

    // Получатель письма (email или username)
    @Column(name = "recipient", nullable = false, length = 255)
    private String recipient;

    // Связь с заполненной обратной связью (если форма уже заполнена)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "csi_feedback_id", nullable = true)
    private CsiFeedback csiFeedback;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    public CsiFeedbackInvitation() {
    }

    public CsiFeedbackInvitation(PurchaseRequest purchaseRequest, String recipient) {
        this.purchaseRequest = purchaseRequest;
        this.recipient = recipient;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public PurchaseRequest getPurchaseRequest() {
        return purchaseRequest;
    }

    public void setPurchaseRequest(PurchaseRequest purchaseRequest) {
        this.purchaseRequest = purchaseRequest;
    }

    public String getRecipient() {
        return recipient;
    }

    public void setRecipient(String recipient) {
        this.recipient = recipient;
    }

    public CsiFeedback getCsiFeedback() {
        return csiFeedback;
    }

    public void setCsiFeedback(CsiFeedback csiFeedback) {
        this.csiFeedback = csiFeedback;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
