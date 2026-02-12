package com.uzproc.backend.repository.purchaserequest;

import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PurchaseRequestRepository extends JpaRepository<PurchaseRequest, Long>, JpaSpecificationExecutor<PurchaseRequest> {
    Optional<PurchaseRequest> findByGuid(UUID guid);
    Optional<PurchaseRequest> findByInnerId(String innerId);
    boolean existsByGuid(UUID guid);
    Optional<PurchaseRequest> findByIdPurchaseRequest(Long idPurchaseRequest);
    boolean existsByIdPurchaseRequest(Long idPurchaseRequest);
    Page<PurchaseRequest> findByPurchaseRequestCreationDateBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
    Optional<PurchaseRequest> findByCsiToken(String csiToken);

    @Query("SELECT DISTINCT pr.status FROM PurchaseRequest pr WHERE pr.idPurchaseRequest IN (SELECT p.purchaseRequestId FROM PurchasePlanItem p WHERE p.purchaseRequestId IS NOT NULL) AND pr.status IS NOT NULL")
    List<PurchaseRequestStatus> findDistinctStatusLinkedFromPlan();
}

