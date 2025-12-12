package com.uzproc.backend.controller;

import com.uzproc.backend.dto.PurchasePlanItemChangeDto;
import com.uzproc.backend.dto.PurchasePlanItemDto;
import com.uzproc.backend.service.PurchasePlanItemChangeService;
import com.uzproc.backend.service.PurchasePlanItemService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/purchase-plan-items")
public class PurchasePlanItemController {

    private final PurchasePlanItemService purchasePlanItemService;
    private final PurchasePlanItemChangeService purchasePlanItemChangeService;
    
    @Value("${plan.edit.password:1988}")
    private String editPassword;

    public PurchasePlanItemController(
            PurchasePlanItemService purchasePlanItemService,
            PurchasePlanItemChangeService purchasePlanItemChangeService) {
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
            @RequestParam(required = false) String company,
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) String purchaseSubject,
            @RequestParam(required = false) List<String> purchaser,
            @RequestParam(required = false) List<String> category,
            @RequestParam(required = false) Integer requestMonth,
            @RequestParam(required = false) Integer requestYear,
            @RequestParam(required = false) String currentContractEndDate) {
        
        Page<PurchasePlanItemDto> items = purchasePlanItemService.findAll(
                page, size, year, sortBy, sortDir, company, cfo, purchaseSubject, purchaser, category, requestMonth, requestYear, currentContractEndDate);
        
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
            @RequestBody Map<String, Object> requestBody) {
        try {
            // Проверяем пароль
            String password = (String) requestBody.get("password");
            if (password == null || !password.equals(editPassword)) {
                return ResponseEntity.status(401).body("Неверный пароль");
            }
            
            PurchasePlanItemDto dto = new PurchasePlanItemDto();
            if (requestBody.get("requestDate") != null) {
                dto.setRequestDate(java.time.LocalDate.parse((String) requestBody.get("requestDate")));
            }
            if (requestBody.get("newContractDate") != null) {
                dto.setNewContractDate(java.time.LocalDate.parse((String) requestBody.get("newContractDate")));
            }
            
            PurchasePlanItemDto updatedItem = purchasePlanItemService.updateDates(id, dto.getRequestDate(), dto.getNewContractDate());
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

    @GetMapping("/monthly-stats")
    public ResponseEntity<Map<String, Object>> getMonthlyStats(
            @RequestParam(required = false) Integer year) {
        Map<String, Object> stats = purchasePlanItemService.getMonthlyStats(year);
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/{id}/changes")
    public ResponseEntity<Page<PurchasePlanItemChangeDto>> getPurchasePlanItemChanges(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<PurchasePlanItemChangeDto> changes = purchasePlanItemChangeService.getChangesByItemIdPaginated(id, page, size);
        return ResponseEntity.ok(changes);
    }
}

