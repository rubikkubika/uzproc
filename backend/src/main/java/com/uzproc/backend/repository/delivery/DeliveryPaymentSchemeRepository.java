package com.uzproc.backend.repository.delivery;

import com.uzproc.backend.entity.delivery.DeliveryPaymentScheme;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliveryPaymentSchemeRepository extends JpaRepository<DeliveryPaymentScheme, Long> {

    /** Активные схемы оплаты в порядке сортировки. */
    List<DeliveryPaymentScheme> findByActiveTrueOrderBySortOrderAsc();
}
