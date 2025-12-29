package com.uzproc.backend.repository;

import com.uzproc.backend.entity.PurchasePlanItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PurchasePlanItemRepository extends JpaRepository<PurchasePlanItem, Long>, JpaSpecificationExecutor<PurchasePlanItem> {
    Optional<PurchasePlanItem> findByGuid(UUID guid);
    boolean existsByGuid(UUID guid);
    
    // Поиск по purchase_subject без учета регистра (для соответствия уникальному индексу)
    @org.springframework.data.jpa.repository.Query("SELECT p FROM PurchasePlanItem p WHERE LOWER(p.purchaseSubject) = LOWER(:purchaseSubject)")
    Optional<PurchasePlanItem> findByPurchaseSubjectIgnoreCase(@org.springframework.data.repository.query.Param("purchaseSubject") String purchaseSubject);
    
    // Поиск всех записей по году
    List<PurchasePlanItem> findByYear(Integer year);
    
    // Поиск всех уникальных годов
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT p.year FROM PurchasePlanItem p WHERE p.year IS NOT NULL ORDER BY p.year DESC")
    List<Integer> findDistinctYears();
}

