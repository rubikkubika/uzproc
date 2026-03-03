package com.uzproc.backend.repository.purchase;

import com.uzproc.backend.entity.purchase.Purchase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PurchaseRepository extends JpaRepository<Purchase, Long>, JpaSpecificationExecutor<Purchase> {

    /** ID заявок, у которых есть хотя бы одна связанная закупка с указанной подстрокой в способе закупки (mcc). */
    @Query("SELECT DISTINCT p.purchaseRequestId FROM Purchase p WHERE p.mcc IS NOT NULL AND LOWER(p.mcc) LIKE LOWER(CONCAT(CONCAT('%', :mccSubstring), '%'))")
    List<Long> findDistinctPurchaseRequestIdByMccContaining(@Param("mccSubstring") String mccSubstring);
    Optional<Purchase> findByGuid(UUID guid);
    boolean existsByGuid(UUID guid);
    Optional<Purchase> findByPurchaseNumber(Long purchaseNumber);
    boolean existsByPurchaseNumber(Long purchaseNumber);
    Optional<Purchase> findByInnerId(String innerId);
    boolean existsByInnerId(String innerId);
    Page<Purchase> findByPurchaseCreationDateBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
    List<Purchase> findByPurchaseRequestId(Long purchaseRequestId);
    Optional<Purchase> findFirstByPurchaseRequestId(Long purchaseRequestId);
}





