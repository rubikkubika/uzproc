package com.uzproc.backend.service;

import com.uzproc.backend.entity.PurchaseRequestApproval;
import com.uzproc.backend.repository.PurchaseRequestApprovalRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional(readOnly = true)
public class PurchaseRequestApprovalService {

    private final PurchaseRequestApprovalRepository approvalRepository;

    public PurchaseRequestApprovalService(PurchaseRequestApprovalRepository approvalRepository) {
        this.approvalRepository = approvalRepository;
    }

    /**
     * Получить все согласования для заявки по id_purchase_request
     */
    public List<PurchaseRequestApproval> findByPurchaseRequestId(Long idPurchaseRequest) {
        return approvalRepository.findByIdPurchaseRequest(idPurchaseRequest);
    }

    /**
     * Получить согласования для заявки по этапу
     */
    public List<PurchaseRequestApproval> findByPurchaseRequestIdAndStage(Long idPurchaseRequest, String stage) {
        return approvalRepository.findByIdPurchaseRequestAndStage(idPurchaseRequest, stage);
    }
}

