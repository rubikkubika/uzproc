package com.uzproc.backend.repository;

import com.uzproc.backend.entity.CsiFeedbackInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CsiFeedbackInvitationRepository extends JpaRepository<CsiFeedbackInvitation, Long> {
    List<CsiFeedbackInvitation> findByPurchaseRequestId(Long purchaseRequestId);
    Optional<CsiFeedbackInvitation> findByPurchaseRequestIdAndRecipient(Long purchaseRequestId, String recipient);
}
