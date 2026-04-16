package com.uzproc.backend.entity.training;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "training_media")
public class TrainingMedia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "slide_id", nullable = false)
    private Integer slideId;

    @Column(name = "type", nullable = false, length = 10)
    private String type; // "audio" or "video"

    @Column(name = "filename", nullable = false, length = 255)
    private String filename;

    @Column(name = "original_name", length = 255)
    private String originalName;

    @Column(name = "content_type", length = 100)
    private String contentType;

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "uploaded_at", nullable = false)
    private LocalDateTime uploadedAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getSlideId() { return slideId; }
    public void setSlideId(Integer slideId) { this.slideId = slideId; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getFilename() { return filename; }
    public void setFilename(String filename) { this.filename = filename; }

    public String getOriginalName() { return originalName; }
    public void setOriginalName(String originalName) { this.originalName = originalName; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }
}
