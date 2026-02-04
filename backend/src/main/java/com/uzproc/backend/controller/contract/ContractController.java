package com.uzproc.backend.controller.contract;

import com.uzproc.backend.dto.contract.ContractDto;
import com.uzproc.backend.service.contract.ContractService;
import com.uzproc.backend.service.contract.ContractStatusUpdateService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/contracts")
public class ContractController {

    private final ContractService contractService;
    private final ContractStatusUpdateService contractStatusUpdateService;

    public ContractController(ContractService contractService,
                             ContractStatusUpdateService contractStatusUpdateService) {
        this.contractService = contractService;
        this.contractStatusUpdateService = contractStatusUpdateService;
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
            @RequestParam(required = false) String contractType,
            @RequestParam(required = false) Boolean inWorkTab,
            @RequestParam(required = false) Boolean signedTab) {

        Page<ContractDto> contracts = contractService.findAll(
                page, size, year, sortBy, sortDir, innerId, cfo, name, documentForm, costType, contractType,
                null, inWorkTab, signedTab);

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

    @GetMapping("/years")
    public ResponseEntity<List<Integer>> getDistinctYears() {
        List<Integer> years = contractService.getDistinctYears();
        return ResponseEntity.ok(years);
    }

    @GetMapping("/by-parent/{parentContractId}")
    public ResponseEntity<List<ContractDto>> getContractsByParentContractId(@PathVariable Long parentContractId) {
        List<ContractDto> contracts = contractService.findByParentContractId(parentContractId);
        return ResponseEntity.ok(contracts);
    }

    @GetMapping("/by-purchase-request/{purchaseRequestId}")
    public ResponseEntity<List<ContractDto>> getContractsByPurchaseRequestId(@PathVariable Long purchaseRequestId) {
        List<ContractDto> contracts = contractService.findByPurchaseRequestId(purchaseRequestId);
        return ResponseEntity.ok(contracts);
    }

    @GetMapping("/by-inner-id/{innerId}")
    public ResponseEntity<ContractDto> getContractByInnerId(@PathVariable String innerId) {
        ContractDto contract = contractService.findByInnerId(innerId);
        if (contract != null) {
            return ResponseEntity.ok(contract);
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Обновить исключение договора из расчёта статуса заявки (Договор подписан / Спецификация подписана).
     * @param id id договора
     * @param body excludedFromStatusCalculation (boolean), exclusionComment (string, optional)
     */
    @PatchMapping("/{id}/exclusion")
    public ResponseEntity<ContractDto> updateContractExclusion(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        Boolean excluded = body != null && body.containsKey("excludedFromStatusCalculation")
                ? (Boolean) body.get("excludedFromStatusCalculation")
                : null;
        String comment = body != null && body.containsKey("exclusionComment")
                ? (body.get("exclusionComment") != null ? body.get("exclusionComment").toString() : null)
                : null;
        ContractDto updated = contractService.updateExclusion(id, excluded, comment);
        if (updated != null) {
            return ResponseEntity.ok(updated);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/specifications-for-delivery-plan")
    public ResponseEntity<List<ContractDto>> getSpecificationsForDeliveryPlan() {
        List<ContractDto> specifications = contractService.getSpecificationsForDeliveryPlan();
        return ResponseEntity.ok(specifications);
    }

    @GetMapping("/specifications-with-null-status")
    public ResponseEntity<List<Map<String, Object>>> getSpecificationsWithNullStatus() {
        List<Map<String, Object>> specifications = contractService.getSpecificationsWithNullStatus();
        return ResponseEntity.ok(specifications);
    }

    @PostMapping("/update-all-statuses")
    public ResponseEntity<Map<String, Object>> updateAllStatuses() {
        try {
            contractStatusUpdateService.updateAllStatuses();
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Статусы всех договоров обновлены");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", "Ошибка при обновлении статусов: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}

