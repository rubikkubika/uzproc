package com.uzproc.backend.controller.purchase;

import com.uzproc.backend.dto.purchase.PurchaseDto;
import com.uzproc.backend.service.purchase.CompetitiveSheetService;
import com.uzproc.backend.service.purchase.PurchaseService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/purchases")
public class PurchaseController {

    private final PurchaseService purchaseService;
    private final CompetitiveSheetService competitiveSheetService;

    public PurchaseController(PurchaseService purchaseService, CompetitiveSheetService competitiveSheetService) {
        this.purchaseService = purchaseService;
        this.competitiveSheetService = competitiveSheetService;
    }

    @GetMapping
    public ResponseEntity<Page<PurchaseDto>> getAllPurchases(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) String innerId,
            @RequestParam(required = false) Long purchaseNumber,
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) String purchaseInitiator,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String costType,
            @RequestParam(required = false) String contractType,
            @RequestParam(required = false) Long purchaseRequestId,
            @RequestParam(required = false) List<String> purchaser,
            @RequestParam(required = false) List<String> status,
            @RequestParam(required = false) java.math.BigDecimal budgetAmount,
            @RequestParam(required = false) String budgetAmountOperator,
            @RequestParam(required = false) String purchaseMethod) {

        System.out.println("=== PurchaseController.getAllPurchases ===");
        System.out.println("Received budget filter parameters: budgetAmount=" + budgetAmount + ", budgetAmountOperator='" + budgetAmountOperator + "'");

        Page<PurchaseDto> purchases = purchaseService.findAll(
                page, size, year, month, sortBy, sortDir, innerId, purchaseNumber, cfo, purchaseInitiator,
                name, costType, contractType, purchaseRequestId, purchaser, status,
                budgetAmount, budgetAmountOperator, purchaseMethod);
        
        System.out.println("Returned " + purchases.getTotalElements() + " purchases");
        System.out.println("=== End PurchaseController.getAllPurchases ===\n");
        
        return ResponseEntity.ok(purchases);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseDto> getPurchaseById(@PathVariable Long id) {
        PurchaseDto purchase = purchaseService.findById(id);
        if (purchase != null) {
            return ResponseEntity.ok(purchase);
        }
        return ResponseEntity.notFound().build();
    }

    @PatchMapping("/{id}/savings-type")
    public ResponseEntity<PurchaseDto> updateSavingsType(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String savingsType = body.get("savingsType");
        PurchaseDto updated = purchaseService.updateSavingsType(id, savingsType);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    /** Загрузить конкурентный лист (Excel) для закупки */
    @PostMapping("/{id}/competitive-sheet")
    public ResponseEntity<PurchaseDto> uploadCompetitiveSheet(
            @PathVariable Long id,
            @RequestParam("file") MultipartFile file) {
        try {
            PurchaseDto updated = competitiveSheetService.uploadCompetitiveSheet(id, file);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNPROCESSABLE_ENTITY).build();
        }
    }

    /** Удалить конкурентный лист у закупки */
    @DeleteMapping("/{id}/competitive-sheet")
    public ResponseEntity<PurchaseDto> deleteCompetitiveSheet(@PathVariable Long id) {
        try {
            PurchaseDto updated = competitiveSheetService.deleteCompetitiveSheet(id);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/monthly-stats")
    public ResponseEntity<Map<String, Object>> getMonthlyStats(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false, defaultValue = "false") Boolean useCalendarYear) {
        Map<String, Object> stats = purchaseService.getMonthlyStats(year, useCalendarYear);
        return ResponseEntity.ok(stats);
    }
}

