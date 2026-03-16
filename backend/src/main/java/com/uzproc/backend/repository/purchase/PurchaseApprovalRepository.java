package com.uzproc.backend.repository.purchase;

import com.uzproc.backend.entity.purchase.PurchaseApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseApprovalRepository extends JpaRepository<PurchaseApproval, Long> {
    
    /**
     * Находит все согласования для закупки по purchaseRequestId
     */
    List<PurchaseApproval> findByPurchaseRequestId(Long purchaseRequestId);
    
    /**
     * Находит согласование по purchaseRequestId, этапу и роли
     */
    Optional<PurchaseApproval> findByPurchaseRequestIdAndStageAndRole(
        Long purchaseRequestId, 
        String stage, 
        String role
    );
    
    /**
     * Находит все согласования для определенного этапа
     */
    List<PurchaseApproval> findByStage(String stage);
    
    /**
     * Находит все согласования для определенной роли
     */
    List<PurchaseApproval> findByRole(String role);
    
    /**
     * Находит все согласования для закупки по purchaseRequestId и этапу
     */
    List<PurchaseApproval> findByPurchaseRequestIdAndStage(Long purchaseRequestId, String stage);

    /**
     * Возвращает (role, assignment_date, completion_date, days_in_work) для завершённых согласований закупок
     * с фильтром по году назначения. Параметр :year = null → без фильтра по году.
     */
    @Query(value = """
        SELECT a.role, a.assignment_date, a.completion_date, a.days_in_work
        FROM purchase_approvals a
        WHERE a.completion_date IS NOT NULL
          AND a.assignment_date IS NOT NULL
          AND a.role IS NOT NULL AND a.role <> ''
          AND (CAST(:year AS INTEGER) IS NULL OR EXTRACT(YEAR FROM a.assignment_date) = CAST(:year AS INTEGER))
        """, nativeQuery = true)
    List<Object[]> findRoleAndDatesForSummary(@Param("year") Integer year);

    /**
     * Находит все согласования для нескольких purchaseRequestId (bulk-запрос).
     */
    List<PurchaseApproval> findByPurchaseRequestIdIn(List<Long> purchaseRequestIds);
}


