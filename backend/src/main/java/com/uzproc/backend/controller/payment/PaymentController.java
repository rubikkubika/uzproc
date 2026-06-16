package com.uzproc.backend.controller.payment;

import com.uzproc.backend.dto.payment.PaymentDto;
import com.uzproc.backend.service.payment.PaymentService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @GetMapping
    public ResponseEntity<Page<PaymentDto>> getAll(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "100") int size,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDir,
            @RequestParam(required = false) List<String> cfo,
            @RequestParam(required = false) String mainId,
            @RequestParam(required = false) String comment,
            @RequestParam(required = false) Boolean linkedOnly,
            @RequestParam(required = false) List<String> paymentStatus,
            @RequestParam(required = false) List<String> requestStatus,
            @RequestParam(required = false) String purchaseRequestNumber,
            @RequestParam(required = false) String contractTitle,
            @RequestParam(required = false) java.math.BigDecimal amount,
            @RequestParam(required = false) String amountOperator,
            @RequestParam(required = false) Integer plannedExpenseMonth,
            @RequestParam(required = false) Integer plannedExpenseYear,
            @RequestParam(required = false) Integer paymentMonth,
            @RequestParam(required = false) Integer paymentYear,
            @RequestParam(required = false) String paymentType,
            @RequestParam(required = false) String executor,
            @RequestParam(required = false) String responsible) {

        Page<PaymentDto> payments = paymentService.findAll(page, size, sortBy, sortDir, cfo, mainId, comment, linkedOnly,
                paymentStatus, requestStatus, purchaseRequestNumber, contractTitle, amount, amountOperator,
                plannedExpenseMonth, plannedExpenseYear, paymentMonth, paymentYear, paymentType, executor, responsible);
        return ResponseEntity.ok(payments);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PaymentDto> getById(@PathVariable Long id) {
        PaymentDto payment = paymentService.findById(id);
        if (payment != null) {
            return ResponseEntity.ok(payment);
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/by-contract/{contractId}")
    public ResponseEntity<List<PaymentDto>> getByContractId(@PathVariable Long contractId) {
        List<PaymentDto> payments = paymentService.findByContractId(contractId);
        return ResponseEntity.ok(payments);
    }

    /** Inline-обновление поля Тип оплаты (Аванс / По факту / null). */
    @PatchMapping("/{id}/payment-type")
    public ResponseEntity<PaymentDto> updatePaymentType(@PathVariable Long id,
                                                        @RequestBody Map<String, String> body) {
        String paymentType = body != null ? body.get("paymentType") : null;
        PaymentDto updated = paymentService.updatePaymentType(id, paymentType);
        return ResponseEntity.ok(updated);
    }
}
