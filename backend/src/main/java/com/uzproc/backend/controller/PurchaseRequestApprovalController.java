package com.uzproc.backend.controller;

import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.entity.PurchaseRequestApproval;
import com.uzproc.backend.service.PurchaseRequestApprovalService;
import com.uzproc.backend.service.PurchaseRequestService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/purchase-request-approvals")
public class PurchaseRequestApprovalController {

    private final PurchaseRequestApprovalService approvalService;
    private final PurchaseRequestService purchaseRequestService;

    public PurchaseRequestApprovalController(
            PurchaseRequestApprovalService approvalService,
            PurchaseRequestService purchaseRequestService) {
        this.approvalService = approvalService;
        this.purchaseRequestService = purchaseRequestService;
    }

    /**
     * Получить все согласования для заявки по id заявки (внутренний id)
     */
    @GetMapping("/by-request-id/{id}")
    public ResponseEntity<List<PurchaseRequestApproval>> getApprovalsByRequestId(@PathVariable Long id) {
        PurchaseRequest purchaseRequest = purchaseRequestService.findById(id);
        if (purchaseRequest == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Получаем согласования по id_purchase_request
        Long idPurchaseRequest = purchaseRequest.getIdPurchaseRequest();
        if (idPurchaseRequest == null) {
            return ResponseEntity.ok(List.of());
        }
        
        List<PurchaseRequestApproval> approvals = approvalService.findByPurchaseRequestId(idPurchaseRequest);
        return ResponseEntity.ok(approvals);
    }

    /**
     * Получить все согласования для заявки по id_purchase_request
     */
    @GetMapping("/by-purchase-request/{idPurchaseRequest}")
    public ResponseEntity<List<PurchaseRequestApproval>> getApprovalsByPurchaseRequestId(
            @PathVariable Long idPurchaseRequest) {
        List<PurchaseRequestApproval> approvals = approvalService.findByPurchaseRequestId(idPurchaseRequest);
        return ResponseEntity.ok(approvals);
    }

    /**
     * Получить согласования для заявки по этапу
     */
    @GetMapping("/by-purchase-request/{idPurchaseRequest}/stage/{stage}")
    public ResponseEntity<List<PurchaseRequestApproval>> getApprovalsByPurchaseRequestIdAndStage(
            @PathVariable Long idPurchaseRequest,
            @PathVariable String stage) {
        List<PurchaseRequestApproval> approvals = approvalService.findByPurchaseRequestIdAndStage(idPurchaseRequest, stage);
        return ResponseEntity.ok(approvals);
    }
}

