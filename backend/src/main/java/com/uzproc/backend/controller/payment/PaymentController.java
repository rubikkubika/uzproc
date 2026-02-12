package com.uzproc.backend.controller.payment;

import com.uzproc.backend.dto.payment.PaymentDto;
import com.uzproc.backend.service.payment.PaymentService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
            @RequestParam(required = false) String comment,
            @RequestParam(required = false) Boolean linkedOnly) {

        Page<PaymentDto> payments = paymentService.findAll(page, size, sortBy, sortDir, cfo, comment, linkedOnly);
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
}
