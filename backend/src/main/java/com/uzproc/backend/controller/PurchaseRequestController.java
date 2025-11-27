package com.uzproc.backend.controller;

import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.service.PurchaseRequestService;
import com.uzproc.backend.service.ExcelLoadService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/purchase-requests")
public class PurchaseRequestController {

    private final PurchaseRequestService purchaseRequestService;
    private final ExcelLoadService excelLoadService;

    public PurchaseRequestController(
            PurchaseRequestService purchaseRequestService,
            ExcelLoadService excelLoadService) {
        this.purchaseRequestService = purchaseRequestService;
        this.excelLoadService = excelLoadService;
    }

    @GetMapping
    public ResponseEntity<Page<PurchaseRequest>> getAllPurchaseRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) Long idPurchaseRequest,
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) String purchaseRequestInitiator,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String costType,
            @RequestParam(required = false) String contractType,
            @RequestParam(required = false) Boolean isPlanned,
            @RequestParam(required = false) Boolean requiresPurchase) {
        
        Page<PurchaseRequest> purchaseRequests = purchaseRequestService.findAll(
                page, size, year, sortBy, sortDir, idPurchaseRequest, cfo, purchaseRequestInitiator,
                name, costType, contractType, isPlanned, requiresPurchase);
        
        return ResponseEntity.ok(purchaseRequests);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseRequest> getPurchaseRequestById(@PathVariable Long id) {
        PurchaseRequest purchaseRequest = purchaseRequestService.findById(id);
        if (purchaseRequest != null) {
            return ResponseEntity.ok(purchaseRequest);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/upload-from-excel")
    public ResponseEntity<Map<String, Object>> uploadFromExcel(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = excelLoadService.uploadFromExcel(file);
        
        boolean success = (Boolean) response.getOrDefault("success", false);
        if (success) {
            return ResponseEntity.ok(response);
        } else {
            // Проверяем, была ли это ошибка валидации (400) или серверная ошибка (500)
            String message = (String) response.get("message");
            if (message != null && (message.contains("не предоставлен") || message.contains("формате Excel"))) {
                return ResponseEntity.badRequest().body(response);
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
}

