package com.uzproc.backend.controller;

import com.uzproc.backend.dto.PurchaseApprovalDto;
import com.uzproc.backend.service.purchase.PurchaseApprovalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/purchase-approvals")
public class PurchaseApprovalController {

    private final PurchaseApprovalService approvalService;

    public PurchaseApprovalController(PurchaseApprovalService approvalService) {
        this.approvalService = approvalService;
    }

    /**
     * Получить все согласования для закупки по purchaseRequestId
     */
    @GetMapping("/by-purchase-request/{purchaseRequestId}")
    public ResponseEntity<List<PurchaseApprovalDto>> getApprovalsByPurchaseRequestId(
            @PathVariable Long purchaseRequestId) {
        List<PurchaseApprovalDto> approvals = approvalService.findByPurchaseRequestId(purchaseRequestId);
        return ResponseEntity.ok(approvals);
    }

    /**
     * Получить согласования для закупки по этапу
     */
    @GetMapping("/by-purchase-request/{purchaseRequestId}/stage/{stage}")
    public ResponseEntity<List<PurchaseApprovalDto>> getApprovalsByPurchaseRequestIdAndStage(
            @PathVariable Long purchaseRequestId,
            @PathVariable String stage) {
        List<PurchaseApprovalDto> approvals = approvalService.findByPurchaseRequestIdAndStage(purchaseRequestId, stage);
        return ResponseEntity.ok(approvals);
    }
}





