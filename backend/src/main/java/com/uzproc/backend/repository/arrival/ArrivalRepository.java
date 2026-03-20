package com.uzproc.backend.repository.arrival;

import com.uzproc.backend.entity.arrival.Arrival;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface ArrivalRepository extends JpaRepository<Arrival, Long>, JpaSpecificationExecutor<Arrival> {

    Optional<Arrival> findFirstByNumber(String number);

    /** Все поступления по списку поставщиков */
    java.util.List<Arrival> findBySupplierIdIn(java.util.List<Long> supplierIds);

    /** Поиск поступления по номеру вх., дате вх. и ИНН поставщика */
    Optional<Arrival> findFirstByIncomingNumberAndIncomingDateAndSupplierInn(String incomingNumber, LocalDate incomingDate, String supplierInn);
}
