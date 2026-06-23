package com.uzproc.backend.repository.supplier;

import com.uzproc.backend.entity.supplier.SupplierContact;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SupplierContactRepository extends JpaRepository<SupplierContact, Long> {

    List<SupplierContact> findBySupplierIdOrderByIdAsc(Long supplierId);

    List<SupplierContact> findBySupplierIdInOrderByIdAsc(List<Long> supplierIds);
}
