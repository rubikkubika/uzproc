package com.uzproc.backend.repository;

import com.uzproc.backend.entity.CsiFeedback;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CsiFeedbackRepository extends JpaRepository<CsiFeedback, Long>, JpaSpecificationExecutor<CsiFeedback> {

    List<CsiFeedback> findByPurchaseRequestId(Long purchaseRequestId);

    Page<CsiFeedback> findByPurchaseRequestId(Long purchaseRequestId, Pageable pageable);
}
