package com.uzproc.backend.controller.delivery;

import com.uzproc.backend.dto.delivery.DeliveryDto;
import com.uzproc.backend.dto.delivery.DeliveryStatusDto;
import com.uzproc.backend.service.delivery.DeliveryStatusService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
public class DeliveryStatusController {

    private final DeliveryStatusService deliveryStatusService;

    public DeliveryStatusController(DeliveryStatusService deliveryStatusService) {
        this.deliveryStatusService = deliveryStatusService;
    }

    /** Список доступных статусов поставки (для селекторов на фронте). */
    @GetMapping("/delivery-statuses")
    public ResponseEntity<List<DeliveryStatusDto>> getAvailableStatuses() {
        return ResponseEntity.ok(deliveryStatusService.getAvailableStatuses());
    }

    /** Inline-обновление статуса конкретной поставки. */
    @PatchMapping("/deliveries/{id}/status")
    public ResponseEntity<DeliveryDto> updateStatus(@PathVariable Long id,
                                                    @RequestBody Map<String, String> body) {
        String status = body != null ? body.get("status") : null;
        return ResponseEntity.ok(deliveryStatusService.updateStatus(id, status));
    }
}
