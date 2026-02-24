package com.uzproc.backend.controller.contract;

import com.uzproc.backend.dto.contract.ContractApprovalDto;
import com.uzproc.backend.service.contract.ContractApprovalService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
}
