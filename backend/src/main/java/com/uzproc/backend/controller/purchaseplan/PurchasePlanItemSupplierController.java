package com.uzproc.backend.controller.purchaseplan;

import com.uzproc.backend.dto.purchaseplan.PurchasePlanItemSupplierDto;
import com.uzproc.backend.service.purchaseplan.PurchasePlanItemSupplierService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/purchase-plan-items/{itemId}/suppliers")
public class PurchasePlanItemSupplierController {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanItemSupplierController.class);

    private final PurchasePlanItemSupplierService supplierService;

    public PurchasePlanItemSupplierController(PurchasePlanItemSupplierService supplierService) {
        this.supplierService = supplierService;
    }

    /**
     * Получить список контрагентов, привязанных к позиции плана закупок.
     */
    @GetMapping
    public ResponseEntity<List<PurchasePlanItemSupplierDto>> getSuppliers(@PathVariable Long itemId) {
        return ResponseEntity.ok(supplierService.findByPurchasePlanItemId(itemId));
    }

    /**
     * Привязать контрагента к позиции плана.
     * Тело запроса:
     *  - {"supplierId": 123} — привязать существующего поставщика;
     *  - {"name": "...", "inn": "...", "kpp": "...", "type": "...", "code": "..."} — создать нового и привязать.
     */
    @PostMapping
    public ResponseEntity<?> addSupplier(
            @PathVariable Long itemId,
            @RequestBody Map<String, Object> body) {
        try {
            Object supplierIdObj = body.get("supplierId");
            if (supplierIdObj != null) {
                Long supplierId = Long.valueOf(supplierIdObj.toString());
                PurchasePlanItemSupplierDto dto = supplierService.linkExistingSupplier(itemId, supplierId);
                return ResponseEntity.status(201).body(dto);
            }

            String name = asString(body.get("name"));
            String inn = asString(body.get("inn"));
            String kpp = asString(body.get("kpp"));
            String type = asString(body.get("type"));
            String code = asString(body.get("code"));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> contacts = body.get("contacts") instanceof List
                    ? (List<Map<String, Object>>) body.get("contacts")
                    : null;

            PurchasePlanItemSupplierDto dto = supplierService.createAndLinkSupplier(itemId, name, inn, kpp, type, code, contacts);
            return ResponseEntity.status(201).body(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            logger.error("Error adding supplier to purchase plan item {}", itemId, e);
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    /**
     * Удалить привязку контрагента к позиции плана.
     */
    @DeleteMapping("/{linkId}")
    public ResponseEntity<?> removeSupplier(@PathVariable Long itemId, @PathVariable Long linkId) {
        try {
            supplierService.removeLink(linkId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Error removing supplier link {}", linkId, e);
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    private String asString(Object obj) {
        return obj != null ? obj.toString() : null;
    }
}
