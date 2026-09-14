package com.uzproc.backend.repository.purchaseplan;

import com.uzproc.backend.entity.purchaseplan.PurchasePlanItemChange;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface PurchasePlanItemChangeRepository extends JpaRepository<PurchasePlanItemChange, Long> {
    List<PurchasePlanItemChange> findByPurchasePlanItemId(Long purchasePlanItemId);
    Page<PurchasePlanItemChange> findByPurchasePlanItemId(Long purchasePlanItemId, Pageable pageable);
    List<PurchasePlanItemChange> findByGuid(UUID guid);
    List<PurchasePlanItemChange> findByPurchasePlanItemIdOrderByChangeDateDesc(Long purchasePlanItemId);
    List<PurchasePlanItemChange> findByGuidOrderByChangeDateDesc(UUID guid);

    /** Пары [id позиции, имя поля] по всем изменениям указанных позиций (без повторов) */
    @Query("SELECT DISTINCT c.purchasePlanItemId, c.fieldName FROM PurchasePlanItemChange c WHERE c.purchasePlanItemId IN :itemIds")
    List<Object[]> findDistinctChangedFieldsByItemIds(@Param("itemIds") Collection<Long> itemIds);
}

