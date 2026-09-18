package com.uzproc.backend.controller.sendingcenter;

import com.uzproc.backend.dto.sendingcenter.DeliveryWeeklyReportPreviewDto;
import com.uzproc.backend.dto.sendingcenter.DeliveryWeeklyReportSendResultDto;
import com.uzproc.backend.dto.sendingcenter.UpcomingDeliveriesSendResultDto;
import com.uzproc.backend.service.sendingcenter.DeliverySendingService;
import com.uzproc.backend.service.sendingcenter.DeliveryWeeklyReportService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** Раздел «Поставки» центра отправки. */
@RestController
@RequestMapping("/sending-center/deliveries")
public class DeliverySendingController {

    private final DeliverySendingService deliverySendingService;
    private final DeliveryWeeklyReportService deliveryWeeklyReportService;

    public DeliverySendingController(DeliverySendingService deliverySendingService,
                                     DeliveryWeeklyReportService deliveryWeeklyReportService) {
        this.deliverySendingService = deliverySendingService;
        this.deliveryWeeklyReportService = deliveryWeeklyReportService;
    }

    /** Сводка по предстоящим поставкам: сколько попадёт в письмо и на какой адрес уйдёт по умолчанию. */
    @GetMapping("/upcoming")
    public ResponseEntity<Map<String, Object>> getUpcoming(
            @RequestParam(required = false) Integer days) {
        int daysAhead = days != null ? days : DeliverySendingService.DEFAULT_DAYS_AHEAD;
        return ResponseEntity.ok(Map.of(
                "days", daysAhead,
                "count", deliverySendingService.countUpcoming(daysAhead),
                "defaultRecipient", DeliverySendingService.DEFAULT_TEST_RECIPIENT
        ));
    }

    /** Отправляет тестовое письмо о предстоящих поставках. */
    @PostMapping("/test-send")
    public ResponseEntity<UpcomingDeliveriesSendResultDto> sendTest(
            @RequestBody(required = false) Map<String, Object> body) {
        String recipient = body != null && body.get("recipient") != null
                ? String.valueOf(body.get("recipient")) : null;
        Integer days = body != null && body.get("days") != null
                ? Integer.valueOf(String.valueOf(body.get("days"))) : null;
        return ResponseEntity.ok(deliverySendingService.sendTestUpcomingDeliveries(recipient, days));
    }

    /** Предпросмотр недельного отчёта по поставкам: периоды, агрегаты и получатель по умолчанию. */
    @GetMapping("/weekly-report")
    public ResponseEntity<DeliveryWeeklyReportPreviewDto> getWeeklyReport() {
        return ResponseEntity.ok(deliveryWeeklyReportService.getPreview());
    }

    /** Отправляет недельный отчёт по поставкам выбранному получателю. */
    @PostMapping("/weekly-report/send")
    public ResponseEntity<DeliveryWeeklyReportSendResultDto> sendWeeklyReport(
            @RequestBody(required = false) Map<String, Object> body) {
        String recipient = body != null && body.get("recipient") != null
                ? String.valueOf(body.get("recipient")) : null;
        String recipientFullName = body != null && body.get("recipientFullName") != null
                ? String.valueOf(body.get("recipientFullName")) : null;
        return ResponseEntity.ok(deliveryWeeklyReportService.send(recipient, recipientFullName));
    }
}
