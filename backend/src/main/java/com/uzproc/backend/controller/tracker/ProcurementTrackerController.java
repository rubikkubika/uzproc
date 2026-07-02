package com.uzproc.backend.controller.tracker;

import com.uzproc.backend.dto.tracker.ProcurementTrackerDto;
import com.uzproc.backend.service.tracker.ProcurementTrackerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Публичный API «Трекера статуса закупок» для страницы инициатора.
 * Только чтение; доступ настроен в SecurityConfig (GET /procurements/**).
 */
@RestController
@RequestMapping("/procurements")
public class ProcurementTrackerController {

    private final ProcurementTrackerService service;

    public ProcurementTrackerController(ProcurementTrackerService service) {
        this.service = service;
    }

    /** Поиск закупок по номеру заявки, предмету или ФИО инициатора. Пустой запрос → пустой список. */
    @GetMapping
    public List<ProcurementTrackerDto> search(@RequestParam(name = "q", required = false) String q) {
        return service.search(q);
    }

    /** Детальная модель одной закупки по номеру заявки. */
    @GetMapping("/{idPurchaseRequest}")
    public ResponseEntity<ProcurementTrackerDto> byIdPurchaseRequest(@PathVariable Long idPurchaseRequest) {
        ProcurementTrackerDto dto = service.getByIdPurchaseRequest(idPurchaseRequest);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.notFound().build();
    }
}
