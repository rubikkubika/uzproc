package com.uzproc.backend.repository.purchaserequest;

import com.uzproc.backend.entity.purchaserequest.PurchaseRequestApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PurchaseRequestApprovalRepository extends JpaRepository<PurchaseRequestApproval, Long> {

    /**
     * Найти все записи этапа «Утверждение заявки на ЗП» с указанной датой назначения (для получения списка годов).
     */
    List<PurchaseRequestApproval> findByStageInAndAssignmentDateIsNotNull(List<String> stages);
    
    // Найти все согласования для заявки по id_purchase_request
    List<PurchaseRequestApproval> findByIdPurchaseRequest(Long idPurchaseRequest);
    
    // Найти согласования по этапу
    List<PurchaseRequestApproval> findByIdPurchaseRequestAndStage(
        Long idPurchaseRequest, 
        String stage
    );
    
    // Найти согласования по роли
    List<PurchaseRequestApproval> findByIdPurchaseRequestAndRole(
        Long idPurchaseRequest, 
        String role
    );
    
    // Найти конкретное согласование
    Optional<PurchaseRequestApproval> findByIdPurchaseRequestAndStageAndRole(
        Long idPurchaseRequest, 
        String stage, 
        String role
    );
    
    // Удалить все согласования для заявки
    void deleteByIdPurchaseRequest(Long idPurchaseRequest);

    /**
     * ID заявок на закупку, у которых дата назначения на закупщика (min assignment_date по этапу «Утверждение заявки на ЗП»)
     * попадает в указанный диапазон дат (включительно).
     */
    @Query(value = """
        SELECT t.id_purchase_request FROM (
            SELECT id_purchase_request, MIN(assignment_date) AS min_dt
            FROM purchase_request_approvals
            WHERE stage IN ('Утверждение заявки на ЗП', 'Утверждение заявки на ЗП (НЕ требуется ЗП)') AND assignment_date IS NOT NULL
            GROUP BY id_purchase_request
        ) t
        WHERE CAST(t.min_dt AS date) BETWEEN :assignmentDateFrom AND :assignmentDateTo
        """, nativeQuery = true)
    List<Long> findPurchaseRequestIdsWithApprovalAssignmentDateBetween(
            @Param("assignmentDateFrom") LocalDate assignmentDateFrom,
            @Param("assignmentDateTo") LocalDate assignmentDateTo);

    /**
     * Возвращает (role, assignment_date, completion_date, days_in_work) для завершённых согласований заявок
     * с фильтром по году назначения. Параметр :year = null → без фильтра по году.
     */
    @Query(value = """
        SELECT a.role, a.assignment_date, a.completion_date, a.days_in_work
        FROM purchase_request_approvals a
        WHERE a.completion_date IS NOT NULL
          AND a.assignment_date IS NOT NULL
          AND a.role IS NOT NULL AND a.role <> ''
          AND (CAST(:year AS INTEGER) IS NULL OR EXTRACT(YEAR FROM a.assignment_date) = CAST(:year AS INTEGER))
        """, nativeQuery = true)
    List<Object[]> findRoleAndDatesForSummary(@Param("year") Integer year);
}

