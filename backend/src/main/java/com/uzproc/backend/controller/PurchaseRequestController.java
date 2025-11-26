package com.uzproc.backend.controller;

import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.repository.PurchaseRequestRepository;
import com.uzproc.backend.service.ExcelLoadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/purchase-requests")
public class PurchaseRequestController {

    private static final Logger logger = LoggerFactory.getLogger(PurchaseRequestController.class);
    
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final ExcelLoadService excelLoadService;

    public PurchaseRequestController(
            PurchaseRequestRepository purchaseRequestRepository,
            ExcelLoadService excelLoadService) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.excelLoadService = excelLoadService;
    }

    @GetMapping
    public ResponseEntity<Page<PurchaseRequest>> getAllPurchaseRequests(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Integer year) {
        Pageable pageable = PageRequest.of(page, size);
        Page<PurchaseRequest> purchaseRequests;
        
        if (year != null) {
            // Фильтруем по году из даты создания заявки на закупку
            java.time.LocalDateTime startOfYear = java.time.LocalDateTime.of(year, 1, 1, 0, 0);
            java.time.LocalDateTime endOfYear = java.time.LocalDateTime.of(year, 12, 31, 23, 59, 59);
            purchaseRequests = purchaseRequestRepository.findByPurchaseRequestCreationDateBetween(
                startOfYear, endOfYear, pageable);
        } else {
            purchaseRequests = purchaseRequestRepository.findAll(pageable);
        }
        
        return ResponseEntity.ok(purchaseRequests);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PurchaseRequest> getPurchaseRequestById(@PathVariable Long id) {
        return purchaseRequestRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/upload-from-excel")
    public ResponseEntity<Map<String, Object>> uploadFromExcel(@RequestParam("file") MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (file.isEmpty()) {
                response.put("success", false);
                response.put("message", "Файл не предоставлен");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Проверяем тип файла
            String filename = file.getOriginalFilename();
            if (filename == null || (!filename.endsWith(".xls") && !filename.endsWith(".xlsx"))) {
                response.put("success", false);
                response.put("message", "Файл должен быть в формате Excel (.xls или .xlsx)");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Сохраняем файл во временную директорию
            Path tempFile = Files.createTempFile("upload_", filename);
            file.transferTo(tempFile.toFile());
            
            try {
                // Загружаем данные из Excel
                int loadedCount = excelLoadService.loadPurchaseRequestsFromExcel(tempFile.toFile());
                
                response.put("success", true);
                response.put("message", String.format("Успешно загружено %d записей", loadedCount));
                response.put("loadedCount", loadedCount);
            } finally {
                // Удаляем временный файл
                Files.deleteIfExists(tempFile);
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error uploading Excel file", e);
            response.put("success", false);
            response.put("message", "Ошибка при загрузке файла: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}

