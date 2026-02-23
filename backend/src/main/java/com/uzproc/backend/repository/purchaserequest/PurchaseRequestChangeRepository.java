package com.uzproc.backend.repository.purchaserequest;

import com.uzproc.backend.entity.purchaserequest.PurchaseRequestChange;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PurchaseRequestChangeRepository extends JpaRepository<PurchaseRequestChange, Long> {
    List<PurchaseRequestChange> findByPurchaseRequestId(Long purchaseRequestId);
    Page<PurchaseRequestChange> findByPurchaseRequestId(Long purchaseRequestId, Pageable pageable);
    List<PurchaseRequestChange> findByPurchaseRequestIdOrderByChangeDateDesc(Long purchaseRequestId);
    List<PurchaseRequestChange> findByGuidOrderByChangeDateDesc(UUID guid);
}
