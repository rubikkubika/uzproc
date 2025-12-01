package com.uzproc.backend.controller;

import com.uzproc.backend.dto.PurchaseRequestDto;
import com.uzproc.backend.service.PurchaseRequestService;
import com.uzproc.backend.service.EntityExcelLoadService;
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
    private final EntityExcelLoadService excelLoadService;

    public PurchaseRequestController(
            PurchaseRequestService purchaseRequestService,
            EntityExcelLoadService excelLoadService) {
        this.purchaseRequestService = purchaseRequestService;
        this.excelLoadService = excelLoadService;
    }

    @GetMapping
    public ResponseEntity<Page<PurchaseRequestDto>> getAllPurchaseRequests(
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
            @RequestParam(required = false) Boolean requiresPurchase,
            @RequestParam(required = false) List<String> status) {
        
        Page<PurchaseRequestDto> purchaseRequests = purchaseRequestService.findAll(
                page, size, year, sortBy, sortDir, idPurchaseRequest, cfo, purchaseRequestInitiator,
                name, costType, contractType, isPlanned, requiresPurchase, status);
        
        return ResponseEntity.ok(purchaseRequests);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseRequestDto> getPurchaseRequestById(@PathVariable Long id) {
        PurchaseRequestDto purchaseRequest = purchaseRequestService.findById(id);
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

    @PostMapping("/update-status/{idPurchaseRequest}")
    public ResponseEntity<Map<String, Object>> updateStatus(@PathVariable Long idPurchaseRequest) {
        try {
            purchaseRequestService.updateStatusBasedOnApprovals(idPurchaseRequest);
            PurchaseRequestDto purchaseRequest = purchaseRequestService.findByIdPurchaseRequest(idPurchaseRequest);
            if (purchaseRequest != null) {
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "idPurchaseRequest", idPurchaseRequest,
                    "status", purchaseRequest.getStatus() != null ? purchaseRequest.getStatus().getDisplayName() : "null"
                ));
            } else {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                    "success", false,
                    "message", "Заявка с номером " + idPurchaseRequest + " не найдена"
                ));
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Ошибка при обновлении статуса: " + e.getMessage()
            ));
        }
    }
}

