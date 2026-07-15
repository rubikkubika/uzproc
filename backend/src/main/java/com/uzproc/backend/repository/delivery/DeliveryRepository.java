package com.uzproc.backend.repository.delivery;

import com.uzproc.backend.entity.delivery.Delivery;
import com.uzproc.backend.entity.user.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, Long>, JpaSpecificationExecutor<Delivery> {

    /**
     * Листинг с предзагрузкой @ManyToOne-связей (contract/supplier/paymentSchemeRef/responsible)
     * одним запросом — устраняет N+1 в DeliveryService.toDto. Коллекция payments (@ManyToMany)
     * намеренно НЕ включена (фетч коллекции с пагинацией → in-memory paging).
     */
    @Override
    @EntityGraph(attributePaths = {"contract", "contract.purchaseRequest", "supplier", "paymentSchemeRef", "responsible"})
    Page<Delivery> findAll(Specification<Delivery> spec, Pageable pageable);

    @Query(value = "SELECT COALESCE(MAX(CAST(inner_id AS INTEGER)), 0) " +
            "FROM deliveries WHERE inner_id ~ '^[0-9]+$'", nativeQuery = true)
    Integer findMaxNumericInnerId();

    /** Существует ли уже хотя бы одна поставка по указанному договору (для защиты от дублей). */
    boolean existsByContractId(Long contractId);

    /** Первая (по id) поставка по договору — для upsert из handreport. */
    java.util.Optional<Delivery> findFirstByContractIdOrderByIdAsc(Long contractId);

    /**
     * Кандидаты на авто-закрытие: поставки со схемой оплаты из списка ярлыков
     * (напр. «0/100/10 д.» — по факту, «100/0/10 д.» — аванс 100%), с предзагрузкой оплат
     * для сравнения суммы. Обычно немного строк, поэтому подходит и для запуска «при обновлении».
     */
    @Query("SELECT DISTINCT d FROM Delivery d LEFT JOIN FETCH d.payments " +
            "JOIN d.paymentSchemeRef sr WHERE sr.label IN :labels")
    List<Delivery> findAutoCloseCandidatesBySchemeLabels(@Param("labels") Collection<String> labels);

    /** Уникальные непустые значения «Статуса из отчёта» — для выпадающего фильтра. */
    @Query("SELECT DISTINCT d.reportStatus FROM Delivery d " +
            "WHERE d.reportStatus IS NOT NULL AND TRIM(d.reportStatus) <> '' " +
            "ORDER BY d.reportStatus")
    List<String> findDistinctReportStatuses();

    /** Уникальные ответственные (у которых есть поставки) — для выпадающего фильтра. */
    @Query("SELECT DISTINCT d.responsible FROM Delivery d WHERE d.responsible IS NOT NULL")
    List<User> findDistinctResponsibles();

    /**
     * Количество нераспределённых оплат (без типа) по каждой поставке, у которой такие оплаты есть.
     * Одна строка на поставку; уникальные значения выбираются в сервисе.
     */
    @Query("SELECT COUNT(p) FROM Delivery d JOIN d.payments p WHERE p.paymentType IS NULL GROUP BY d.id")
    List<Long> findUndistributedPaymentCounts();
}
