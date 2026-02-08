package com.uzproc.backend.repository.purchaserequest;

import com.uzproc.backend.entity.purchaserequest.PurchaseRequestComment;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestCommentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseRequestCommentRepository extends JpaRepository<PurchaseRequestComment, Long> {

    List<PurchaseRequestComment> findByPurchaseRequest_IdOrderByCreatedAtDesc(Long purchaseRequestId);

    List<PurchaseRequestComment> findByPurchaseRequest_IdAndTypeOrderByCreatedAtDesc(
            Long purchaseRequestId,
            PurchaseRequestCommentType type
    );

    @Query("SELECT c.purchaseRequest.id, COUNT(c) FROM PurchaseRequestComment c WHERE c.purchaseRequest.id IN :ids AND c.type = :type GROUP BY c.purchaseRequest.id")
    List<Object[]> countByPurchaseRequestIdInAndType(@Param("ids") List<Long> ids, @Param("type") PurchaseRequestCommentType type);
}
