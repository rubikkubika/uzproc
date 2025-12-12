package com.uzproc.backend.repository;

import com.uzproc.backend.entity.PurchasePlanItemChange;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PurchasePlanItemChangeRepository extends JpaRepository<PurchasePlanItemChange, Long> {
    List<PurchasePlanItemChange> findByPurchasePlanItemId(Long purchasePlanItemId);
    Page<PurchasePlanItemChange> findByPurchasePlanItemId(Long purchasePlanItemId, Pageable pageable);
    List<PurchasePlanItemChange> findByGuid(UUID guid);
    List<PurchasePlanItemChange> findByPurchasePlanItemIdOrderByChangeDateDesc(Long purchasePlanItemId);
    List<PurchasePlanItemChange> findByGuidOrderByChangeDateDesc(UUID guid);
}

