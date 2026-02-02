package com.uzproc.backend.controller.purchaseplan;

import com.uzproc.backend.dto.purchaseplan.PurchasePlanItemChangeDto;
import com.uzproc.backend.dto.purchaseplan.PurchasePlanItemDto;
import com.uzproc.backend.dto.purchaseplan.UniqueFilterValuesDto;
import com.uzproc.backend.entity.purchaseplan.PurchasePlanItemStatus;
import com.uzproc.backend.service.purchaseplan.PurchasePlanItemChangeService;
import com.uzproc.backend.service.purchaseplan.PurchasePlanItemService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/purchase-plan-items")
public class PurchasePlanItemController {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanItemController.class);
    
    private final PurchasePlanItemService purchasePlanItemService;
    private final PurchasePlanItemChangeService purchasePlanItemChangeService;

    public PurchasePlanItemController(PurchasePlanItemService purchasePlanItemService, PurchasePlanItemChangeService purchasePlanItemChangeService) {
        this.purchasePlanItemService = purchasePlanItemService;
        this.purchasePlanItemChangeService = purchasePlanItemChangeService;
    }

    @GetMapping
    public ResponseEntity<Page<PurchasePlanItemDto>> getAllPurchasePlanItems(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) List<String> company,
            @RequestParam(required = false) List<String> purchaserCompany,
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) String purchaseSubject,
            @RequestParam(required = false) List<String> purchaser,
            @RequestParam(required = false) List<String> category,
            @RequestParam(required = false) List<Integer> requestMonth,
            @RequestParam(required = false) Integer requestYear,
            @RequestParam(required = false) String currentContractEndDate,
            @RequestParam(required = false) List<String> status,
            @RequestParam(required = false) String purchaseRequestId,
            @RequestParam(required = false) Double budgetAmount,
            @RequestParam(required = false) String budgetAmountOperator) {
        
        Page<PurchasePlanItemDto> items = purchasePlanItemService.findAll(
                page, size, year, sortBy, sortDir, company, purchaserCompany, cfo, purchaseSubject, purchaser, category, requestMonth, requestYear, currentContractEndDate, status, purchaseRequestId, budgetAmount, budgetAmountOperator);
        
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
    public ResponseEntity<?> updatePurchasePlanItemDates(
            @PathVariable Long id,
            @RequestBody PurchasePlanItemDto dto) {
        try {
            PurchasePlanItemDto updatedItem = purchasePlanItemService.updateDates(id, dto.getRequestDate(), dto.getNewContractDate());
            if (updatedItem != null) {
                return ResponseEntity.ok(updatedItem);
            }
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/contract-end-date")
    public ResponseEntity<PurchasePlanItemDto> updatePurchasePlanItemContractEndDate(
            @PathVariable Long id,
            @RequestBody PurchasePlanItemDto dto) {
        PurchasePlanItemDto updatedItem = purchasePlanItemService.updateContractEndDate(id, dto.getContractEndDate());
        if (updatedItem != null) {
            return ResponseEntity.ok(updatedItem);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/years")
    public ResponseEntity<List<Integer>> getYears() {
        List<Integer> years = purchasePlanItemService.findDistinctYears();
        return ResponseEntity.ok(years);
    }

    @GetMapping("/unique-values")
    public ResponseEntity<UniqueFilterValuesDto> getUniqueFilterValues() {
        return ResponseEntity.ok(purchasePlanItemService.getUniqueFilterValues());
    }

    @GetMapping("/monthly-stats")
    public ResponseEntity<Map<String, Object>> getMonthlyStats(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) List<String> company) {
        Map<String, Object> stats = purchasePlanItemService.getMonthlyStats(year, company);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/purchaser-summary")
    public ResponseEntity<List<com.uzproc.backend.dto.purchaseplan.PurchaserSummaryDto>> getPurchaserSummary(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) List<String> company,
            @RequestParam(required = false) List<String> purchaserCompany,
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) String purchaseSubject,
            @RequestParam(required = false) List<String> category,
            @RequestParam(required = false) List<Integer> requestMonth,
            @RequestParam(required = false) Integer requestYear,
            @RequestParam(required = false) String currentContractEndDate,
            @RequestParam(required = false) List<String> status,
            @RequestParam(required = false) String purchaseRequestId,
            @RequestParam(required = false) Double budgetAmount,
            @RequestParam(required = false) String budgetAmountOperator) {
        List<com.uzproc.backend.dto.purchaseplan.PurchaserSummaryDto> summary = purchasePlanItemService.getPurchaserSummary(
            year, company, purchaserCompany, cfo, purchaseSubject, category, 
            requestMonth, requestYear, currentContractEndDate, status, 
            purchaseRequestId, budgetAmount, budgetAmountOperator
        );
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/{id}/changes")
    public ResponseEntity<Page<PurchasePlanItemChangeDto>> getChanges(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<PurchasePlanItemChangeDto> changes = purchasePlanItemChangeService.getChangesByItemIdPaginated(id, page, size);
        return ResponseEntity.ok(changes);
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updatePurchasePlanItemStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> requestBody) {
        try {
            String statusStr = requestBody.get("status");
            if (statusStr == null || statusStr.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("Status is required");
            }
            
            // Преобразуем строку в enum
            PurchasePlanItemStatus status;
            try {
                String trimmedStatus = statusStr.trim();
                // Пробуем найти по displayName (точное совпадение с учетом регистра)
                status = null;
                for (PurchasePlanItemStatus s : PurchasePlanItemStatus.values()) {
                    if (s.getDisplayName().equals(trimmedStatus)) {
                        status = s;
                        break;
                    }
                }
                // Если не найдено точное совпадение, пробуем без учета регистра
                if (status == null) {
                    for (PurchasePlanItemStatus s : PurchasePlanItemStatus.values()) {
                        if (s.getDisplayName().equalsIgnoreCase(trimmedStatus)) {
                            status = s;
                            break;
                        }
                    }
                }
                // Если не найдено по displayName, пробуем по имени enum с маппингом старых значений
                if (status == null) {
                    String enumName = trimmedStatus.toUpperCase()
                        .replace(" ", "_")
                        .replace("НЕ_", "NOT_")
                        .replace("АКТУАЛЬНАЯ", "ACTUAL")
                        .replace("В_ПЛАНЕ", "ACTUAL")
                        .replace("ИСКЛЮЧЕНА", "NOT_ACTUAL");
                    status = PurchasePlanItemStatus.valueOf(enumName);
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body("Invalid status: " + statusStr);
            }
            
            PurchasePlanItemDto updatedItem = purchasePlanItemService.updateStatus(id, status);
            if (updatedItem != null) {
                return ResponseEntity.ok(updatedItem);
            }
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    @PatchMapping("/{id}/holding")
    public ResponseEntity<?> updatePurchasePlanItemHolding(
            @PathVariable Long id,
            @RequestBody Map<String, String> requestBody) {
        try {
            String holding = requestBody.get("holding");
            // holding может быть null или пустой строкой
            
            PurchasePlanItemDto updatedItem = purchasePlanItemService.updateHolding(id, holding);
            if (updatedItem != null) {
                return ResponseEntity.ok(updatedItem);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    @GetMapping("/companies")
    public ResponseEntity<List<String>> getCompanies() {
        List<String> companies = Arrays.stream(com.uzproc.backend.entity.Company.values())
                .map(com.uzproc.backend.entity.Company::getDisplayName)
                .collect(Collectors.toList());
        return ResponseEntity.ok(companies);
    }

    @PatchMapping("/{id}/comment")
    public ResponseEntity<?> updatePurchasePlanItemComment(
            @PathVariable Long id,
            @RequestBody Map<String, String> requestBody) {
        try {
            String comment = requestBody.get("comment");
            // comment может быть null или пустой строкой
            
            PurchasePlanItemDto updatedItem = purchasePlanItemService.updateComment(id, comment);
            if (updatedItem != null) {
                return ResponseEntity.ok(updatedItem);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    @PatchMapping("/{id}/company")
    public ResponseEntity<?> updatePurchasePlanItemCompany(
            @PathVariable Long id,
            @RequestBody Map<String, String> requestBody) {
        try {
            String companyStr = requestBody.get("company");
            if (companyStr == null || companyStr.trim().isEmpty()) {
                PurchasePlanItemDto updatedItem = purchasePlanItemService.updateCompany(id, null);
                if (updatedItem != null) {
                    return ResponseEntity.ok(updatedItem);
                }
                return ResponseEntity.notFound().build();
            }

            com.uzproc.backend.entity.Company company;
            try {
                // Пробуем найти по displayName
                company = null;
                for (com.uzproc.backend.entity.Company c : com.uzproc.backend.entity.Company.values()) {
                    if (c.getDisplayName().equalsIgnoreCase(companyStr.trim())) {
                        company = c;
                        break;
                    }
                }
                // Если не найдено по displayName, пробуем по имени enum
                if (company == null) {
                    company = com.uzproc.backend.entity.Company.valueOf(companyStr.toUpperCase().replace(" ", "_"));
                }
            } catch (IllegalArgumentException e) {
                return ResponseEntity.badRequest().body("Invalid company: " + companyStr);
            }

            PurchasePlanItemDto updatedItem = purchasePlanItemService.updateCompany(id, company);
            if (updatedItem != null) {
                return ResponseEntity.ok(updatedItem);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    @PatchMapping("/{id}/purchaser-company")
    public ResponseEntity<?> updatePurchasePlanItemPurchaserCompany(
            @PathVariable Long id,
            @RequestBody Map<String, String> requestBody) {
        try {
            String purchaserCompanyStr = requestBody.get("purchaserCompany");
            // purchaserCompany может быть null или пустой строкой
            
            com.uzproc.backend.entity.Company purchaserCompany = null;
            if (purchaserCompanyStr != null && !purchaserCompanyStr.trim().isEmpty()) {
                // Пробуем найти по displayName
                purchaserCompany = null;
                for (com.uzproc.backend.entity.Company c : com.uzproc.backend.entity.Company.values()) {
                    if (c.getDisplayName().equalsIgnoreCase(purchaserCompanyStr.trim())) {
                        purchaserCompany = c;
                        break;
                    }
                }
                // Если не найдено по displayName, пробуем по имени enum
                if (purchaserCompany == null) {
                    purchaserCompany = com.uzproc.backend.entity.Company.valueOf(purchaserCompanyStr.toUpperCase().replace(" ", "_"));
                }
            }
            
            PurchasePlanItemDto updatedItem = purchasePlanItemService.updatePurchaserCompany(id, purchaserCompany);
            if (updatedItem != null) {
                return ResponseEntity.ok(updatedItem);
            }
            return ResponseEntity.notFound().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body("Invalid purchaserCompany: " + requestBody.get("purchaserCompany"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    @PatchMapping("/{id}/purchase-request-id")
    public ResponseEntity<?> updatePurchasePlanItemPurchaseRequestId(
            @PathVariable Long id,
            @RequestBody Map<String, Object> requestBody) {
        try {
            Object purchaseRequestIdObj = requestBody.get("purchaseRequestId");
            Long purchaseRequestId = null;
            
            if (purchaseRequestIdObj != null) {
                if (purchaseRequestIdObj instanceof Number) {
                    purchaseRequestId = ((Number) purchaseRequestIdObj).longValue();
                } else if (purchaseRequestIdObj instanceof String) {
                    String str = ((String) purchaseRequestIdObj).trim();
                    if (!str.isEmpty() && !str.equalsIgnoreCase("null")) {
                        try {
                            purchaseRequestId = Long.parseLong(str);
                        } catch (NumberFormatException e) {
                            return ResponseEntity.badRequest().body("Invalid purchaseRequestId: " + str);
                        }
                    }
                }
            }
            
            PurchasePlanItemDto updatedItem = purchasePlanItemService.updatePurchaseRequestId(id, purchaseRequestId);
            if (updatedItem != null) {
                return ResponseEntity.ok(updatedItem);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    @PatchMapping("/{id}/purchase-subject")
    public ResponseEntity<?> updatePurchasePlanItemPurchaseSubject(
            @PathVariable Long id,
            @RequestBody Map<String, String> requestBody) {
        try {
            String purchaseSubject = requestBody.get("purchaseSubject");
            // purchaseSubject может быть null или пустой строкой
            
            PurchasePlanItemDto updatedItem = purchasePlanItemService.updatePurchaseSubject(id, purchaseSubject);
            if (updatedItem != null) {
                return ResponseEntity.ok(updatedItem);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    @PatchMapping("/{id}/cfo")
    public ResponseEntity<?> updatePurchasePlanItemCfo(
            @PathVariable Long id,
            @RequestBody Map<String, String> requestBody) {
        try {
            String cfo = requestBody.get("cfo");
            // cfo может быть null или пустой строкой
            
            PurchasePlanItemDto updatedItem = purchasePlanItemService.updateCfo(id, cfo);
            if (updatedItem != null) {
                return ResponseEntity.ok(updatedItem);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    @PatchMapping("/{id}/purchaser")
    public ResponseEntity<?> updatePurchasePlanItemPurchaser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> requestBody) {
        try {
            Object purchaserObj = requestBody.get("purchaser");
            Long purchaserId = null;
            
            if (purchaserObj != null) {
                if (purchaserObj instanceof Number) {
                    purchaserId = ((Number) purchaserObj).longValue();
                } else if (purchaserObj instanceof String) {
                    String str = ((String) purchaserObj).trim();
                    if (!str.isEmpty() && !str.equalsIgnoreCase("null")) {
                        try {
                            purchaserId = Long.parseLong(str);
                        } catch (NumberFormatException e) {
                            return ResponseEntity.badRequest().body("Invalid purchaser ID: " + str);
                        }
                    }
                }
            }
            
            PurchasePlanItemDto updatedItem = purchasePlanItemService.updatePurchaser(id, purchaserId);
            if (updatedItem != null) {
                return ResponseEntity.ok(updatedItem);
            }
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    // Метод getPurchasers удален - фронтенд может получать список пользователей через /users endpoint

    @PostMapping
    public ResponseEntity<?> createPurchasePlanItem(@RequestBody PurchasePlanItemDto dto) {
        try {
            PurchasePlanItemDto createdItem = purchasePlanItemService.create(dto);
            return ResponseEntity.status(201).body(createdItem);
        } catch (Exception e) {
            logger.error("Error creating purchase plan item", e);
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }
}


