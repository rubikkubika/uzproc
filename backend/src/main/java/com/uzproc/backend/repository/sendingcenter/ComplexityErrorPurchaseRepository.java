package com.uzproc.backend.repository.sendingcenter;

import com.uzproc.backend.entity.purchase.Purchase;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Закупки без сложности для Центра отправки (раздел «Закупки» → «Ошибка сложности»).
 * Сложность хранится в заявке ({@code purchase_requests.complexity}); закупка связана с заявкой
 * по {@code purchases.purchase_request_id = purchase_requests.id_purchase_request}.
 */
public interface ComplexityErrorPurchaseRepository extends Repository<Purchase, Long> {

    /**
     * Закупки, созданные в интервале [start, end), у заявки которых не заполнена сложность
     * (или заявки нет вовсе).
     */
    @Query("SELECT p FROM Purchase p "
            + "LEFT JOIN FETCH p.purchaseRequest pr "
            + "LEFT JOIN FETCH pr.cfo "
            + "LEFT JOIN FETCH p.cfo "
            + "WHERE p.purchaseCreationDate >= :start AND p.purchaseCreationDate < :end "
            + "AND (pr IS NULL OR pr.complexity IS NULL OR TRIM(pr.complexity) = '') "
            + "ORDER BY p.purchaseCreationDate ASC")
    List<Purchase> findWithoutComplexity(@Param("start") LocalDateTime start,
                                         @Param("end") LocalDateTime end);
}
