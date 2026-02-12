package com.uzproc.backend.repository.payment;

import com.uzproc.backend.entity.payment.Payment;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {

    /** Поиск существующей оплаты по комментарию для обновления при повторной загрузке Excel */
    Optional<Payment> findFirstByComment(String comment);
}
