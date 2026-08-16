package com.uzproc.backend.repository.contract;

import com.uzproc.backend.entity.contract.Contract;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ContractRepository extends JpaRepository<Contract, Long>, JpaSpecificationExecutor<Contract> {

    /**
     * id подписанных спецификаций, подготовленных договорником (preparedBy.isContractor = true).
     * Лёгкая projection-выборка (без гидрации сущностей) — для массового создания поставок.
     */
    @Query("SELECT c.id FROM Contract c JOIN c.preparedBy u " +
           "WHERE c.documentForm = 'Спецификация' AND c.status = :status AND u.isContractor = true")
    List<Long> findSignedContractorSpecificationIds(@Param("status") com.uzproc.backend.entity.contract.ContractStatus status);

    /**
     * Договоры из списка id с указанным статусом, подготовленные договорником (preparedBy.isContractor = true).
     * Та же выборка, что на вкладке «Подписаны» таблицы договоров — используется дашбордом SLA договоров.
     */
    @Query("SELECT c FROM Contract c JOIN c.preparedBy u " +
           "WHERE c.id IN :ids AND c.status = :status AND u.isContractor = true")
    List<Contract> findByIdsAndStatusPreparedByContractor(
            @Param("ids") List<Long> ids,
            @Param("status") com.uzproc.backend.entity.contract.ContractStatus status);

    /**
     * То же, что {@link #findByIdsAndStatusPreparedByContractor}, но с исключением ЦФО —
     * переключатель «без 1P» на дашборде SLA договоров.
     * Отдельный метод, а не условие «:param IS NULL»: Postgres не выводит тип у неиспользованного параметра.
     */
    @Query("SELECT c FROM Contract c JOIN c.preparedBy u LEFT JOIN c.cfo cf " +
           "WHERE c.id IN :ids AND c.status = :status AND u.isContractor = true " +
           "AND (cf.id IS NULL OR cf.name <> :excludeCfoName)")
    List<Contract> findByIdsAndStatusPreparedByContractorExcludingCfo(
            @Param("ids") List<Long> ids,
            @Param("status") com.uzproc.backend.entity.contract.ContractStatus status,
            @Param("excludeCfoName") String excludeCfoName);

    Optional<Contract> findByGuid(UUID guid);
    boolean existsByGuid(UUID guid);
    Optional<Contract> findByInnerId(String innerId);

    /**
     * Пересчитывает дату регистрации (registration_date) для всех договоров:
     * MAX(completion_date) по этапам согласования «регистрация%» (без учёта регистра).
     * Если у договора нет таких согласований — записывается NULL.
     * Вызывается после парсинга данных для актуализации хранимого значения.
     */
    @Modifying
    @org.springframework.transaction.annotation.Transactional
    @Query(value = "UPDATE contracts c SET registration_date = (" +
                   "SELECT MAX(a.completion_date) FROM contract_approvals a " +
                   "WHERE a.contract_id = c.id AND LOWER(a.stage) LIKE 'регистрация%' AND a.completion_date IS NOT NULL)",
           nativeQuery = true)
    int recomputeAllRegistrationDates();

    /**
     * Лёгкая projection-выборка (inner_id, id) по всем договорам с непустым inner_id.
     * Используется для предзагрузки кэша inner_id → id при импорте согласований договоров,
     * чтобы не дёргать findByInnerId на каждую строку Excel (устранение N+1).
     */
    @Query("SELECT c.innerId, c.id FROM Contract c WHERE c.innerId IS NOT NULL AND c.innerId <> ''")
    List<Object[]> findAllInnerIdAndId();

    boolean existsByInnerId(String innerId);
    List<Contract> findByPurchaseRequestId(Long purchaseRequestId);
    List<Contract> findByPurchaseRequestIdIn(List<Long> purchaseRequestIds);
    Optional<Contract> findByName(String name);
    /** Поиск договора по заголовку (для связывания оплат из комментария Excel). Берётся первый при совпадении. */
    Optional<Contract> findFirstByTitle(String title);

    /**
     * Поиск договора по нормализованному заголовку (trim + схлопывание пробелов, без учёта регистра).
     * Используется для связывания оплат, когда строка из комментария может отличаться пробелами/регистром.
     */
    @Query(value = "SELECT * FROM contracts c WHERE c.title IS NOT NULL AND LOWER(TRIM(REGEXP_REPLACE(c.title, '\\s+', ' ', 'g'))) = LOWER(:title)", nativeQuery = true)
    Optional<Contract> findFirstByNormalizedTitle(@Param("title") String normalizedTitle);
    List<Contract> findByParentContractId(Long parentContractId);

    @Query("SELECT DISTINCT EXTRACT(YEAR FROM c.contractCreationDate) FROM Contract c WHERE c.contractCreationDate IS NOT NULL ORDER BY EXTRACT(YEAR FROM c.contractCreationDate) DESC")
    List<Integer> findDistinctYears();

    /**
     * Формы документа, реально встречающиеся в договорах — для выпадающего фильтра таблицы договоров.
     */
    @Query(value = """
        SELECT DISTINCT document_form
        FROM contracts
        WHERE document_form IS NOT NULL AND document_form <> ''
        ORDER BY document_form
        """, nativeQuery = true)
    List<String> findDistinctDocumentForms();

    /**
     * ФИО исполнителей, у которых есть договоры, — для выпадающего фильтра «Исполнитель»
     * в таблице договоров. Только договорники (is_contractor = true): колонка «Исполнитель»
     * показывается лишь на вкладках, где выборка и так ограничена договорниками,
     * поэтому остальные ФИО давали бы пустой результат.
     */
    @Query(value = """
        SELECT DISTINCT TRIM(CONCAT(COALESCE(u.surname, ''), ' ', COALESCE(u.name, ''))) AS prepared_by_name
        FROM contracts c
        INNER JOIN users u ON c.prepared_by_id = u.id
        WHERE u.is_contractor = true
          AND TRIM(CONCAT(COALESCE(u.surname, ''), ' ', COALESCE(u.name, ''))) <> ''
        ORDER BY prepared_by_name
        """, nativeQuery = true)
    List<String> findDistinctPreparedByNames();

    /**
     * Список форм документа (Договор, Спецификация и т.д.) по договорам, связанным с заявкой на закупку.
     * Для выпадающего списка фильтра на вкладке «Согласования».
     */
    @Query("SELECT DISTINCT c.documentForm FROM Contract c WHERE c.purchaseRequestId IS NOT NULL AND c.documentForm IS NOT NULL AND c.documentForm <> '' ORDER BY c.documentForm")
    List<String> findDistinctDocumentFormsByPurchaseRequestIdNotNull();

    @Query("SELECT DISTINCT c FROM Contract c LEFT JOIN FETCH c.suppliers WHERE c.purchaseRequestId IN :ids")
    List<Contract> findWithSuppliersByPurchaseRequestIdIn(@Param("ids") List<Long> ids);
}

