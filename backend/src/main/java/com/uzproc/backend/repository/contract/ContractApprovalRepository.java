package com.uzproc.backend.repository.contract;

import com.uzproc.backend.entity.contract.ContractApproval;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContractApprovalRepository extends JpaRepository<ContractApproval, Long> {

    @Query("SELECT a FROM ContractApproval a LEFT JOIN FETCH a.executor WHERE a.contractId = :contractId")
    List<ContractApproval> findByContractId(@Param("contractId") Long contractId);

    Optional<ContractApproval> findByContractIdAndStageAndRole(Long contractId, String stage, String role);

    /**
     * Все согласования договоров, у которых есть связь с заявкой на закупку (contract.purchase_request_id IS NOT NULL).
     * Загружает contract для фильтрации.
     */
    @Query("SELECT a FROM ContractApproval a JOIN FETCH a.contract c WHERE c.purchaseRequestId IS NOT NULL")
    List<ContractApproval> findAllByContractWithPurchaseRequest();

    /**
     * Все уникальные формы документа из согласований договоров (не пустые).
     * Используется для выпадающего фильтра на вкладке «Согласования».
     */
    @Query("SELECT DISTINCT a.documentForm FROM ContractApproval a WHERE a.documentForm IS NOT NULL AND a.documentForm <> '' ORDER BY a.documentForm")
    List<String> findDistinctDocumentForms();

    /**
     * Возвращает (role, assignment_date, completion_date) для завершённых согласований договоров
     * с фильтром по году назначения и форме документа. Технические этапы исключаются на уровне SQL.
     * Параметр :year = null → без фильтра по году; :documentForms = null → без фильтра по форме документа.
     * :documentForms передаётся как строка с разделителем ',' для поддержки множественного выбора.
     */
    @Query(value = """
        SELECT a.role, a.assignment_date, a.completion_date
        FROM contract_approvals a
        WHERE a.completion_date IS NOT NULL
          AND a.assignment_date IS NOT NULL
          AND a.role IS NOT NULL AND a.role <> ''
          AND a.stage IS NOT NULL AND a.stage <> ''
          AND LOWER(a.stage) NOT LIKE 'синхронизация%'
          AND LOWER(a.stage) NOT LIKE 'принятие на хранение%'
          AND LOWER(a.stage) NOT LIKE 'регистрация%'
          AND (CAST(:year AS INTEGER) IS NULL OR EXTRACT(YEAR FROM a.assignment_date) = CAST(:year AS INTEGER))
          AND (CAST(:documentForms AS TEXT) IS NULL OR a.document_form = ANY(string_to_array(CAST(:documentForms AS TEXT), ',')))
        """, nativeQuery = true)
    List<Object[]> findRoleAndDatesForSummary(
            @Param("year") Integer year,
            @Param("documentForms") String documentForms);

    /**
     * Возвращает (person_name, assignment_date, completion_date) для сводки «по ФИО».
     * Группируется по исполнителю (executor_id → users).
     */
    @Query(value = """
        SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.surname,''), ' ', COALESCE(u.name,''))), ''), u.username, 'Неизвестно') AS person,
               a.assignment_date, a.completion_date,
               COALESCE(NULLIF(TRIM(u.position), ''), '—') AS department,
               COALESCE(NULLIF(TRIM(a.role), ''), '—') AS role
        FROM contract_approvals a
        LEFT JOIN users u ON a.executor_id = u.id
        WHERE a.completion_date IS NOT NULL
          AND a.assignment_date IS NOT NULL
          AND a.stage IS NOT NULL AND a.stage <> ''
          AND LOWER(a.stage) NOT LIKE 'синхронизация%'
          AND LOWER(a.stage) NOT LIKE 'принятие на хранение%'
          AND LOWER(a.stage) NOT LIKE 'регистрация%'
          AND (CAST(:year AS INTEGER) IS NULL OR EXTRACT(YEAR FROM a.assignment_date) = CAST(:year AS INTEGER))
          AND (CAST(:documentForms AS TEXT) IS NULL OR a.document_form = ANY(string_to_array(CAST(:documentForms AS TEXT), ',')))
        """, nativeQuery = true)
    List<Object[]> findPersonAndDatesForSummary(
            @Param("year") Integer year,
            @Param("documentForms") String documentForms);

    /**
     * Возвращает (document_form, assignment_date, completion_date) для сводки «по виду документа».
     * Только договорные согласования (они единственные хранят document_form).
     */
    /**
     * Возвращает (document_form, assignment_date, completion_date, contract_id) для сводки «по виду документа».
     * contract_id используется для подсчёта уникальных документов на уровне сервиса.
     */
    @Query(value = """
        SELECT COALESCE(NULLIF(TRIM(a.document_form), ''), 'Не указан') AS doc_form,
               a.assignment_date, a.completion_date, a.contract_id
        FROM contract_approvals a
        WHERE a.completion_date IS NOT NULL
          AND a.assignment_date IS NOT NULL
          AND a.stage IS NOT NULL AND a.stage <> ''
          AND LOWER(a.stage) NOT LIKE 'синхронизация%'
          AND LOWER(a.stage) NOT LIKE 'принятие на хранение%'
          AND LOWER(a.stage) NOT LIKE 'регистрация%'
          AND (CAST(:year AS INTEGER) IS NULL OR EXTRACT(YEAR FROM a.assignment_date) = CAST(:year AS INTEGER))
        """, nativeQuery = true)
    List<Object[]> findDocumentFormAndDatesForSummary(@Param("year") Integer year);

    /**
     * Возвращает (inner_id, doc_form, first_assignment_date, last_completion_date) для сводки «по документам».
     * Группирует по contract_id; срок = MIN(assignment_date) → MAX(completion_date) среди не-технических этапов.
     * Технические этапы (синхронизация, принятие на хранение, регистрация) исключаются.
     * Показываются только договоры, у которых есть хотя бы одно завершённое согласование.
     */
    @Query(value = """
        SELECT COALESCE(NULLIF(TRIM(c.inner_id), ''), '—') AS inner_id,
               COALESCE(NULLIF(TRIM(c.document_form), ''), 'Не указан') AS doc_form,
               MIN(a.assignment_date) AS first_assignment,
               MAX(a.completion_date) AS last_completion,
               (c.purchase_request_id IS NOT NULL) AS has_purchase_request
        FROM contract_approvals a
        JOIN contracts c ON a.contract_id = c.id
        WHERE a.assignment_date IS NOT NULL
          AND a.stage IS NOT NULL AND a.stage <> ''
          AND LOWER(a.stage) NOT LIKE 'синхронизация%'
          AND LOWER(a.stage) NOT LIKE 'принятие на хранение%'
          AND LOWER(a.stage) NOT LIKE 'регистрация%'
          AND (CAST(:year AS INTEGER) IS NULL OR EXTRACT(YEAR FROM a.assignment_date) = CAST(:year AS INTEGER))
          AND (CAST(:documentForms AS TEXT) IS NULL OR c.document_form = ANY(string_to_array(CAST(:documentForms AS TEXT), ',')))
        GROUP BY c.id, c.inner_id, c.document_form, c.purchase_request_id
        HAVING MAX(a.completion_date) IS NOT NULL
        ORDER BY c.inner_id
        """, nativeQuery = true)
    List<Object[]> findContractDurationForSummary(
            @Param("year") Integer year,
            @Param("documentForms") String documentForms);

    /**
     * Все замечания (comment_text IS NOT NULL) из согласований договоров,
     * подготовленных исполнителем с isContractor = true.
     * Отсортированы по убыванию даты завершения.
     */
    @Query(value = "SELECT a FROM ContractApproval a " +
           "JOIN FETCH a.contract c " +
           "LEFT JOIN FETCH c.preparedBy pb " +
           "LEFT JOIN FETCH a.executor e " +
           "WHERE a.commentText IS NOT NULL AND a.commentText <> '' " +
           "AND pb.isContractor = true " +
           "ORDER BY a.completionDate DESC NULLS LAST",
           countQuery = "SELECT COUNT(a) FROM ContractApproval a " +
           "JOIN a.contract c " +
           "LEFT JOIN c.preparedBy pb " +
           "WHERE a.commentText IS NOT NULL AND a.commentText <> '' " +
           "AND pb.isContractor = true")
    Page<ContractApproval> findAllRemarksFromContractors(Pageable pageable);

    /**
     * Все замечания для дашборда с фильтром по дате создания.
     * Учитываются только договора, подготовленные пользователем с isContractor = true.
     * Отсортированы по убыванию даты создания.
     * Использует native query с CAST для корректной обработки NULL-параметров в PostgreSQL.
     */
    @Query(value = """
        SELECT ca.id FROM contract_approvals ca
        JOIN contracts c ON c.id = ca.contract_id
        JOIN users pb ON pb.id = c.prepared_by_id
        WHERE ca.comment_text IS NOT NULL AND ca.comment_text <> ''
          AND pb.is_contractor = true
          AND (CAST(:dateFrom AS TIMESTAMP) IS NULL OR ca.created_at >= CAST(:dateFrom AS TIMESTAMP))
          AND (CAST(:dateTo AS TIMESTAMP) IS NULL OR ca.created_at <= CAST(:dateTo AS TIMESTAMP))
        ORDER BY ca.created_at DESC NULLS LAST
        """, nativeQuery = true)
    List<Long> findRemarkIdsForDashboard(
            @Param("dateFrom") String dateFrom,
            @Param("dateTo") String dateTo);

    /**
     * Загружает сущности ContractApproval с join fetch по списку ID.
     * Используется после findRemarkIdsForDashboard для получения полных объектов.
     */
    @Query("SELECT a FROM ContractApproval a " +
           "JOIN FETCH a.contract c " +
           "LEFT JOIN FETCH c.preparedBy pb " +
           "LEFT JOIN FETCH a.executor e " +
           "WHERE a.id IN :ids " +
           "ORDER BY a.createdAt DESC NULLS LAST")
    List<ContractApproval> findAllWithContractAndExecutorByIds(@Param("ids") List<Long> ids);

    /**
     * Для вкладки «Сроки закупок»: данные согласования договоров по каждой заявке.
     * Возвращает (purchase_request_id, contract_id, first_assignment_date,
     *             last_approval_completion_date, reg_assignment_date, reg_completion_date).
     * first_assignment_date = MIN(assignment_date) по всем этапам договора.
     * last_approval_completion_date = MAX(completion_date) по не-регистрационным этапам.
     * reg_assignment_date = MIN(assignment_date) по этапам «регистрация%».
     * reg_completion_date = MAX(completion_date) по этапам «регистрация%».
     * Исключены договоры с excluded_from_status_calculation = true.
     */
    @Query(value = """
        SELECT c.purchase_request_id,
               c.id AS contract_id,
               MIN(ca.assignment_date) AS first_assignment_date,
               appr.last_approval_completion_date,
               reg.reg_assignment_date,
               reg.reg_completion_date
        FROM contracts c
        JOIN contract_approvals ca ON ca.contract_id = c.id AND ca.assignment_date IS NOT NULL
        LEFT JOIN (
            SELECT contract_id, MAX(completion_date) AS last_approval_completion_date
            FROM contract_approvals
            WHERE LOWER(stage) NOT LIKE 'регистрация%'
              AND LOWER(stage) NOT LIKE 'принятие на хранение%'
              AND LOWER(stage) NOT LIKE 'синхронизация%'
              AND completion_date IS NOT NULL
            GROUP BY contract_id
        ) appr ON appr.contract_id = c.id
        LEFT JOIN (
            SELECT contract_id,
                   MIN(assignment_date) AS reg_assignment_date,
                   MAX(completion_date) AS reg_completion_date
            FROM contract_approvals
            WHERE LOWER(stage) LIKE 'регистрация%'
            GROUP BY contract_id
        ) reg ON reg.contract_id = c.id
        WHERE c.purchase_request_id IS NOT NULL
          AND (c.excluded_from_status_calculation IS NULL OR c.excluded_from_status_calculation = false)
        GROUP BY c.purchase_request_id, c.id, appr.last_approval_completion_date, reg.reg_assignment_date, reg.reg_completion_date
        """, nativeQuery = true)
    List<Object[]> findContractApprovalDatesForTimelines();
}
