package com.uzproc.backend.dto.delivery;

import java.time.LocalDateTime;

/** Комментарий к поставке. */
public class DeliveryCommentDto {
    private Long id;
    private Long deliveryId;
    private String text;
    /** ФИО автора; null — комментарий из ручного отчёта */
    private String createdByUserName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /** Может ли текущий пользователь редактировать комментарий */
    private boolean editable;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDeliveryId() { return deliveryId; }
    public void setDeliveryId(Long deliveryId) { this.deliveryId = deliveryId; }
    public String getText() { return text; }
    public void setText(String text) { this.text = text; }
    public String getCreatedByUserName() { return createdByUserName; }
    public void setCreatedByUserName(String createdByUserName) { this.createdByUserName = createdByUserName; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    public boolean isEditable() { return editable; }
    public void setEditable(boolean editable) { this.editable = editable; }
}
