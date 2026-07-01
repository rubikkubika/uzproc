package com.uzproc.backend.controller.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.CfoSpecificationSendingDto;
import com.uzproc.backend.service.sendingcenter.SpecificationSendingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Центр отправки — вкладка «Спецификации».
 */
@RestController
@RequestMapping("/sending-center/specifications")
public class SpecificationSendingController {

    private final SpecificationSendingService specificationSendingService;

    public SpecificationSendingController(SpecificationSendingService specificationSendingService) {
        this.specificationSendingService = specificationSendingService;
    }

    /**
     * GET /sending-center/specifications?year=&month= —
     * список ЦФО с агрегатами подписанных спецификаций за месяц (по дате синхронизации).
     */
    @GetMapping
    public ResponseEntity<List<CfoSpecificationSendingDto>> list(@RequestParam int year,
                                                                 @RequestParam int month) {
        return ResponseEntity.ok(specificationSendingService.getSpecificationSending(year, month));
    }

    /**
     * GET /sending-center/specifications/months — месяцы с данными (для навигации).
     */
    @GetMapping("/months")
    public ResponseEntity<List<Map<String, Object>>> months() {
        return ResponseEntity.ok(specificationSendingService.getAvailableMonths());
    }

    /**
     * PUT /sending-center/specifications/recipient — назначить получателя письма для ЦФО
     * (переопределить руководителя ЦФО). Тело: {"cfoName":"...","userId":123}.
     */
    @PutMapping("/recipient")
    public ResponseEntity<Void> setRecipient(@RequestBody Map<String, Object> body) {
        String cfoName = body.get("cfoName") != null ? body.get("cfoName").toString() : null;
        Long userId = body.get("userId") != null ? ((Number) body.get("userId")).longValue() : null;
        specificationSendingService.setRecipient(cfoName, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * DELETE /sending-center/specifications/recipient?cfoName=... — сбросить переопределение
     * (вернуть получателя к руководителю ЦФО).
     */
    @DeleteMapping("/recipient")
    public ResponseEntity<Void> resetRecipient(@RequestParam String cfoName) {
        specificationSendingService.resetRecipient(cfoName);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /sending-center/specifications/send — отправить спецификации ЦФО на оценку руководителю.
     * Тело: {"year":2026,"month":6,"cfoName":"...","recipientOverride":"a.retsko@uzum.com"}.
     * recipientOverride опционален — если задан, письмо уходит на этот адрес (для теста).
     */
    @PostMapping("/send")
    public ResponseEntity<Map<String, Object>> send(@RequestBody Map<String, Object> body) {
        int year = ((Number) body.get("year")).intValue();
        int month = ((Number) body.get("month")).intValue();
        String cfoName = body.get("cfoName") != null ? body.get("cfoName").toString() : null;
        String recipientOverride = body.get("recipientOverride") != null
                ? body.get("recipientOverride").toString() : null;
        return ResponseEntity.ok(specificationSendingService.send(year, month, cfoName, recipientOverride));
    }
}
