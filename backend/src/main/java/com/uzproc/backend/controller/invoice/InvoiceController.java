package com.uzproc.backend.controller.invoice;

import com.uzproc.backend.dto.invoice.InvoiceDto;
import com.uzproc.backend.service.invoice.InvoiceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    private static final String UPLOAD_DIR = "uploads/invoices";

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }

    @GetMapping("/by-contract/{contractId}")
    public ResponseEntity<List<InvoiceDto>> getByContractId(@PathVariable Long contractId) {
        List<InvoiceDto> invoices = invoiceService.findByContractId(contractId);
        return ResponseEntity.ok(invoices);
    }

    @PostMapping
    public ResponseEntity<InvoiceDto> create(@RequestBody Map<String, Object> body) {
        Long contractId = ((Number) body.get("contractId")).longValue();
        String data = body.get("data").toString();
        String fileUrl = body.get("fileUrl") != null ? body.get("fileUrl").toString() : null;
        InvoiceDto created = invoiceService.create(contractId, data, fileUrl);
        return ResponseEntity.ok(created);
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) throws IOException {
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss"));
        String originalName = file.getOriginalFilename();
        String fileName = timestamp + "_" + (originalName != null ? originalName : "invoice.pdf");

        Path filePath = uploadPath.resolve(fileName);
        Files.copy(file.getInputStream(), filePath);

        String fileUrl = "/api/invoices/files/" + fileName;
        return ResponseEntity.ok(Map.of("fileUrl", fileUrl));
    }

    @GetMapping("/files/{fileName}")
    public ResponseEntity<byte[]> getFile(@PathVariable String fileName) throws IOException {
        Path filePath = Paths.get(UPLOAD_DIR, fileName);
        if (!Files.exists(filePath)) {
            return ResponseEntity.notFound().build();
        }
        byte[] content = Files.readAllBytes(filePath);
        return ResponseEntity.ok()
                .header("Content-Type", "application/pdf")
                .header("Content-Disposition", "inline; filename=\"" + fileName + "\"")
                .body(content);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        invoiceService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
