package com.uzproc.backend.controller;

import com.uzproc.backend.dto.PurchaseRequestApprovalDto;
import com.uzproc.backend.dto.PurchaseRequestDto;
import com.uzproc.backend.service.purchaserequest.PurchaseRequestApprovalService;
import com.uzproc.backend.service.purchaserequest.PurchaseRequestService;
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
    public ResponseEntity<List<PurchaseRequestApprovalDto>> getApprovalsByRequestId(@PathVariable Long id) {
        PurchaseRequestDto purchaseRequest = purchaseRequestService.findById(id);
        if (purchaseRequest == null) {
            return ResponseEntity.notFound().build();
        }
        
        // Получаем согласования по id_purchase_request
        Long idPurchaseRequest = purchaseRequest.getIdPurchaseRequest();
        if (idPurchaseRequest == null) {
            return ResponseEntity.ok(List.of());
        }
        
        List<PurchaseRequestApprovalDto> approvals = approvalService.findByPurchaseRequestId(idPurchaseRequest);
        return ResponseEntity.ok(approvals);
    }

    /**
     * Получить все согласования для заявки по id_purchase_request
     */
    @GetMapping("/by-purchase-request/{idPurchaseRequest}")
    public ResponseEntity<List<PurchaseRequestApprovalDto>> getApprovalsByPurchaseRequestId(
            @PathVariable Long idPurchaseRequest) {
        List<PurchaseRequestApprovalDto> approvals = approvalService.findByPurchaseRequestId(idPurchaseRequest);
        return ResponseEntity.ok(approvals);
    }

    /**
     * Получить согласования для заявки по этапу
     */
    @GetMapping("/by-purchase-request/{idPurchaseRequest}/stage/{stage}")
    public ResponseEntity<List<PurchaseRequestApprovalDto>> getApprovalsByPurchaseRequestIdAndStage(
            @PathVariable Long idPurchaseRequest,
            @PathVariable String stage) {
        List<PurchaseRequestApprovalDto> approvals = approvalService.findByPurchaseRequestIdAndStage(idPurchaseRequest, stage);
        return ResponseEntity.ok(approvals);
    }
}

