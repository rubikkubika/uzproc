package com.uzproc.backend.repository.purchaseplan;

import com.uzproc.backend.entity.Company;
import com.uzproc.backend.entity.purchaseplan.PurchasePlanItem;
import com.uzproc.backend.entity.purchaseplan.PurchasePlanItemStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
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
    
    // Поиск всех записей по году с загрузкой purchaser (для создания версий)
    @org.springframework.data.jpa.repository.Query("SELECT p FROM PurchasePlanItem p LEFT JOIN FETCH p.purchaser WHERE p.year = :year")
    List<PurchasePlanItem> findByYearWithPurchaser(@org.springframework.data.repository.query.Param("year") Integer year);
    
    // Поиск всех уникальных годов
    @org.springframework.data.jpa.repository.Query("SELECT DISTINCT p.year FROM PurchasePlanItem p WHERE p.year IS NOT NULL ORDER BY p.year DESC")
    List<Integer> findDistinctYears();
    
    // Поиск позиций плана по purchaseRequestId (номер заявки на закупку)
    List<PurchasePlanItem> findByPurchaseRequestId(Long purchaseRequestId);

    // Проверка существования позиции плана по purchaseRequestId
    boolean existsByPurchaseRequestId(Long purchaseRequestId);

    // Получение purchaser_id напрямую из БД (минуя кэш Hibernate)
    @org.springframework.data.jpa.repository.Query(value = "SELECT purchaser_id FROM purchase_plan_items WHERE id = :id", nativeQuery = true)
    Long findPurchaserIdById(@org.springframework.data.repository.query.Param("id") Long id);
    
    // Обновление purchaser_id напрямую через SQL (минуя кэш Hibernate)
    // UPDATE только если purchaser_id отличается от нового значения
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE purchase_plan_items SET purchaser_id = :purchaserId WHERE id = :id AND (purchaser_id IS NULL OR purchaser_id != :purchaserId)", nativeQuery = true)
    int updatePurchaserIdById(@org.springframework.data.repository.query.Param("id") Long id, @org.springframework.data.repository.query.Param("purchaserId") Long purchaserId);
    
    // Очистка purchaser_id (SET NULL) напрямую через SQL (минуя кэш Hibernate)
    // UPDATE только если purchaser_id сейчас не null
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE purchase_plan_items SET purchaser_id = NULL WHERE id = :id AND purchaser_id IS NOT NULL", nativeQuery = true)
    int clearPurchaserIdById(@org.springframework.data.repository.query.Param("id") Long id);

    @Query("SELECT DISTINCT p.company FROM PurchasePlanItem p WHERE p.company IS NOT NULL ORDER BY p.company")
    List<Company> findDistinctCompany();

    @Query("SELECT DISTINCT p.purchaserCompany FROM PurchasePlanItem p WHERE p.purchaserCompany IS NOT NULL ORDER BY p.purchaserCompany")
    List<Company> findDistinctPurchaserCompany();

    @Query("SELECT DISTINCT p.category FROM PurchasePlanItem p WHERE p.category IS NOT NULL ORDER BY p.category")
    List<String> findDistinctCategory();

    @Query("SELECT DISTINCT p.status FROM PurchasePlanItem p WHERE p.status IS NOT NULL ORDER BY p.status")
    List<PurchasePlanItemStatus> findDistinctPlanStatus();

    @Query(value = "SELECT DISTINCT TRIM(COALESCE(u.surname,'') || ' ' || COALESCE(u.name,'')) FROM purchase_plan_items p JOIN users u ON p.purchaser_id = u.id WHERE p.purchaser_id IS NOT NULL ORDER BY 1", nativeQuery = true)
    List<String> findDistinctPurchaserNames();
}

