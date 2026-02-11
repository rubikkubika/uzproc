package com.uzproc.backend.repository.purchaseplan;

import com.uzproc.backend.entity.purchaseplan.PurchasePlanItemComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchasePlanItemCommentRepository extends JpaRepository<PurchasePlanItemComment, Long> {

    @Query("SELECT c.purchasePlanItemId, COUNT(c) FROM PurchasePlanItemComment c WHERE c.purchasePlanItemId IN :ids GROUP BY c.purchasePlanItemId")
    List<Object[]> countByPurchasePlanItemIdIn(@Param("ids") List<Long> ids);
    
    List<PurchasePlanItemComment> findByPurchasePlanItemIdOrderByCreatedAtDesc(Long purchasePlanItemId);
    
    Page<PurchasePlanItemComment> findByPurchasePlanItemIdOrderByCreatedAtDesc(Long purchasePlanItemId, Pageable pageable);
    
    @Query("SELECT c FROM PurchasePlanItemComment c WHERE c.purchasePlanItemId = :itemId AND (c.isPublic = true OR :includePrivate = true) ORDER BY c.createdAt DESC")
    List<PurchasePlanItemComment> findByPurchasePlanItemIdWithVisibility(
        @Param("itemId") Long purchasePlanItemId,
        @Param("includePrivate") Boolean includePrivate
    );
    
    @Query("SELECT c FROM PurchasePlanItemComment c WHERE c.purchasePlanItemId = :itemId AND (c.isPublic = true OR :includePrivate = true) ORDER BY c.createdAt DESC")
    Page<PurchasePlanItemComment> findByPurchasePlanItemIdWithVisibility(
        @Param("itemId") Long purchasePlanItemId,
        @Param("includePrivate") Boolean includePrivate,
        Pageable pageable
    );
}
