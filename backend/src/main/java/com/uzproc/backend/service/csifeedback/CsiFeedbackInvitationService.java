package com.uzproc.backend.service.csifeedback;

import com.uzproc.backend.entity.csifeedback.CsiFeedbackInvitation;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.repository.csifeedback.CsiFeedbackInvitationRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class CsiFeedbackInvitationService {

    private static final Logger logger = LoggerFactory.getLogger(CsiFeedbackInvitationService.class);

    private final CsiFeedbackInvitationRepository invitationRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;

    public CsiFeedbackInvitationService(
            CsiFeedbackInvitationRepository invitationRepository,
            PurchaseRequestRepository purchaseRequestRepository) {
        this.invitationRepository = invitationRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
    }

    /**
     * Создаёт или обновляет приглашение для получателя.
     * Для заявки хранится одно приглашение: при смене получателя обновляется существующее, второе не создаётся.
     */
    @Transactional
    public CsiFeedbackInvitation createInvitation(String csiToken, String recipient) {
        logger.info("Creating or updating invitation for token: {}, recipient: {}", csiToken, recipient);

        PurchaseRequest purchaseRequest = purchaseRequestRepository.findByCsiToken(csiToken)
                .orElseThrow(() -> new IllegalArgumentException("Заявка не найдена по CSI токену: " + csiToken));

        Long requestId = purchaseRequest.getId();

        // Уже есть приглашение с этим получателем — ничего не меняем
        Optional<CsiFeedbackInvitation> existingSameRecipient = invitationRepository
                .findByPurchaseRequestIdAndRecipient(requestId, recipient);
        if (existingSameRecipient.isPresent()) {
            logger.info("Invitation already exists for purchase request {} and recipient {}",
                    requestId, recipient);
            ensureCsiInvitationSentFlag(purchaseRequest);
            return existingSameRecipient.get();
        }

        // Есть приглашение с другим получателем — обновляем получателя (не создаём второе)
        Optional<CsiFeedbackInvitation> existingAny = invitationRepository
                .findFirstByPurchaseRequestIdOrderByIdDesc(requestId);
        if (existingAny.isPresent()) {
            CsiFeedbackInvitation invitation = existingAny.get();
            invitation.setRecipient(recipient);
            CsiFeedbackInvitation saved = invitationRepository.save(invitation);
            logger.info("Updated invitation ID: {} for purchase request {} to recipient: {}",
                    saved.getId(), requestId, recipient);
            ensureCsiInvitationSentFlag(purchaseRequest);
            return saved;
        }

        // Приглашений нет — создаём первое
        CsiFeedbackInvitation invitation = new CsiFeedbackInvitation(purchaseRequest, recipient);
        CsiFeedbackInvitation saved = invitationRepository.save(invitation);
        logger.info("Invitation created with ID: {} for purchase request ID: {}, recipient: {}",
                saved.getId(), requestId, recipient);
        ensureCsiInvitationSentFlag(purchaseRequest);
        return saved;
    }

    private void ensureCsiInvitationSentFlag(PurchaseRequest purchaseRequest) {
        if (purchaseRequest.getCsiInvitationSent() == null || !purchaseRequest.getCsiInvitationSent()) {
            purchaseRequest.setCsiInvitationSent(true);
            purchaseRequestRepository.save(purchaseRequest);
        }
    }

    /**
     * Находит приглашение по токену и получателю
     */
    public Optional<CsiFeedbackInvitation> findByTokenAndRecipient(String csiToken, String recipient) {
        PurchaseRequest purchaseRequest = purchaseRequestRepository.findByCsiToken(csiToken)
                .orElse(null);
        
        if (purchaseRequest == null) {
            return Optional.empty();
        }
        
        return invitationRepository.findByPurchaseRequestIdAndRecipient(
                purchaseRequest.getId(), recipient);
    }

    /**
     * Находит приглашение только по токену (если получатель не указан).
     * Возвращает последнее приглашение по id (последняя вставленная запись), чтобы при смене получателя отображался сохранённый получатель.
     */
    public Optional<CsiFeedbackInvitation> findByToken(String csiToken) {
        PurchaseRequest purchaseRequest = purchaseRequestRepository.findByCsiToken(csiToken)
                .orElse(null);
        
        if (purchaseRequest == null) {
            return Optional.empty();
        }
        
        return invitationRepository.findFirstByPurchaseRequestIdOrderByIdDesc(purchaseRequest.getId());
    }

    /**
     * Сохраняет приглашение (для использования из других сервисов)
     */
    @Transactional
    public CsiFeedbackInvitation saveInvitation(CsiFeedbackInvitation invitation) {
        return invitationRepository.save(invitation);
    }
}
