package com.uzproc.backend.controller;

import com.uzproc.backend.dto.PurchasePlanItemDto;
import com.uzproc.backend.service.PurchasePlanItemService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/purchase-plan-items")
public class PurchasePlanItemController {

    private final PurchasePlanItemService purchasePlanItemService;

    public PurchasePlanItemController(PurchasePlanItemService purchasePlanItemService) {
        this.purchasePlanItemService = purchasePlanItemService;
    }

    @GetMapping
    public ResponseEntity<Page<PurchasePlanItemDto>> getAllPurchasePlanItems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) String company,
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) String purchaseSubject) {
        
        Page<PurchasePlanItemDto> items = purchasePlanItemService.findAll(
                page, size, year, sortBy, sortDir, company, cfo, purchaseSubject);
        
        return ResponseEntity.ok(items);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchasePlanItemDto> getPurchasePlanItemById(@PathVariable Long id) {
        PurchasePlanItemDto item = purchasePlanItemService.findById(id);
        if (item != null) {
            return ResponseEntity.ok(item);
        }
        return ResponseEntity.notFound().build();
    }

    @PatchMapping("/{id}/dates")
    public ResponseEntity<PurchasePlanItemDto> updatePurchasePlanItemDates(
            @PathVariable Long id,
            @RequestBody PurchasePlanItemDto dto) {
        PurchasePlanItemDto updatedItem = purchasePlanItemService.updateDates(id, dto.getRequestDate(), dto.getNewContractDate());
        if (updatedItem != null) {
            return ResponseEntity.ok(updatedItem);
        }
        return ResponseEntity.notFound().build();
    }
}

