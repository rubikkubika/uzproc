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
     * Для вкладки «Сроки закупок»: возвращает данные по этапам для каждой заявки.
     * Колонки: id_purchase_request, purchase_request_creation_date, min_assignment_date,
     * max_completion_date, approval_assignment_date, max_purchase_completion_date,
     * complexity, max_contract_creation_date, status, min_purchase_assignment_date.
     */
    @Query(value = """
        SELECT pr.id_purchase_request,
               pr.purchase_request_creation_date,
               sub.min_assignment_date,
               sub.max_completion_date,
               approval_stage.assignment_date AS approval_assignment_date,
               pa_sub.max_purchase_completion_date,
               pr.complexity,
               c_sub.min_contract_creation_date,
               pr.status,
               pa_first_sub.min_purchase_assignment_date
        FROM purchase_requests pr
        JOIN (
            SELECT id_purchase_request,
                   MIN(assignment_date) AS min_assignment_date,
                   MAX(completion_date) AS max_completion_date
            FROM purchase_request_approvals
            WHERE assignment_date IS NOT NULL
            GROUP BY id_purchase_request
        ) sub ON sub.id_purchase_request = pr.id_purchase_request
        LEFT JOIN (
            SELECT id_purchase_request, MIN(assignment_date) AS assignment_date
            FROM purchase_request_approvals
            WHERE stage IN ('Утверждение заявки на ЗП', 'Утверждение заявки на ЗП (НЕ требуется ЗП)')
              AND assignment_date IS NOT NULL
            GROUP BY id_purchase_request
        ) approval_stage ON approval_stage.id_purchase_request = pr.id_purchase_request
        LEFT JOIN (
            SELECT purchase_request_id, MAX(completion_date) AS max_purchase_completion_date
            FROM purchase_approvals
            WHERE completion_date IS NOT NULL
            GROUP BY purchase_request_id
        ) pa_sub ON pa_sub.purchase_request_id = pr.id_purchase_request
        LEFT JOIN (
            SELECT purchase_request_id, MIN(assignment_date) AS min_purchase_assignment_date
            FROM purchase_approvals
            WHERE assignment_date IS NOT NULL
            GROUP BY purchase_request_id
        ) pa_first_sub ON pa_first_sub.purchase_request_id = pr.id_purchase_request
        LEFT JOIN (
            SELECT purchase_request_id, MAX(contract_creation_date) AS min_contract_creation_date
            FROM contracts
            WHERE contract_creation_date IS NOT NULL
              AND (excluded_from_status_calculation IS NULL OR excluded_from_status_calculation = false)
            GROUP BY purchase_request_id
        ) c_sub ON c_sub.purchase_request_id = pr.id_purchase_request
        WHERE pr.purchase_request_creation_date IS NOT NULL
          AND pr.requires_purchase = true
          AND (pr.exclude_from_in_work IS NULL OR pr.exclude_from_in_work = false)
          AND (pr.status IS NULL OR pr.status <> 'NOT_APPROVED')
        ORDER BY sub.min_assignment_date
        """, nativeQuery = true)
    List<Object[]> findCreationAndFirstAssignmentDates();

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

