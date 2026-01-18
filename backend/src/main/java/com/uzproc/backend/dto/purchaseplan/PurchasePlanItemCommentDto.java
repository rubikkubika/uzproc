package com.uzproc.backend.dto.purchaseplan;

import java.time.LocalDateTime;

public class PurchasePlanItemCommentDto {
    private Long id;
    private Long purchasePlanItemId;
    private String text;
    private Boolean isPublic;
    private Long authorId;
    private String authorName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public PurchasePlanItemCommentDto() {
    }

    public PurchasePlanItemCommentDto(Long id, Long purchasePlanItemId, String text, Boolean isPublic, 
                                     Long authorId, String authorName, LocalDateTime createdAt, LocalDateTime updatedAt) {
        this.id = id;
        this.purchasePlanItemId = purchasePlanItemId;
        this.text = text;
        this.isPublic = isPublic;
        this.authorId = authorId;
        this.authorName = authorName;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getPurchasePlanItemId() {
        return purchasePlanItemId;
    }

    public void setPurchasePlanItemId(Long purchasePlanItemId) {
        this.purchasePlanItemId = purchasePlanItemId;
    }

    public String getText() {
        return text;
    }

    public void setText(String text) {
        this.text = text;
    }

    public Boolean getIsPublic() {
        return isPublic;
    }

    public void setIsPublic(Boolean isPublic) {
        this.isPublic = isPublic;
    }

    public Long getAuthorId() {
        return authorId;
    }

    public void setAuthorId(Long authorId) {
        this.authorId = authorId;
    }

    public String getAuthorName() {
        return authorName;
    }

    public void setAuthorName(String authorName) {
        this.authorName = authorName;
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
