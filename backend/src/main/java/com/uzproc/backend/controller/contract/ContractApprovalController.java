package com.uzproc.backend.controller.contract;

import com.uzproc.backend.dto.contract.ContractApprovalDto;
import com.uzproc.backend.dto.contract.ContractRemarkDto;
import com.uzproc.backend.service.contract.ContractApprovalService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST API для согласований договоров (contract_approvals).
 */
@RestController
@RequestMapping("/contract-approvals")
public class ContractApprovalController {

    private final ContractApprovalService contractApprovalService;

    public ContractApprovalController(ContractApprovalService contractApprovalService) {
        this.contractApprovalService = contractApprovalService;
    }

    /**
     * Получить все согласования по id договора.
     */
    @GetMapping("/by-contract/{contractId}")
    public ResponseEntity<List<ContractApprovalDto>> getByContractId(@PathVariable Long contractId) {
        List<ContractApprovalDto> list = contractApprovalService.findByContractId(contractId);
        return ResponseEntity.ok(list);
    }

    /**
     * Получить замечания из согласований договоров, подготовленных исполнителями (isContractor=true).
     * Поддерживает пагинацию (page, size). Отсортированы от новых к старым.
     */
    @GetMapping("/remarks")
    public ResponseEntity<Page<ContractRemarkDto>> getAllRemarks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(contractApprovalService.findAllRemarks(page, size));
    }
}
