package com.uzproc.backend.entity.purchaseplan;

import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "purchase_plan_versions")
public class PurchasePlanVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber;

    @Column(name = "year", nullable = false)
    private Integer year;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "created_by", length = 255)
    private String createdBy;

    @Column(name = "is_current")
    private Boolean isCurrent;

    @Column(name = "is_strategic_product")
    private Boolean isStrategicProduct;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "version", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PurchasePlanItemVersion> items = new ArrayList<>();

    public PurchasePlanVersion() {
    }

    public PurchasePlanVersion(Integer versionNumber, Integer year, String description, String createdBy) {
        this.versionNumber = versionNumber;
        this.year = year;
        this.description = description;
        this.createdBy = createdBy;
        this.isCurrent = false;
    }

    // Getters and Setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Integer getVersionNumber() {
        return versionNumber;
    }

    public void setVersionNumber(Integer versionNumber) {
        this.versionNumber = versionNumber;
    }

    public Integer getYear() {
        return year;
    }

    public void setYear(Integer year) {
        this.year = year;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public Boolean getIsCurrent() {
        return isCurrent;
    }

    public void setIsCurrent(Boolean isCurrent) {
        this.isCurrent = isCurrent;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<PurchasePlanItemVersion> getItems() {
        return items;
    }

    public void setItems(List<PurchasePlanItemVersion> items) {
        this.items = items;
    }

    public Boolean getIsStrategicProduct() {
        return isStrategicProduct;
    }

    public void setIsStrategicProduct(Boolean isStrategicProduct) {
        this.isStrategicProduct = isStrategicProduct;
    }
}







