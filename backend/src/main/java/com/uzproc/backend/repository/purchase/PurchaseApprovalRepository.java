package com.uzproc.backend.repository.purchase;

import com.uzproc.backend.entity.purchase.PurchaseApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PurchaseApprovalRepository extends JpaRepository<PurchaseApproval, Long> {

    /**
     * Находит согласования закупки, учитываемые в SLA/аналитике (counted_in_sla = true).
     * По умолчанию это последний круг согласования по каждому этапу/роли.
     * Используется в расчётах статусов и SLA — поведение совпадает с «одна строка на этап/роль».
     */
    @Query("SELECT a FROM PurchaseApproval a WHERE a.purchaseRequestId = :purchaseRequestId AND a.countedInSla = true")
    List<PurchaseApproval> findByPurchaseRequestId(@Param("purchaseRequestId") Long purchaseRequestId);

    /**
     * Находит ВСЕ согласования закупки по всем кругам (для отображения истории в карточке).
     */
    List<PurchaseApproval> findAllByPurchaseRequestIdOrderByStageAscRoleAscRoundAsc(Long purchaseRequestId);

    /**
     * Находит все круги согласования по конкретному (этап, роль) — для логики импорта.
     */
    List<PurchaseApproval> findByPurchaseRequestIdAndStageAndRoleOrderByRoundAsc(
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
     * Находит все согласования (все круги) для закупки по purchaseRequestId и этапу — для карточки.
     */
    List<PurchaseApproval> findByPurchaseRequestIdAndStage(Long purchaseRequestId, String stage);

    /**
     * Возвращает (role, assignment_date, completion_date, days_in_work) для завершённых согласований закупок
     * с фильтром по году назначения. Параметр :year = null → без фильтра по году.
     * Учитываются только круги, помеченные counted_in_sla = true.
     */
    @Query(value = """
        SELECT a.role, a.assignment_date, a.completion_date, a.days_in_work
        FROM purchase_approvals a
        WHERE a.completion_date IS NOT NULL
          AND a.assignment_date IS NOT NULL
          AND a.role IS NOT NULL AND a.role <> ''
          AND a.counted_in_sla = true
          AND (CAST(:year AS INTEGER) IS NULL OR EXTRACT(YEAR FROM a.assignment_date) = CAST(:year AS INTEGER))
        """, nativeQuery = true)
    List<Object[]> findRoleAndDatesForSummary(@Param("year") Integer year);

    /**
     * Находит согласования для нескольких purchaseRequestId (bulk-запрос), учитываемые в SLA (counted_in_sla = true).
     */
    @Query("SELECT a FROM PurchaseApproval a WHERE a.purchaseRequestId IN :purchaseRequestIds AND a.countedInSla = true")
    List<PurchaseApproval> findByPurchaseRequestIdIn(@Param("purchaseRequestIds") List<Long> purchaseRequestIds);
}
