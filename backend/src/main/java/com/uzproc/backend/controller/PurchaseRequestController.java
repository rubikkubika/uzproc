package com.uzproc.backend.controller;

import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.repository.PurchaseRequestRepository;
import com.uzproc.backend.service.ExcelLoadService;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
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
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) Long idPurchaseRequest,
            @RequestParam(required = false) String cfo,
            @RequestParam(required = false) String purchaseInitiator,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String costType,
            @RequestParam(required = false) String contractType,
            @RequestParam(required = false) Boolean isPlanned) {
        
        // Создаем Specification для фильтрации
        Specification<PurchaseRequest> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            
            // Фильтр по году
            if (year != null) {
                java.time.LocalDateTime startOfYear = java.time.LocalDateTime.of(year, 1, 1, 0, 0);
                java.time.LocalDateTime endOfYear = java.time.LocalDateTime.of(year, 12, 31, 23, 59, 59);
                predicates.add(cb.between(root.get("purchaseRequestCreationDate"), startOfYear, endOfYear));
            }
            
            // Фильтр по номеру заявки
            if (idPurchaseRequest != null) {
                predicates.add(cb.equal(root.get("idPurchaseRequest"), idPurchaseRequest));
            }
            
            // Фильтр по ЦФО (частичное совпадение, case-insensitive)
            if (cfo != null && !cfo.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("cfo")), "%" + cfo.toLowerCase() + "%"));
            }
            
            // Фильтр по инициатору (частичное совпадение, case-insensitive)
            if (purchaseInitiator != null && !purchaseInitiator.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("purchaseInitiator")), "%" + purchaseInitiator.toLowerCase() + "%"));
            }
            
            // Фильтр по наименованию (частичное совпадение, case-insensitive)
            if (name != null && !name.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
            }
            
            // Фильтр по типу затрат (точное совпадение)
            if (costType != null && !costType.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("costType"), costType));
            }
            
            // Фильтр по типу договора (точное совпадение)
            if (contractType != null && !contractType.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("contractType"), contractType));
            }
            
            // Фильтр по плану
            if (isPlanned != null) {
                predicates.add(cb.equal(root.get("isPlanned"), isPlanned));
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        
        // Настройка сортировки
        Sort sort = Sort.unsorted();
        if (sortBy != null && !sortBy.trim().isEmpty()) {
            Sort.Direction direction = (sortDir != null && sortDir.equalsIgnoreCase("desc")) 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
            sort = Sort.by(direction, sortBy);
        }
        
        Pageable pageable = PageRequest.of(page, size, sort);
        Page<PurchaseRequest> purchaseRequests = purchaseRequestRepository.findAll(spec, pageable);
        
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

