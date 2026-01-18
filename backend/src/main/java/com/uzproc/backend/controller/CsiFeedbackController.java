package com.uzproc.backend.controller;

import com.uzproc.backend.dto.CsiFeedbackCreateDto;
import com.uzproc.backend.dto.CsiFeedbackDto;
import com.uzproc.backend.dto.PurchaseRequestInfoDto;
import com.uzproc.backend.service.csifeedback.CsiFeedbackService;
import com.uzproc.backend.service.csifeedback.CsiFeedbackInvitationService;
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
    private final CsiFeedbackInvitationService invitationService;

    public CsiFeedbackController(
            CsiFeedbackService csiFeedbackService,
            CsiFeedbackInvitationService invitationService) {
        this.csiFeedbackService = csiFeedbackService;
        this.invitationService = invitationService;
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

    /**
     * Создает приглашение для получателя (вызывается при генерации письма)
     */
    @PostMapping("/invitation")
    public ResponseEntity<?> createInvitation(
            @RequestParam String csiToken,
            @RequestParam String recipient) {
        try {
            logger.info("Creating invitation for token: {}, recipient: {}", csiToken, recipient);
            invitationService.createInvitation(csiToken, recipient);
            return ResponseEntity.ok(Map.of("success", true, "message", "Приглашение создано"));
        } catch (IllegalArgumentException e) {
            logger.error("Validation error: {}", e.getMessage());
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (Exception e) {
            logger.error("Error creating invitation", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Ошибка при создании приглашения: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    /**
     * Получает детали отправленного приглашения
     */
    @GetMapping("/invitation/details")
    public ResponseEntity<?> getInvitationDetails(@RequestParam String csiToken) {
        try {
            logger.info("Getting invitation details for token: {}", csiToken);
            var invitation = invitationService.findByToken(csiToken);
            if (invitation.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("recipient", invitation.get().getRecipient());
                response.put("createdAt", invitation.get().getCreatedAt());
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("success", false);
                errorResponse.put("message", "Приглашение не найдено");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
            }
        } catch (Exception e) {
            logger.error("Error getting invitation details", e);
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("message", "Ошибка при получении деталей приглашения: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}
