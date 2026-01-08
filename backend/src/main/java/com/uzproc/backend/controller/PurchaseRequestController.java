package com.uzproc.backend.controller;

import com.uzproc.backend.dto.PurchaseRequestDto;
import com.uzproc.backend.dto.PurchaserStatsDto;
import com.uzproc.backend.service.PurchaseRequestService;
import com.uzproc.backend.service.EntityExcelLoadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    private static final Logger logger = LoggerFactory.getLogger(PurchaseRequestController.class);
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
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) Long idPurchaseRequest,
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) String purchaseRequestInitiator,
            @RequestParam(required = false) List<String> purchaser,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String costType,
            @RequestParam(required = false) String contractType,
            @RequestParam(required = false) Boolean isPlanned,
            @RequestParam(required = false) Boolean requiresPurchase,
            @RequestParam(required = false) List<String> status,
            @RequestParam(required = false, defaultValue = "false") Boolean excludePendingStatuses,
            @RequestParam(required = false) java.math.BigDecimal budgetAmount,
            @RequestParam(required = false) String budgetAmountOperator) {
        
        logger.info("=== PurchaseRequestController.getAllPurchaseRequests ===");
        logger.info("Received budget filter parameters: budgetAmount={}, budgetAmountOperator='{}'", 
                budgetAmount, budgetAmountOperator);
        
        Page<PurchaseRequestDto> purchaseRequests = purchaseRequestService.findAll(
                page, size, year, month, sortBy, sortDir, idPurchaseRequest, cfo, purchaseRequestInitiator, purchaser,
                name, costType, contractType, isPlanned, requiresPurchase, status, excludePendingStatuses,
                budgetAmount, budgetAmountOperator);
        
        logger.info("Returned {} purchase requests", purchaseRequests.getTotalElements());
        logger.info("=== End PurchaseRequestController.getAllPurchaseRequests ===\n");
        
        return ResponseEntity.ok(purchaseRequests);
    }

    @GetMapping("/tab-counts")
    public ResponseEntity<Map<String, Long>> getTabCounts(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Long idPurchaseRequest,
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) String purchaseRequestInitiator,
            @RequestParam(required = false) List<String> purchaser,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String costType,
            @RequestParam(required = false) String contractType,
            @RequestParam(required = false) Boolean isPlanned,
            @RequestParam(required = false) Boolean requiresPurchase,
            @RequestParam(required = false) java.math.BigDecimal budgetAmount,
            @RequestParam(required = false) String budgetAmountOperator) {
        
        Map<String, Long> counts = purchaseRequestService.getTabCounts(
            year, idPurchaseRequest, cfo, purchaseRequestInitiator, purchaser,
            name, costType, contractType, isPlanned, requiresPurchase,
            budgetAmount, budgetAmountOperator);
        
        return ResponseEntity.ok(counts);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseRequestDto> getPurchaseRequestById(@PathVariable Long id) {
        PurchaseRequestDto purchaseRequest = purchaseRequestService.findById(id);
        if (purchaseRequest != null) {
            return ResponseEntity.ok(purchaseRequest);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/by-id-purchase-request/{idPurchaseRequest}")
    public ResponseEntity<PurchaseRequestDto> getPurchaseRequestByIdPurchaseRequest(@PathVariable Long idPurchaseRequest) {
        PurchaseRequestDto purchaseRequest = purchaseRequestService.findByIdPurchaseRequest(idPurchaseRequest);
        if (purchaseRequest != null) {
            return ResponseEntity.ok(purchaseRequest);
        }
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/upload-from-excel")
    public ResponseEntity<Map<String, Object>> uploadFromExcel(@RequestParam("file") MultipartFile file) {
        logger.info("Received file upload request: filename={}, size={}, contentType={}", 
            file.getOriginalFilename(), file.getSize(), file.getContentType());
        
        Map<String, Object> response = excelLoadService.uploadFromExcel(file);
        
        boolean success = (Boolean) response.getOrDefault("success", false);
        logger.info("File upload result: success={}, message={}, loadedCount={}", 
            success, response.get("message"), response.get("loadedCount"));
        
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

    @PatchMapping("/{idPurchaseRequest}/exclude-from-in-work")
    public ResponseEntity<?> updateExcludeFromInWork(
            @PathVariable Long idPurchaseRequest,
            @RequestBody Map<String, Boolean> requestBody) {
        try {
            Boolean excludeFromInWork = requestBody.get("excludeFromInWork");
            if (excludeFromInWork == null) {
                return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Поле excludeFromInWork обязательно"
                ));
            }
            
            PurchaseRequestDto updated = purchaseRequestService.updateExcludeFromInWork(idPurchaseRequest, excludeFromInWork);
            if (updated != null) {
                return ResponseEntity.ok(updated);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error updating excludeFromInWork for purchase request {}", idPurchaseRequest, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "success", false,
                "message", "Ошибка сервера: " + e.getMessage()
            ));
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

    @GetMapping("/stats/purchases-by-purchaser")
    public ResponseEntity<List<PurchaserStatsDto>> getPurchasesStatsByPurchaser(
            @RequestParam(required = false) Integer year) {
        List<PurchaserStatsDto> stats = purchaseRequestService.getPurchasesStatsByPurchaser(year);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/orders-by-purchaser")
    public ResponseEntity<List<PurchaserStatsDto>> getOrdersStatsByPurchaser(
            @RequestParam(required = false) Integer year) {
        List<PurchaserStatsDto> stats = purchaseRequestService.getOrdersStatsByPurchaser(year);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/years")
    public ResponseEntity<List<Integer>> getAvailableYears(
            @RequestParam(required = false, defaultValue = "false") Boolean requiresPurchase) {
        List<Integer> years = purchaseRequestService.getAvailableYears(requiresPurchase);
        return ResponseEntity.ok(years);
    }

    @GetMapping("/monthly-stats")
    public ResponseEntity<Map<String, Object>> getMonthlyStats(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false, defaultValue = "false") Boolean requiresPurchase,
            @RequestParam(required = false, defaultValue = "false") Boolean useCalendarYear) {
        Map<String, Object> stats = purchaseRequestService.getMonthlyStats(year, requiresPurchase, useCalendarYear);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/yearly-stats")
    public ResponseEntity<Map<String, Object>> getYearlyStats() {
        Map<String, Object> stats = purchaseRequestService.getYearlyStats();
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/cfo-stats")
    public ResponseEntity<Map<String, Object>> getCfoStats(
            @RequestParam(required = false) Integer year) {
        Map<String, Object> stats = purchaseRequestService.getCfoStats(year);
        return ResponseEntity.ok(stats);
    }
}

