package com.uzproc.backend.repository.purchaseplan;

import com.uzproc.backend.entity.purchaseplan.PurchasePlanItemSupplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchasePlanItemSupplierRepository extends JpaRepository<PurchasePlanItemSupplier, Long> {

    @Query("SELECT l.purchasePlanItemId, COUNT(l) FROM PurchasePlanItemSupplier l WHERE l.purchasePlanItemId IN :ids GROUP BY l.purchasePlanItemId")
    List<Object[]> countByPurchasePlanItemIdIn(@Param("ids") List<Long> ids);

    @Query("SELECT l FROM PurchasePlanItemSupplier l JOIN FETCH l.supplier WHERE l.purchasePlanItemId = :itemId ORDER BY l.createdAt ASC")
    List<PurchasePlanItemSupplier> findByPurchasePlanItemIdWithSupplier(@Param("itemId") Long purchasePlanItemId);

    boolean existsByPurchasePlanItemIdAndSupplierId(Long purchasePlanItemId, Long supplierId);

    long countByPurchasePlanItemId(Long purchasePlanItemId);
}
