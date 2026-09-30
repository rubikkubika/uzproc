package com.uzproc.backend.repository.sendingcenter;

import com.uzproc.backend.entity.purchase.Purchase;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestStatus;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * Заявки без сложности для Центра отправки (раздел «Закупки» → «Ошибка сложности»).
 * Сложность хранится в заявке ({@code purchase_requests.complexity}); закупка связана с заявкой
 * по {@code purchases.purchase_request_id = purchase_requests.id_purchase_request} и может отсутствовать.
 */
public interface ComplexityErrorRequestRepository extends Repository<PurchaseRequest, Long> {

    /**
     * Заявки, созданные в интервале [start, end), требующие закупки, без сложности,
     * со статусом — любым, кроме пустого и исключённого (Проект).
     */
    @Query("SELECT pr FROM PurchaseRequest pr "
            + "LEFT JOIN FETCH pr.cfo "
            + "WHERE pr.purchaseRequestCreationDate >= :start AND pr.purchaseRequestCreationDate < :end "
            + "AND pr.requiresPurchase = true "
            + "AND (pr.complexity IS NULL OR TRIM(pr.complexity) = '') "
            + "AND pr.status IS NOT NULL AND pr.status <> :excludedStatus "
            + "ORDER BY pr.purchaseRequestCreationDate ASC")
    List<PurchaseRequest> findWithoutComplexity(@Param("start") LocalDateTime start,
                                                @Param("end") LocalDateTime end,
                                                @Param("excludedStatus") PurchaseRequestStatus excludedStatus);

    /** Закупки по номерам заявок ({@code purchases.purchase_request_id} = {@code id_purchase_request}). */
    @Query("SELECT p FROM Purchase p WHERE p.purchaseRequestId IN :requestNumbers ORDER BY p.id ASC")
    List<Purchase> findPurchasesByRequestNumbers(@Param("requestNumbers") Collection<Long> requestNumbers);
}
