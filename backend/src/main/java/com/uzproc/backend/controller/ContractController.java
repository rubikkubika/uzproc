package com.uzproc.backend.controller;

import com.uzproc.backend.dto.ContractDto;
import com.uzproc.backend.service.ContractService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contracts")
public class ContractController {

    private final ContractService contractService;

    public ContractController(ContractService contractService) {
        this.contractService = contractService;
    }

    @GetMapping
    public ResponseEntity<Page<ContractDto>> getAllContracts(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) String innerId,
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String documentForm,
            @RequestParam(required = false) String costType,
            @RequestParam(required = false) String contractType) {
        
        Page<ContractDto> contracts = contractService.findAll(
                page, size, year, sortBy, sortDir, innerId, cfo, name, documentForm, costType, contractType);
        
        return ResponseEntity.ok(contracts);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContractDto> getContractById(@PathVariable Long id) {
        ContractDto contract = contractService.findById(id);
        if (contract != null) {
            return ResponseEntity.ok(contract);
        }
        return ResponseEntity.notFound().build();
    }
}

