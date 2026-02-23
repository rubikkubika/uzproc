package com.uzproc.backend.repository.supplier;

import com.uzproc.backend.entity.supplier.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SupplierRepository extends JpaRepository<Supplier, Long>, JpaSpecificationExecutor<Supplier> {

    Optional<Supplier> findByCode(String code);

    /** Поиск первого поставщика по ИНН (для парсинга колонки "Контрагенты" в договорах). */
    Optional<Supplier> findFirstByInn(String inn);
}
