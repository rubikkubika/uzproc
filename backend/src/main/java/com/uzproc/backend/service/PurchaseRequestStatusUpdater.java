package com.uzproc.backend.service;

import com.uzproc.backend.entity.PurchaseRequestStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/**
 * Вспомогательный сервис для обновления статусов в отдельных транзакциях
 * Необходим для того, чтобы Spring AOP мог создать proxy и выполнить @Transactional
 */
@Service
public class PurchaseRequestStatusUpdater {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Обновляет статус заявки в новой транзакции
     * Каждый вызов этого метода выполняется в отдельной транзакции и немедленно коммитится
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int updateStatusInNewTransaction(Long idPurchaseRequest, PurchaseRequestStatus newStatus) {
        int updated = entityManager.createNativeQuery(
            "UPDATE purchase_requests SET status = :status WHERE id_purchase_request = :id")
            .setParameter("status", newStatus.name())
            .setParameter("id", idPurchaseRequest)
            .executeUpdate();

        // Flush для немедленного применения изменений
        entityManager.flush();

        return updated;
    }
}
