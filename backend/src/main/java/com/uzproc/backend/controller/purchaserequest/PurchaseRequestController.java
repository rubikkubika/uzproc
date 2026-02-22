package com.uzproc.backend.controller.purchaserequest;

import com.uzproc.backend.dto.purchaserequest.PurchaseRequestCommentDto;
import com.uzproc.backend.dto.purchaserequest.PurchaseRequestDto;
import com.uzproc.backend.dto.purchaserequest.PurchaseRequestUniqueValuesDto;
import com.uzproc.backend.dto.purchaserequest.PurchaserStatsDto;
import com.uzproc.backend.dto.purchaserequest.PurchaserSummaryItemDto;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequestCommentType;
import com.uzproc.backend.service.purchaserequest.PurchaseRequestCommentService;
import com.uzproc.backend.service.purchaserequest.PurchaseRequestService;
import com.uzproc.backend.service.excel.EntityExcelLoadService;
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
    private final PurchaseRequestCommentService purchaseRequestCommentService;

    public PurchaseRequestController(
            PurchaseRequestService purchaseRequestService,
            EntityExcelLoadService excelLoadService,
            PurchaseRequestCommentService purchaseRequestCommentService) {
        this.purchaseRequestService = purchaseRequestService;
        this.excelLoadService = excelLoadService;
        this.purchaseRequestCommentService = purchaseRequestCommentService;
    }

    /**
     * Список годов по дате создания заявки (только те, для которых есть записи в БД).
     * Используется для фильтра «Дата создания» на фронтенде.
     */
    @GetMapping("/creation-date-years")
    public ResponseEntity<List<Integer>> getCreationDateYears() {
        List<Integer> years = purchaseRequestService.getCreationDateYears();
        return ResponseEntity.ok(years);
    }

    /**
     * Список годов по дате назначения на утверждение (assignment_date в этапе «Утверждение заявки на ЗП»).
     * Используется для фильтра «Дата назначения на закупщика» на фронтенде.
     */
    @GetMapping("/approval-assignment-date-years")
    public ResponseEntity<List<Integer>> getApprovalAssignmentDateYears() {
        List<Integer> years = purchaseRequestService.getApprovalAssignmentDateYears();
        return ResponseEntity.ok(years);
    }

    /**
     * Уникальные значения полей заявок для фильтров (лёгкий эндпоинт без загрузки полных записей).
     * ЦФО загружаются отдельно из /api/cfos/names.
     */
    @GetMapping("/unique-values")
    public ResponseEntity<PurchaseRequestUniqueValuesDto> getUniqueFilterValues() {
        return ResponseEntity.ok(purchaseRequestService.getUniqueFilterValues());
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
            @RequestParam(required = false) Boolean hasLinkedPlanItem,
            @RequestParam(required = false) String complexity,
            @RequestParam(required = false) Boolean requiresPurchase,
            @RequestParam(required = false) List<String> statusGroup,
            @RequestParam(required = false, defaultValue = "false") Boolean excludePendingStatuses,
            @RequestParam(required = false) java.math.BigDecimal budgetAmount,
            @RequestParam(required = false) String budgetAmountOperator,
            @RequestParam(required = false) Boolean excludeFromInWork,
            @RequestParam(required = false) Integer approvalAssignmentYear,
            @RequestParam(required = false) Integer approvalAssignmentMonth) {
        
        logger.info("=== PurchaseRequestController.getAllPurchaseRequests ===");
        logger.info("Received budget filter parameters: budgetAmount={}, budgetAmountOperator='{}'", 
                budgetAmount, budgetAmountOperator);
        logger.info("Received excludeFromInWork parameter: {}", excludeFromInWork);
        logger.info("Received approvalAssignmentYear parameter: {}, approvalAssignmentMonth: {}", approvalAssignmentYear, approvalAssignmentMonth);
        
        Page<PurchaseRequestDto> purchaseRequests = purchaseRequestService.findAll(
                page, size, year, month, sortBy, sortDir, idPurchaseRequest, cfo, purchaseRequestInitiator, purchaser,
                name, costType, contractType, isPlanned, hasLinkedPlanItem, complexity, requiresPurchase, statusGroup, excludePendingStatuses,
                budgetAmount, budgetAmountOperator, excludeFromInWork, approvalAssignmentYear, approvalAssignmentMonth);
        
        logger.info("Returned {} purchase requests", purchaseRequests.getTotalElements());
        logger.info("=== End PurchaseRequestController.getAllPurchaseRequests ===\n");
        
        return ResponseEntity.ok(purchaseRequests);
    }

    /**
     * Сводка по закупщикам для заявок «в работе» (без загрузки полных записей).
     * Используется блоком «Сводка по закупщикам» на странице заявок.
     */
    @GetMapping("/in-work-summary")
    public ResponseEntity<List<PurchaserSummaryItemDto>> getInWorkPurchaserSummary(
            @RequestParam(required = false) Long idPurchaseRequest,
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String costType,
            @RequestParam(required = false) String contractType,
            @RequestParam(required = false) Boolean isPlanned,
            @RequestParam(required = false) Boolean hasLinkedPlanItem,
            @RequestParam(required = false) String complexity,
            @RequestParam(required = false) Boolean requiresPurchase,
            @RequestParam(required = false) java.math.BigDecimal budgetAmount,
            @RequestParam(required = false) String budgetAmountOperator) {
        List<PurchaserSummaryItemDto> summary = purchaseRequestService.getInWorkPurchaserSummary(
            idPurchaseRequest, cfo, name, costType, contractType, isPlanned, hasLinkedPlanItem,
            complexity, requiresPurchase, budgetAmount, budgetAmountOperator);
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/tab-counts")
    public ResponseEntity<Map<String, Long>> getTabCounts(
            @RequestParam(required = false) Integer approvalAssignmentYear,
            @RequestParam(required = false) Integer approvalAssignmentMonth,
            @RequestParam(required = false) Long idPurchaseRequest,
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) String purchaseRequestInitiator,
            @RequestParam(required = false) List<String> purchaser,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String costType,
            @RequestParam(required = false) String contractType,
            @RequestParam(required = false) Boolean isPlanned,
            @RequestParam(required = false) Boolean hasLinkedPlanItem,
            @RequestParam(required = false) String complexity,
            @RequestParam(required = false) Boolean requiresPurchase,
            @RequestParam(required = false) java.math.BigDecimal budgetAmount,
            @RequestParam(required = false) String budgetAmountOperator) {

        Map<String, Long> counts = purchaseRequestService.getTabCounts(
            approvalAssignmentYear, approvalAssignmentMonth, idPurchaseRequest, cfo, purchaseRequestInitiator, purchaser,
            name, costType, contractType, isPlanned, hasLinkedPlanItem, complexity, requiresPurchase,
            budgetAmount, budgetAmountOperator);
        
        return ResponseEntity.ok(counts);
    }

    @GetMapping("/comment-counts")
    public ResponseEntity<Map<Long, Long>> getCommentCounts(@RequestParam("ids") List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return ResponseEntity.ok(Map.of());
        }
        Map<Long, Long> counts = purchaseRequestCommentService.getCommentCountByPurchaseRequestIds(ids);
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

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<PurchaseRequestCommentDto>> getPurchaseRequestComments(
            @PathVariable Long id,
            @RequestParam(required = false) PurchaseRequestCommentType type) {
        List<PurchaseRequestCommentDto> comments = purchaseRequestCommentService.getCommentsByPurchaseRequestIdAndType(id, type);
        return ResponseEntity.ok(comments);
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<PurchaseRequestCommentDto> createPurchaseRequestComment(
            @PathVariable Long id,
            @RequestBody com.uzproc.backend.dto.purchaserequest.CreatePurchaseRequestCommentRequest request) {
        if (request == null || request.getType() == null || request.getText() == null || request.getText().trim().isEmpty()) {
            return ResponseEntity.badRequest().build();
        }
        PurchaseRequestCommentDto created = purchaseRequestCommentService.createComment(
                id, request.getType(), request.getText(), request.getCreatedByUserId());
        if (created == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping("/by-id-purchase-request/{idPurchaseRequest}")
    public ResponseEntity<PurchaseRequestDto> getPurchaseRequestByIdPurchaseRequest(@PathVariable Long idPurchaseRequest) {
        PurchaseRequestDto purchaseRequest = purchaseRequestService.findByIdPurchaseRequest(idPurchaseRequest);
        if (purchaseRequest != null) {
            return ResponseEntity.ok(purchaseRequest);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/by-id-purchase-request/{idPurchaseRequest}/comments")
    public ResponseEntity<List<PurchaseRequestCommentDto>> getPurchaseRequestCommentsByIdPurchaseRequest(
            @PathVariable Long idPurchaseRequest,
            @RequestParam(required = false) PurchaseRequestCommentType type) {
        List<PurchaseRequestCommentDto> comments = purchaseRequestCommentService.getCommentsByIdPurchaseRequest(idPurchaseRequest, type);
        return ResponseEntity.ok(comments);
    }

    /**
     * Получить несколько заявок по списку idPurchaseRequest одним запросом
     * @param idPurchaseRequestList список idPurchaseRequest (через запятую или как массив)
     * @return Map где ключ - idPurchaseRequest, значение - PurchaseRequestDto
     */
    @GetMapping("/by-id-purchase-request-list")
    public ResponseEntity<Map<Long, PurchaseRequestDto>> getPurchaseRequestsByIdPurchaseRequestList(
            @RequestParam List<Long> idPurchaseRequest) {
        Map<Long, PurchaseRequestDto> purchaseRequests = purchaseRequestService.findByIdPurchaseRequestList(idPurchaseRequest);
        return ResponseEntity.ok(purchaseRequests);
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
            @RequestBody Map<String, Boolean> requestBody,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        try {
            // Проверяем, что пользователь является администратором
            if (userRole == null || !"admin".equalsIgnoreCase(userRole.trim())) {
                logger.warn("Attempt to update excludeFromInWork by non-admin user. Role: {}", userRole);
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                    "success", false,
                    "message", "Только администратор может изменять видимость заявки в работе"
                ));
            }
            
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

    @PatchMapping("/{idPurchaseRequest}/purchaser")
    public ResponseEntity<?> updatePurchaser(
            @PathVariable Long idPurchaseRequest,
            @RequestBody Map<String, String> requestBody) {
        try {
            String purchaser = requestBody.get("purchaser");
            // purchaser может быть null или пустой строкой (для очистки поля)
            
            PurchaseRequestDto updated = purchaseRequestService.updatePurchaser(idPurchaseRequest, purchaser);
            if (updated != null) {
                return ResponseEntity.ok(updated);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error updating purchaser for purchase request {}", idPurchaseRequest, e);
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

