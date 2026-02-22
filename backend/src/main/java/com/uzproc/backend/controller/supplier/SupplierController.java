package com.uzproc.backend.controller.supplier;

import com.uzproc.backend.dto.supplier.SupplierDto;
import com.uzproc.backend.service.supplier.SupplierService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/suppliers")
public class SupplierController {

    private final SupplierService supplierService;

    public SupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    @GetMapping
    public ResponseEntity<Page<SupplierDto>> getAllSuppliers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String kpp,
            @RequestParam(required = false) String inn,
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String name) {

        Page<SupplierDto> suppliers = supplierService.findAll(page, size, sortBy, sortDir, type, kpp, inn, code, name);
        return ResponseEntity.ok(suppliers);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SupplierDto> getSupplierById(@PathVariable Long id) {
        SupplierDto supplier = supplierService.findById(id);
        if (supplier != null) {
            return ResponseEntity.ok(supplier);
        }
        return ResponseEntity.notFound().build();
    }
}
