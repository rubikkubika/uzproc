package com.uzproc.backend.controller.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.ManagementReportSendResultDto;
import com.uzproc.backend.dto.sendingcenter.ManagementReportSendingInfoDto;
import com.uzproc.backend.service.sendingcenter.ManagementReportSendingService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Раздел «Управленческая отчётность» центра отправки. */
@RestController
@RequestMapping("/sending-center/management-report")
public class ManagementReportSendingController {

    private final ManagementReportSendingService sendingService;

    public ManagementReportSendingController(ManagementReportSendingService sendingService) {
        this.sendingService = sendingService;
    }

    /** Период, получатели и расписание рассылки презентации управленческой отчётности. */
    @GetMapping
    public ResponseEntity<ManagementReportSendingInfoDto> getInfo() {
        return ResponseEntity.ok(sendingService.getInfo());
    }

    /** Тестовое письмо: презентация за прошлый месяц уходит только на тестовый адрес, без копии. */
    @PostMapping("/send-test")
    public ResponseEntity<ManagementReportSendResultDto> sendTest() {
        return ResponseEntity.ok(sendingService.sendTest());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }

    /** Презентация не собралась. */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleRenderFailure(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
    }

    /** Письмо не ушло (почтовый сервер недоступен или отклонил письмо). */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleSendFailure(RuntimeException e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Презентация сформирована, но письмо не отправлено: " + e.getMessage()));
    }
}
