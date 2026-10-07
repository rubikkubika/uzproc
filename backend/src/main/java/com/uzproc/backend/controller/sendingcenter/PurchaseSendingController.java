package com.uzproc.backend.controller.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.ComplexityErrorPreviewDto;
import com.uzproc.backend.dto.sendingcenter.ComplexityErrorSendResultDto;
import com.uzproc.backend.dto.sendingcenter.ComplexityErrorTestSendResultDto;
import com.uzproc.backend.dto.sendingcenter.CsiInvitationPreviewDto;
import com.uzproc.backend.dto.sendingcenter.CsiInvitationTestSendResultDto;
import com.uzproc.backend.dto.sendingcenter.CsiInvitationTextDto;
import com.uzproc.backend.service.sendingcenter.ComplexityErrorService;
import com.uzproc.backend.service.sendingcenter.CsiInvitationSendingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Раздел «Закупки» центра отправки. */
@RestController
@RequestMapping("/sending-center/purchases")
public class PurchaseSendingController {

    private final ComplexityErrorService complexityErrorService;
    private final CsiInvitationSendingService csiInvitationSendingService;

    public PurchaseSendingController(ComplexityErrorService complexityErrorService,
                                     CsiInvitationSendingService csiInvitationSendingService) {
        this.complexityErrorService = complexityErrorService;
        this.csiInvitationSendingService = csiInvitationSendingService;
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

    /** Тестовое письмо: список случайного закупщика уходит только на тестовый адрес, без копии и журнала. */
    @PostMapping("/complexity-errors/send-test")
    public ResponseEntity<ComplexityErrorTestSendResultDto> sendComplexityErrorsTest() {
        return ResponseEntity.ok(complexityErrorService.sendTest());
    }

    /** «Оценка закупки»: пример письма (по последней заявке с подписанными договорами), копия и тестовый адрес. */
    @GetMapping("/csi-invitation")
    public ResponseEntity<CsiInvitationPreviewDto> getCsiInvitation() {
        return ResponseEntity.ok(csiInvitationSendingService.getPreview());
    }

    /** Текст письма «Оценка закупки» по заявке — подставляется в окно отправки в таблице заявок. */
    @GetMapping("/csi-invitation/text")
    public ResponseEntity<CsiInvitationTextDto> getCsiInvitationText(@RequestParam Long purchaseRequestId) {
        return ResponseEntity.ok(csiInvitationSendingService.getText(purchaseRequestId));
    }

    /** Тестовое письмо «Оценка закупки»: только на тестовый адрес, без копии и без создания приглашения. */
    @PostMapping("/csi-invitation/send-test")
    public ResponseEntity<CsiInvitationTestSendResultDto> sendCsiInvitationTest() {
        return ResponseEntity.ok(csiInvitationSendingService.sendTest());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
