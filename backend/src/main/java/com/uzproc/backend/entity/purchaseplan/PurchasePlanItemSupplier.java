package com.uzproc.backend.entity.purchaseplan;

import com.uzproc.backend.entity.supplier.Supplier;
import jakarta.persistence.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Связь позиции плана закупок с поставщиком (контрагентом).
 * Многие-ко-многим через отдельную сущность связи.
 */
@Entity
@Table(name = "purchase_plan_item_suppliers",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_ppi_supplier",
                columnNames = {"purchase_plan_item_id", "supplier_id"}))
public class PurchasePlanItemSupplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "purchase_plan_item_id", nullable = false)
    private Long purchasePlanItemId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "supplier_id")
    private Supplier supplier;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public PurchasePlanItemSupplier() {
    }

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

    public Supplier getSupplier() {
        return supplier;
    }

    public void setSupplier(Supplier supplier) {
        this.supplier = supplier;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
