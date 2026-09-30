package com.uzproc.backend.controller.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.ComplexityErrorPreviewDto;
import com.uzproc.backend.dto.sendingcenter.ComplexityErrorSendResultDto;
import com.uzproc.backend.service.sendingcenter.ComplexityErrorService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Раздел «Закупки» центра отправки. */
@RestController
@RequestMapping("/sending-center/purchases")
public class PurchaseSendingController {

    private final ComplexityErrorService complexityErrorService;

    public PurchaseSendingController(ComplexityErrorService complexityErrorService) {
        this.complexityErrorService = complexityErrorService;
    }

    /** «Ошибка сложности»: закупки текущего года без сложности по закупщикам и отметки об отправке. */
    @GetMapping("/complexity-errors")
    public ResponseEntity<ComplexityErrorPreviewDto> getComplexityErrors() {
        return ResponseEntity.ok(complexityErrorService.getPreview());
    }

    /**
     * Отправляет уведомления «Ошибка сложности».
     * Тело: {@code {"purchaserKey": "..."}} — одному закупщику; без ключа — всем закупщикам с адресом.
     */
    @PostMapping("/complexity-errors/send")
    public ResponseEntity<ComplexityErrorSendResultDto> sendComplexityErrors(
            @RequestBody(required = false) Map<String, Object> body) {
        String purchaserKey = body != null && body.get("purchaserKey") != null
                ? String.valueOf(body.get("purchaserKey")) : null;
        return ResponseEntity.ok(complexityErrorService.send(purchaserKey));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
