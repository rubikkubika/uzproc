package com.uzproc.backend.repository;

import com.uzproc.backend.entity.PurchasePlanItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PurchasePlanItemRepository extends JpaRepository<PurchasePlanItem, Long>, JpaSpecificationExecutor<PurchasePlanItem> {
    Optional<PurchasePlanItem> findByGuid(UUID guid);
    boolean existsByGuid(UUID guid);
}

