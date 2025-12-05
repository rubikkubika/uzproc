package com.uzproc.backend.repository;

import com.uzproc.backend.entity.Purchase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long>, JpaSpecificationExecutor<Purchase> {
    Optional<Purchase> findByGuid(UUID guid);
    boolean existsByGuid(UUID guid);
    Optional<Purchase> findByPurchaseNumber(Long purchaseNumber);
    boolean existsByPurchaseNumber(Long purchaseNumber);
    Optional<Purchase> findByInnerId(String innerId);
    boolean existsByInnerId(String innerId);
    Page<Purchase> findByPurchaseCreationDateBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
    List<Purchase> findByPurchaseRequestId(Long purchaseRequestId);
}





