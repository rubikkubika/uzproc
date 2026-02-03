package com.uzproc.backend.repository;

import com.uzproc.backend.entity.Cfo;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CfoRepository extends JpaRepository<Cfo, Long> {

    /**
     * Находит ЦФО по названию (регистронезависимо)
     */
    Optional<Cfo> findByNameIgnoreCase(String name);

    /**
     * Проверяет существование ЦФО по названию (регистронезависимо)
     */
    boolean existsByNameIgnoreCase(String name);

    /**
     * Названия ЦФО, встречающиеся в позициях плана закупок (для фильтра на странице плана закупок).
     */
    @Query("SELECT DISTINCT p.cfo.name FROM com.uzproc.backend.entity.purchaseplan.PurchasePlanItem p WHERE p.cfo IS NOT NULL AND p.cfo.name IS NOT NULL ORDER BY p.cfo.name")
    List<String> findNamesUsedInPurchasePlanItems();

    /**
     * Названия ЦФО, встречающиеся в заявках на закупку (для фильтра на странице заявок).
     */
    @Query("SELECT DISTINCT pr.cfo.name FROM com.uzproc.backend.entity.purchaserequest.PurchaseRequest pr WHERE pr.cfo IS NOT NULL AND pr.cfo.name IS NOT NULL ORDER BY pr.cfo.name")
    List<String> findNamesUsedInPurchaseRequests();

    /**
     * Названия ЦФО, встречающиеся в договорах (для фильтра на странице договоров).
     */
    @Query("SELECT DISTINCT c.cfo.name FROM com.uzproc.backend.entity.contract.Contract c WHERE c.cfo IS NOT NULL AND c.cfo.name IS NOT NULL ORDER BY c.cfo.name")
    List<String> findNamesUsedInContracts();

    /**
     * Названия ЦФО, встречающиеся в закупках (для фильтра на странице закупок).
     */
    @Query("SELECT DISTINCT p.cfo.name FROM com.uzproc.backend.entity.purchase.Purchase p WHERE p.cfo IS NOT NULL AND p.cfo.name IS NOT NULL ORDER BY p.cfo.name")
    List<String> findNamesUsedInPurchases();
}

