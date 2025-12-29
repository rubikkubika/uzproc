package com.uzproc.backend.controller;

import com.uzproc.backend.dto.PurchasePlanVersionDto;
import com.uzproc.backend.service.PurchasePlanVersionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/purchase-plan-versions")
public class PurchasePlanVersionController {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanVersionController.class);

    private final PurchasePlanVersionService versionService;

    public PurchasePlanVersionController(PurchasePlanVersionService versionService) {
        this.versionService = versionService;
    }

    @PostMapping
    public ResponseEntity<?> createVersion(@RequestBody Map<String, Object> request) {
        try {
            Integer year = null;
            if (request.get("year") instanceof Number) {
                year = ((Number) request.get("year")).intValue();
            } else if (request.get("year") instanceof String) {
                year = Integer.parseInt((String) request.get("year"));
            }

            String description = (String) request.get("description");
            String createdBy = (String) request.get("createdBy");

            if (year == null) {
                return ResponseEntity.badRequest().body("Year is required");
            }

            PurchasePlanVersionDto version = versionService.createVersion(year, description, createdBy);
            return ResponseEntity.status(201).body(version);
        } catch (Exception e) {
            logger.error("Error creating version", e);
            return ResponseEntity.status(500).body("Ошибка сервера: " + e.getMessage());
        }
    }

    @GetMapping("/year/{year}")
    public ResponseEntity<List<PurchasePlanVersionDto>> getVersionsByYear(@PathVariable Integer year) {
        try {
            List<PurchasePlanVersionDto> versions = versionService.getVersionsByYear(year);
            return ResponseEntity.ok(versions);
        } catch (Exception e) {
            logger.error("Error getting versions for year {}", year, e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchasePlanVersionDto> getVersion(@PathVariable Long id) {
        try {
            PurchasePlanVersionDto version = versionService.getVersion(id);
            return version != null
                    ? ResponseEntity.ok(version)
                    : ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.error("Error getting version {}", id, e);
            return ResponseEntity.status(500).build();
        }
    }

    @GetMapping("/{id}/items")
    public ResponseEntity<List<com.uzproc.backend.dto.PurchasePlanItemDto>> getVersionItems(@PathVariable Long id) {
        try {
            List<com.uzproc.backend.dto.PurchasePlanItemDto> items = versionService.getVersionItems(id);
            return ResponseEntity.ok(items);
        } catch (Exception e) {
            logger.error("Error getting items for version {}", id, e);
            return ResponseEntity.status(500).build();
        }
    }
}

