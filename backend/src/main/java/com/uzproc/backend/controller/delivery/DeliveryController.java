package com.uzproc.backend.controller.delivery;

import com.uzproc.backend.dto.delivery.CreateDeliveryRequestDto;
import com.uzproc.backend.dto.delivery.DeliveryContractSearchResultDto;
import com.uzproc.backend.dto.delivery.DeliveryDto;
import com.uzproc.backend.dto.payment.PaymentDto;
import com.uzproc.backend.service.delivery.DeliveryService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/deliveries")
public class DeliveryController {

    private final DeliveryService deliveryService;

    public DeliveryController(DeliveryService deliveryService) {
        this.deliveryService = deliveryService;
    }

    @GetMapping
    public ResponseEntity<Page<DeliveryDto>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) String innerId,
            @RequestParam(required = false) String contractInnerId,
            @RequestParam(required = false) String supplierName,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) String comment,
            @RequestParam(required = false) String responsibleName,
            @RequestParam(required = false) Integer dateYear,
            @RequestParam(required = false) Boolean dateNull,
            @RequestParam(required = false) String paymentScheme) {

        Page<DeliveryDto> deliveries = deliveryService.findAll(page, size, sortBy, sortDir,
                innerId, contractInnerId, supplierName, status, currency, comment,
                responsibleName, dateYear, dateNull, paymentScheme);
        return ResponseEntity.ok(deliveries);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DeliveryDto> getById(@PathVariable Long id) {
        DeliveryDto delivery = deliveryService.findById(id);
        if (delivery != null) {
            return ResponseEntity.ok(delivery);
        }
        return ResponseEntity.notFound().build();
    }

    /** Создаёт поставку. Принимает contractId + paymentScheme (+ опц. paymentIds). */
    @PostMapping
    public ResponseEntity<DeliveryDto> create(@RequestBody CreateDeliveryRequestDto request) {
        DeliveryDto created = deliveryService.create(request);
        return ResponseEntity.ok(created);
    }

    /** Поиск договоров для модального окна создания поставки: статус=Подписан, подготовил договорник. */
    @GetMapping("/search-contracts")
    public ResponseEntity<List<DeliveryContractSearchResultDto>> searchContracts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false, defaultValue = "20") int limit) {
        return ResponseEntity.ok(deliveryService.searchSignedContracts(search, limit));
    }

    /** Оплаты, привязанные к указанному договору. */
    @GetMapping("/contracts/{contractId}/payments")
    public ResponseEntity<List<PaymentDto>> getPaymentsByContract(@PathVariable Long contractId) {
        return ResponseEntity.ok(deliveryService.findPaymentsByContract(contractId));
    }

    /** Inline-обновление срока поставки (ISO date или null/пусто для сброса). */
    @PatchMapping("/{id}/delivery-deadline")
    public ResponseEntity<DeliveryDto> updateDeliveryDeadline(@PathVariable Long id,
                                                              @RequestBody Map<String, String> body) {
        String date = body != null ? body.get("deliveryDeadline") : null;
        return ResponseEntity.ok(deliveryService.updateDeliveryDeadline(id, date));
    }
}
