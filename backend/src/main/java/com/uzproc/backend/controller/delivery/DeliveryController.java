package com.uzproc.backend.controller.delivery;

import com.uzproc.backend.dto.delivery.BulkCreateDeliveriesResultDto;
import com.uzproc.backend.dto.delivery.CreateDeliveryRequestDto;
import com.uzproc.backend.dto.delivery.DeliveryContractSearchResultDto;
import com.uzproc.backend.dto.delivery.DeliveryDeadlineHistogramDto;
import com.uzproc.backend.dto.delivery.DeliveryFilterParams;
import com.uzproc.backend.dto.delivery.DeliveryHorizonDto;
import com.uzproc.backend.dto.delivery.DeliveryResponsibleSummaryDto;
import com.uzproc.backend.dto.delivery.DeliveryDto;
import com.uzproc.backend.dto.delivery.DeliveryPaymentSchemeDto;
import com.uzproc.backend.dto.delivery.UpdateDeliveryPaymentsRequestDto;
import com.uzproc.backend.dto.payment.PaymentDto;
import com.uzproc.backend.service.delivery.DeliveryHorizonService;
import com.uzproc.backend.service.delivery.DeliveryResponsibleSummaryService;
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
    private final DeliveryResponsibleSummaryService responsibleSummaryService;
    private final DeliveryHorizonService horizonService;

    public DeliveryController(DeliveryService deliveryService,
                              DeliveryResponsibleSummaryService responsibleSummaryService,
                              DeliveryHorizonService horizonService) {
        this.deliveryService = deliveryService;
        this.responsibleSummaryService = responsibleSummaryService;
        this.horizonService = horizonService;
    }

    /**
     * Сводка поставок по ответственным: строки — ФИО, колонки — статусы поставки «В работе»,
     * плюс «Просрочено» и «Поставлено» за год. Фильтры таблицы на сводку не влияют.
     */
    @GetMapping("/responsible-summary")
    public ResponseEntity<DeliveryResponsibleSummaryDto> getResponsibleSummary(
            @RequestParam(required = false) Integer year) {
        return ResponseEntity.ok(responsibleSummaryService.getResponsibleSummary(year));
    }

    @GetMapping
    public ResponseEntity<Page<DeliveryDto>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            DeliveryFilterParams filter,
            @RequestParam(required = false, defaultValue = "false") boolean recheck) {

        // При обновлении списка (recheck=true) — пересчёт статусов: авто-закрытие
        // полностью оплаченных постоплат («Постоплата - 100%» + «Оплачено» + сумма совпала → «Поставлено»).
        if (recheck) {
            deliveryService.autoCloseFullyPaidDeliveries();
        }

        return ResponseEntity.ok(deliveryService.findAll(page, size, sortBy, sortDir, filter));
    }

    /**
     * Распределение поставок по дням месяца для ленты «По дням»: непоставленные поставки
     * по плановой дате и поставленные по фактической дате поставки. Принимает те же фильтры,
     * что и список, чтобы лента показывала ровно видимые в таблице записи.
     */
    @GetMapping("/deadline-histogram")
    public ResponseEntity<DeliveryDeadlineHistogramDto> getDeadlineHistogram(
            @RequestParam int year,
            @RequestParam int month,
            DeliveryFilterParams filter) {
        return ResponseEntity.ok(deliveryService.getDeadlineHistogram(year, month, filter));
    }

    /**
     * Горизонт непоставленных поставок: «Просрочено», «Сегодня», «Ближайшие 7 дней», «Позже», «Без даты».
     * Фильтры те же, что у списка; выбранный день и группа горизонта не учитываются.
     */
    @GetMapping("/horizon")
    public ResponseEntity<DeliveryHorizonDto> getHorizon(DeliveryFilterParams filter) {
        return ResponseEntity.ok(horizonService.getHorizon(filter));
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

    /**
     * Досоздаёт поставки для подписанных спецификаций договорников, у которых поставки ещё нет.
     * Та же сверка, что выполняется при старте приложения — для ручного запуска без перезапуска.
     * Существующие поставки не трогает.
     */
    @PostMapping("/sync-signed-specifications")
    public ResponseEntity<Map<String, Object>> syncSignedSpecifications() {
        int created = deliveryService.createMissingDeliveriesForSignedSpecifications();
        return ResponseEntity.ok(Map.of("created", created));
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

    /** Уникальные ответственные — для выпадающего фильтра столбца «Ответственный». */
    @GetMapping("/responsibles")
    public ResponseEntity<List<String>> getResponsibles() {
        return ResponseEntity.ok(deliveryService.listResponsibles());
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

    /**
     * Inline-обновление плановой даты поставки (ISO date). Пустое значение возвращает дату
     * в автоматический режим (снова равна дедлайну), непустое — фиксирует её как ручную:
     * автопересчёты, включая стартовую сверку, такую дату не меняют.
     */
    @PatchMapping("/{id}/planned-delivery-date")
    public ResponseEntity<DeliveryDto> updatePlannedDeliveryDate(@PathVariable Long id,
                                                                 @RequestBody Map<String, String> body) {
        String date = body != null ? body.get("plannedDeliveryDate") : null;
        return ResponseEntity.ok(deliveryService.updatePlannedDeliveryDate(id, date));
    }

    /**
     * Inline-обновление фактической даты поставки (ISO date, пусто — очистить).
     * С датой поставка становится «Поставлено», без даты поставленная снова «Ожидает поставку».
     */
    @PatchMapping("/{id}/actual-delivery-date")
    public ResponseEntity<DeliveryDto> updateActualDeliveryDate(@PathVariable Long id,
                                                                @RequestBody Map<String, String> body) {
        String date = body != null ? body.get("actualDeliveryDate") : null;
        return ResponseEntity.ok(deliveryService.updateActualDeliveryDate(id, date));
    }

    /** Inline-обновление даты ЭСФ (ISO date, пусто — очистить). */
    @PatchMapping("/{id}/esf-date")
    public ResponseEntity<DeliveryDto> updateEsfDate(@PathVariable Long id,
                                                     @RequestBody Map<String, String> body) {
        String date = body != null ? body.get("esfDate") : null;
        return ResponseEntity.ok(deliveryService.updateEsfDate(id, date));
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
