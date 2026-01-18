package com.uzproc.backend.repository.purchaserequest;

import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PurchaseRequestRepository extends JpaRepository<PurchaseRequest, Long>, JpaSpecificationExecutor<PurchaseRequest> {
    Optional<PurchaseRequest> findByGuid(UUID guid);
    boolean existsByGuid(UUID guid);
    Optional<PurchaseRequest> findByIdPurchaseRequest(Long idPurchaseRequest);
    boolean existsByIdPurchaseRequest(Long idPurchaseRequest);
    Page<PurchaseRequest> findByPurchaseRequestCreationDateBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
    Optional<PurchaseRequest> findByCsiToken(String csiToken);
}

