package com.uzproc.backend.repository.payment;

import com.uzproc.backend.entity.payment.Payment;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {

    /**
     * Листинг с предзагрузкой всех @ManyToOne-связей (cfo/purchaseRequest/contract/executor/responsible)
     * одним запросом — устраняет N+1 при конвертации в DTO (PaymentService.toDto читает все эти связи).
     */
    @Override
    @EntityGraph(attributePaths = {"cfo", "purchaseRequest", "contract", "executor", "responsible"})
    Page<Payment> findAll(Specification<Payment> spec, Pageable pageable);

    /** Поиск существующей оплаты по комментарию для обновления при повторной загрузке Excel */
    Optional<Payment> findFirstByComment(String comment);

    /** Поиск существующей оплаты по основному номеру (main_id) для дедупликации при загрузке Excel */
    Optional<Payment> findFirstByMainId(String mainId);

    /** Все оплаты, привязанные к указанному договору */
    java.util.List<Payment> findByContractId(Long contractId);
}
