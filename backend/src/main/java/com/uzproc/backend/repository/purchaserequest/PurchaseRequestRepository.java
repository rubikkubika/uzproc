package com.uzproc.backend.repository.purchaserequest;

import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
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

    /**
     * Листинг с предзагрузкой cfo (@ManyToOne) — устраняет N+1 при чтении cfo.getName()
     * как в toDto (основной список), так и в дашбордах через findEntities (напр. /overview/ek).
     */
    @Override
    @EntityGraph(attributePaths = {"cfo"})
    Page<PurchaseRequest> findAll(Specification<PurchaseRequest> spec, Pageable pageable);

    Optional<PurchaseRequest> findByGuid(UUID guid);
    Optional<PurchaseRequest> findByInnerId(String innerId);
    boolean existsByGuid(UUID guid);
    Optional<PurchaseRequest> findByIdPurchaseRequest(Long idPurchaseRequest);
    boolean existsByIdPurchaseRequest(Long idPurchaseRequest);
    Page<PurchaseRequest> findByPurchaseRequestCreationDateBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
    Optional<PurchaseRequest> findByCsiToken(String csiToken);

    /**
     * Поиск заявок для публичного трекера статуса: по номеру заявки, предмету или ФИО инициатора.
     * Регистронезависимо, ограничение количества через Pageable.
     */
    @Query("SELECT pr FROM PurchaseRequest pr WHERE " +
           "LOWER(COALESCE(pr.purchaseRequestSubject, '')) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(COALESCE(pr.name, '')) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR LOWER(COALESCE(pr.purchaseRequestInitiator, '')) LIKE LOWER(CONCAT('%', :q, '%')) " +
           "OR CAST(pr.idPurchaseRequest AS string) LIKE CONCAT('%', :q, '%') " +
           "ORDER BY pr.idPurchaseRequest DESC")
    List<PurchaseRequest> searchForTracker(@org.springframework.data.repository.query.Param("q") String q, Pageable pageable);

    @Query("SELECT DISTINCT pr.status FROM PurchaseRequest pr WHERE pr.idPurchaseRequest IN (SELECT p.purchaseRequestId FROM PurchasePlanItem p WHERE p.purchaseRequestId IS NOT NULL) AND pr.status IS NOT NULL")
    List<PurchaseRequestStatus> findDistinctStatusLinkedFromPlan();

    @Query("SELECT DISTINCT pr.purchaseRequestInitiator FROM PurchaseRequest pr WHERE pr.purchaseRequestInitiator IS NOT NULL")
    List<String> findDistinctPurchaseRequestInitiator();

    @Query("SELECT DISTINCT pr.purchaser FROM PurchaseRequest pr WHERE pr.purchaser IS NOT NULL")
    List<String> findDistinctPurchaser();

    @Query("SELECT DISTINCT pr.status FROM PurchaseRequest pr WHERE pr.status IS NOT NULL")
    List<PurchaseRequestStatus> findDistinctStatus();

    /** Уникальные статусы только для закупок (requires_purchase = true) или только для заказов (requires_purchase = false). */
    @Query("SELECT DISTINCT pr.status FROM PurchaseRequest pr WHERE pr.status IS NOT NULL AND pr.requiresPurchase = :requiresPurchase")
    List<PurchaseRequestStatus> findDistinctStatusByRequiresPurchase(Boolean requiresPurchase);

    /** Batch: (idPurchaseRequest, requiresPurchase) по списку ID. */
    @Query("SELECT pr.idPurchaseRequest, pr.requiresPurchase FROM PurchaseRequest pr WHERE pr.idPurchaseRequest IN :prIds")
    List<Object[]> findIdAndRequiresPurchaseByIdPurchaseRequestIn(@org.springframework.data.repository.query.Param("prIds") List<Long> prIds);

    @Query("SELECT DISTINCT pr.costType FROM PurchaseRequest pr WHERE pr.costType IS NOT NULL")
    List<String> findDistinctCostType();

    @Query("SELECT DISTINCT pr.contractType FROM PurchaseRequest pr WHERE pr.contractType IS NOT NULL")
    List<String> findDistinctContractType();
}

