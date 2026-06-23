package com.uzproc.backend.repository.csifeedback;

import com.uzproc.backend.entity.csifeedback.CsiFeedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CsiFeedbackRepository extends JpaRepository<CsiFeedback, Long>, JpaSpecificationExecutor<CsiFeedback> {

    /**
     * Листинг с предзагрузкой purchaseRequest и его cfo — устраняет N+1 в CsiFeedbackService.toDto,
     * который читает getPurchaseRequest() и getPurchaseRequest().getCfo().
     */
    @Override
    @EntityGraph(attributePaths = {"purchaseRequest", "purchaseRequest.cfo"})
    Page<CsiFeedback> findAll(Specification<CsiFeedback> spec, Pageable pageable);

    /**
     * Выборка для агрегатов (stats) с предзагрузкой purchaseRequest+cfo — устраняет N+1
     * при доступе к purchaser/cfo на каждую строку в getStatsBy*.
     */
    @Override
    @EntityGraph(attributePaths = {"purchaseRequest", "purchaseRequest.cfo"})
    List<CsiFeedback> findAll(Specification<CsiFeedback> spec);

    List<CsiFeedback> findByPurchaseRequestId(Long purchaseRequestId);

    Page<CsiFeedback> findByPurchaseRequestId(Long purchaseRequestId, Pageable pageable);

    List<CsiFeedback> findByPurchaseRequest_IdIn(List<Long> technicalIds);
}
