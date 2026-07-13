package com.uzproc.backend.controller.delivery;

import com.uzproc.backend.dto.delivery.BulkCreateDeliveriesResultDto;
import com.uzproc.backend.dto.delivery.CreateDeliveryRequestDto;
import com.uzproc.backend.dto.delivery.DeliveryContractSearchResultDto;
import com.uzproc.backend.dto.delivery.DeliveryDto;
import com.uzproc.backend.dto.delivery.DeliveryPaymentSchemeDto;
import com.uzproc.backend.dto.delivery.UpdateDeliveryPaymentsRequestDto;
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
            @RequestParam(required = false) String paymentScheme,
            @RequestParam(required = false) String shipmentStatus,
            @RequestParam(required = false) String reportStatus,
            @RequestParam(required = false) String paymentsStatus,
            @RequestParam(required = false) Boolean closed,
            @RequestParam(required = false, defaultValue = "false") boolean recheck) {

        // При обновлении списка (recheck=true) — пересчёт статусов: авто-закрытие
        // полностью оплаченных постоплат («Постоплата - 100%» + «Оплачено» + сумма совпала → «Поставлено»).
        if (recheck) {
            deliveryService.autoCloseFullyPaidDeliveries();
        }

        Page<DeliveryDto> deliveries = deliveryService.findAll(page, size, sortBy, sortDir,
                innerId, contractInnerId, supplierName, status, currency, comment,
                responsibleName, dateYear, dateNull, paymentScheme, shipmentStatus, reportStatus, paymentsStatus, closed);
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

    /**
     * Массовое создание поставок по подписанным спецификациям, подготовленным договорником,
     * у которых дата регистрации (= дата подписания) попадает в указанный месяц/год.
     * По умолчанию — апрель текущего года. Спецификации с уже существующей поставкой пропускаются.
     */
    @PostMapping("/from-specifications")
    public ResponseEntity<BulkCreateDeliveriesResultDto> createFromSpecifications(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false, defaultValue = "4") Integer month) {
        return ResponseEntity.ok(deliveryService.createDeliveriesFromSignedSpecifications(year, month));
    }

    /** Справочник схем оплаты поставок (для выпадающего списка в карточке поставки). */
    @GetMapping("/payment-schemes")
    public ResponseEntity<List<DeliveryPaymentSchemeDto>> getPaymentSchemes() {
        return ResponseEntity.ok(deliveryService.listPaymentSchemes());
    }

    /** Уникальные значения «Статуса из отчёта» — для выпадающего фильтра. */
    @GetMapping("/report-statuses")
    public ResponseEntity<List<String>> getReportStatuses() {
        return ResponseEntity.ok(deliveryService.listReportStatuses());
    }

    /** Уникальные значения количества нераспределённых оплат — для фильтра столбца «Оплаты». */
    @GetMapping("/undistributed-counts")
    public ResponseEntity<List<Integer>> getUndistributedCounts() {
        return ResponseEntity.ok(deliveryService.listUndistributedPaymentCounts());
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

    /** Обновление схемы оплаты и распределения оплат поставки (та же логика, что при создании). */
    @PatchMapping("/{id}/payments")
    public ResponseEntity<DeliveryDto> updatePayments(@PathVariable Long id,
                                                      @RequestBody UpdateDeliveryPaymentsRequestDto request) {
        return ResponseEntity.ok(deliveryService.updatePaymentSchemeAndPayments(id, request));
    }

    /** Сброс распределения оплат: схема снимается, типы оплат очищаются, оплаты становятся «нераспределёнными». */
    @PostMapping("/{id}/payments/reset")
    public ResponseEntity<DeliveryDto> resetPayments(@PathVariable Long id) {
        return ResponseEntity.ok(deliveryService.resetPaymentDistribution(id));
    }

    /** Inline-обновление срока поставки (ISO date или null/пусто для сброса). */
    @PatchMapping("/{id}/delivery-deadline")
    public ResponseEntity<DeliveryDto> updateDeliveryDeadline(@PathVariable Long id,
                                                              @RequestBody Map<String, String> body) {
        String date = body != null ? body.get("deliveryDeadline") : null;
        return ResponseEntity.ok(deliveryService.updateDeliveryDeadline(id, date));
    }

    /** Inline-обновление статуса поставки (Ожидает поставку / Поставлено / Просрочено).
     *  При «Поставлено» в теле обязателен actualDeliveryDate (ISO-дата). */
    @PatchMapping("/{id}/shipment-status")
    public ResponseEntity<DeliveryDto> updateShipmentStatus(@PathVariable Long id,
                                                            @RequestBody Map<String, String> body) {
        String value = body != null ? body.get("shipmentStatus") : null;
        String actualDeliveryDate = body != null ? body.get("actualDeliveryDate") : null;
        return ResponseEntity.ok(deliveryService.updateShipmentStatus(id, value, actualDeliveryDate));
    }
}
