package com.uzproc.backend.controller;

import com.uzproc.backend.entity.Purchase;
import com.uzproc.backend.service.PurchaseService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/purchases")
public class PurchaseController {

    private final PurchaseService purchaseService;

    public PurchaseController(PurchaseService purchaseService) {
        this.purchaseService = purchaseService;
    }

    @GetMapping
    public ResponseEntity<Page<Purchase>> getAllPurchases(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) String innerId,
            @RequestParam(required = false) Long purchaseNumber,
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) String purchaseInitiator,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String costType,
            @RequestParam(required = false) String contractType,
            @RequestParam(required = false) Long purchaseRequestId) {
        
        Page<Purchase> purchases = purchaseService.findAll(
                page, size, year, sortBy, sortDir, innerId, purchaseNumber, cfo, purchaseInitiator,
                name, costType, contractType, purchaseRequestId);
        
        return ResponseEntity.ok(purchases);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Purchase> getPurchaseById(@PathVariable Long id) {
        Purchase purchase = purchaseService.findById(id);
        if (purchase != null) {
            return ResponseEntity.ok(purchase);
        }
        return ResponseEntity.notFound().build();
    }
}

