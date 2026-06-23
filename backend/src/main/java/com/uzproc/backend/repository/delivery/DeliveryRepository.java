package com.uzproc.backend.repository.delivery;

import com.uzproc.backend.entity.delivery.Delivery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, Long>, JpaSpecificationExecutor<Delivery> {

    /**
     * Листинг с предзагрузкой @ManyToOne-связей (contract/supplier/paymentSchemeRef/responsible)
     * одним запросом — устраняет N+1 в DeliveryService.toDto. Коллекция payments (@ManyToMany)
     * намеренно НЕ включена (фетч коллекции с пагинацией → in-memory paging).
     */
    @Override
    @EntityGraph(attributePaths = {"contract", "supplier", "paymentSchemeRef", "responsible"})
    Page<Delivery> findAll(Specification<Delivery> spec, Pageable pageable);

    @Query(value = "SELECT COALESCE(MAX(CAST(inner_id AS INTEGER)), 0) " +
            "FROM deliveries WHERE inner_id ~ '^[0-9]+$'", nativeQuery = true)
    Integer findMaxNumericInnerId();

    /** Существует ли уже хотя бы одна поставка по указанному договору (для защиты от дублей). */
    boolean existsByContractId(Long contractId);
}
