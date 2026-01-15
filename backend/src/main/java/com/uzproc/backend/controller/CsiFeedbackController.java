package com.uzproc.backend.controller;

import com.uzproc.backend.dto.CsiFeedbackCreateDto;
import com.uzproc.backend.dto.CsiFeedbackDto;
import com.uzproc.backend.dto.PurchaseRequestInfoDto;
import com.uzproc.backend.service.CsiFeedbackService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/csi-feedback")
public class CsiFeedbackController {

    private static final Logger logger = LoggerFactory.getLogger(CsiFeedbackController.class);

    private final CsiFeedbackService csiFeedbackService;

    public CsiFeedbackController(CsiFeedbackService csiFeedbackService) {
        this.csiFeedbackService = csiFeedbackService;
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody CsiFeedbackCreateDto createDto) {
        try {
            logger.info("Received CSI feedback creation request for token: {}", createDto.getCsiToken());
            CsiFeedbackDto feedback = csiFeedbackService.create(createDto);
            return ResponseEntity.status(HttpStatus.CREATED).body(feedback);
        } catch (IllegalArgumentException e) {
            logger.error("Validation error: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (IllegalStateException e) {
            logger.error("Business logic error: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.CONFLICT).body(errorResponse);
        } catch (Exception e) {
            logger.error("Error creating CSI feedback", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Ошибка при создании обратной связи: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Получает информацию о заявке по токену для отображения формы CSI
     */
    @GetMapping("/form/{token}")
    public ResponseEntity<?> getFormByToken(@PathVariable String token) {
        try {
            logger.info("Getting purchase request info for CSI token: {}", token);
            PurchaseRequestInfoDto info = csiFeedbackService.getPurchaseRequestByToken(token);
            return ResponseEntity.ok(info);
        } catch (IllegalArgumentException e) {
            logger.error("Token not found: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Ссылка недействительна или заявка не найдена");
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
        } catch (Exception e) {
            logger.error("Error getting purchase request info", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Ошибка при получении информации о заявке: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping
    public ResponseEntity<Page<CsiFeedbackDto>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) Long purchaseRequestId) {

        Page<CsiFeedbackDto> feedbacks = csiFeedbackService.findAll(
                page, size, sortBy, sortDir, purchaseRequestId);

        return ResponseEntity.ok(feedbacks);
    }

    @GetMapping("/{id}")
    public ResponseEntity<CsiFeedbackDto> getById(@PathVariable Long id) {
        CsiFeedbackDto feedback = csiFeedbackService.findById(id);
        if (feedback != null) {
            return ResponseEntity.ok(feedback);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/by-purchase-request/{purchaseRequestId}")
    public ResponseEntity<List<CsiFeedbackDto>> getByPurchaseRequestId(@PathVariable Long purchaseRequestId) {
        List<CsiFeedbackDto> feedbacks = csiFeedbackService.findByPurchaseRequestId(purchaseRequestId);
        return ResponseEntity.ok(feedbacks);
    }
}
