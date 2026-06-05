package com.uzproc.backend.repository.delivery;

import com.uzproc.backend.entity.delivery.Delivery;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface DeliveryRepository extends JpaRepository<Delivery, Long>, JpaSpecificationExecutor<Delivery> {

    @Query(value = "SELECT COALESCE(MAX(CAST(inner_id AS INTEGER)), 0) " +
            "FROM deliveries WHERE inner_id ~ '^[0-9]+$'", nativeQuery = true)
    Integer findMaxNumericInnerId();

    /** Существует ли уже хотя бы одна поставка по указанному договору (для защиты от дублей). */
    boolean existsByContractId(Long contractId);
}
