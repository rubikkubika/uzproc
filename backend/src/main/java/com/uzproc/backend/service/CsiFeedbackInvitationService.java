package com.uzproc.backend.service;

import com.uzproc.backend.entity.CsiFeedbackInvitation;
import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.repository.CsiFeedbackInvitationRepository;
import com.uzproc.backend.repository.PurchaseRequestRepository;
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
     * Создает приглашение для получателя
     */
    @Transactional
    public CsiFeedbackInvitation createInvitation(String csiToken, String recipient) {
        logger.info("Creating invitation for token: {}, recipient: {}", csiToken, recipient);
        
        PurchaseRequest purchaseRequest = purchaseRequestRepository.findByCsiToken(csiToken)
                .orElseThrow(() -> new IllegalArgumentException("Заявка не найдена по CSI токену: " + csiToken));

        // Проверяем, нет ли уже приглашения для этого получателя
        Optional<CsiFeedbackInvitation> existing = invitationRepository
                .findByPurchaseRequestIdAndRecipient(purchaseRequest.getId(), recipient);

        if (existing.isPresent()) {
            logger.info("Invitation already exists for purchase request {} and recipient {}",
                    purchaseRequest.getId(), recipient);

            // Устанавливаем флаг отправки приглашения, если он еще не установлен
            if (purchaseRequest.getCsiInvitationSent() == null || !purchaseRequest.getCsiInvitationSent()) {
                purchaseRequest.setCsiInvitationSent(true);
                purchaseRequestRepository.save(purchaseRequest);
            }

            return existing.get();
        }

        CsiFeedbackInvitation invitation = new CsiFeedbackInvitation(purchaseRequest, recipient);
        CsiFeedbackInvitation saved = invitationRepository.save(invitation);

        // Устанавливаем флаг отправки приглашения
        purchaseRequest.setCsiInvitationSent(true);
        purchaseRequestRepository.save(purchaseRequest);

        logger.info("Invitation created with ID: {} for purchase request ID: {}, recipient: {}",
                saved.getId(), purchaseRequest.getId(), recipient);

        return saved;
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
     * Находит приглашение только по токену (если получатель не указан)
     */
    public Optional<CsiFeedbackInvitation> findByToken(String csiToken) {
        PurchaseRequest purchaseRequest = purchaseRequestRepository.findByCsiToken(csiToken)
                .orElse(null);
        
        if (purchaseRequest == null) {
            return Optional.empty();
        }
        
        // Возвращаем первое приглашение для этой заявки (если есть)
        return invitationRepository.findByPurchaseRequestId(purchaseRequest.getId())
                .stream()
                .findFirst();
    }

    /**
     * Сохраняет приглашение (для использования из других сервисов)
     */
    @Transactional
    public CsiFeedbackInvitation saveInvitation(CsiFeedbackInvitation invitation) {
        return invitationRepository.save(invitation);
    }
}
