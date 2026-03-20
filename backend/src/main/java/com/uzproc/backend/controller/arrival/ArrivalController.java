package com.uzproc.backend.controller.arrival;

import com.uzproc.backend.dto.arrival.ArrivalDto;
import com.uzproc.backend.service.arrival.ArrivalService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/arrivals")
public class ArrivalController {

    private final ArrivalService arrivalService;

    public ArrivalController(ArrivalService arrivalService) {
        this.arrivalService = arrivalService;
    }

    @GetMapping
    public ResponseEntity<Page<ArrivalDto>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) String number,
            @RequestParam(required = false) String supplierName,
            @RequestParam(required = false) String invoice,
            @RequestParam(required = false) String warehouse,
            @RequestParam(required = false) String operationType,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String incomingNumber,
            @RequestParam(required = false) String currency,
            @RequestParam(required = false) String comment,
            @RequestParam(required = false) String responsibleName,
            @RequestParam(required = false) Integer incomingDateYear,
            @RequestParam(required = false) Boolean incomingDateNull) {

        Page<ArrivalDto> arrivals = arrivalService.findAll(page, size, sortBy, sortDir,
                number, supplierName, invoice, warehouse, operationType, department,
                incomingNumber, currency, comment, responsibleName, incomingDateYear, incomingDateNull);
        return ResponseEntity.ok(arrivals);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ArrivalDto> getById(@PathVariable Long id) {
        ArrivalDto arrival = arrivalService.findById(id);
        if (arrival != null) {
            return ResponseEntity.ok(arrival);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/by-suppliers")
    public ResponseEntity<List<ArrivalDto>> getBySupplierIds(@RequestParam List<Long> supplierIds) {
        List<ArrivalDto> arrivals = arrivalService.findBySupplierIds(supplierIds);
        return ResponseEntity.ok(arrivals);
    }
}
