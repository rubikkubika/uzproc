package com.uzproc.backend.repository.sendingcenter;

import com.uzproc.backend.entity.contract.Contract;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Агрегаты для Центра отправки (вкладка «Спецификации»).
 * Спецификация — это {@code contracts} с {@code document_form = 'Спецификация'}.
 * Дата месяца берётся по завершению этапа «Синхронизация» из {@code contract_approvals}.
 */
public interface SpecificationSendingRepository extends Repository<Contract, Long> {

    /**
     * Подписанные спецификации, сгруппированные по ЦФО, у которых дата синхронизации
     * (MAX completion_date по этапу «Синхронизация») попадает в интервал [start, end).
     *
     * @return строки [cfoName (String), specCount (Number), totalAmount (Number)]
     */
    @Query(value =
            "SELECT cfo.name AS cfo_name, " +
            "       COUNT(*) AS spec_count, " +
            "       COALESCE(SUM(c.budget_amount), 0) AS total_amount " +
            "FROM contracts c " +
            "JOIN cfo cfo ON cfo.id = c.cfo_id " +
            "JOIN ( " +
            "    SELECT contract_id, MAX(completion_date) AS sync_date " +
            "    FROM contract_approvals " +
            "    WHERE LOWER(stage) LIKE 'синхронизация%' AND completion_date IS NOT NULL " +
            "    GROUP BY contract_id " +
            ") sa ON sa.contract_id = c.id " +
            "WHERE c.document_form = 'Спецификация' " +
            "  AND c.status = 'SIGNED' " +
            "  AND sa.sync_date >= :start AND sa.sync_date < :end " +
            "GROUP BY cfo.name " +
            "ORDER BY cfo.name",
            nativeQuery = true)
    List<Object[]> aggregateByCfoForPeriod(@Param("start") LocalDateTime start,
                                           @Param("end") LocalDateTime end);

    /**
     * Детальные подписанные спецификации одного ЦФО за период (дата синхронизации в [start, end)).
     * Используется для снимка спецификаций в приглашении на оценку.
     *
     * @return строки [contractId (Number), innerId (String), title (String),
     *                 preparedBy (String), budgetAmount (Number), currency (String),
     *                 syncDate (Timestamp)]
     */
    @Query(value =
            "SELECT c.id AS contract_id, c.inner_id, c.title, " +
            "       TRIM(CONCAT(COALESCE(u.surname, ''), ' ', COALESCE(u.name, ''))) AS prepared_by, " +
            "       c.budget_amount, c.currency, sa.sync_date " +
            "FROM contracts c " +
            "JOIN cfo cfo ON cfo.id = c.cfo_id " +
            "JOIN ( " +
            "    SELECT contract_id, MAX(completion_date) AS sync_date " +
            "    FROM contract_approvals " +
            "    WHERE LOWER(stage) LIKE 'синхронизация%' AND completion_date IS NOT NULL " +
            "    GROUP BY contract_id " +
            ") sa ON sa.contract_id = c.id " +
            "LEFT JOIN users u ON u.id = c.prepared_by_id " +
            "WHERE c.document_form = 'Спецификация' " +
            "  AND c.status = 'SIGNED' " +
            "  AND LOWER(cfo.name) = LOWER(:cfoName) " +
            "  AND sa.sync_date >= :start AND sa.sync_date < :end " +
            "ORDER BY c.inner_id",
            nativeQuery = true)
    List<Object[]> findSpecificationsForCfoAndPeriod(@Param("cfoName") String cfoName,
                                                     @Param("start") LocalDateTime start,
                                                     @Param("end") LocalDateTime end);

    /**
     * Месяцы (YYYY-MM), в которых есть подписанные спецификации по дате синхронизации,
     * с количеством спецификаций. Для навигации по месяцам на фронтенде.
     *
     * @return строки [ym (String 'YYYY-MM'), specCount (Number)] по убыванию месяца
     */
    @Query(value =
            "SELECT to_char(sa.sync_date, 'YYYY-MM') AS ym, COUNT(*) AS spec_count " +
            "FROM contracts c " +
            "JOIN ( " +
            "    SELECT contract_id, MAX(completion_date) AS sync_date " +
            "    FROM contract_approvals " +
            "    WHERE LOWER(stage) LIKE 'синхронизация%' AND completion_date IS NOT NULL " +
            "    GROUP BY contract_id " +
            ") sa ON sa.contract_id = c.id " +
            "WHERE c.document_form = 'Спецификация' " +
            "  AND c.status = 'SIGNED' " +
            "GROUP BY to_char(sa.sync_date, 'YYYY-MM') " +
            "ORDER BY ym DESC",
            nativeQuery = true)
    List<Object[]> availableMonths();
}
