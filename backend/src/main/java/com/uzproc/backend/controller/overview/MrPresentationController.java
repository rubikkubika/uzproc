package com.uzproc.backend.controller.overview;

import com.uzproc.backend.service.mrpresentation.MrPresentationPdfRenderer;
import com.uzproc.backend.service.mrpresentation.MrPresentationService;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/** Презентация управленческой отчётности (PDF 16:9). */
@RestController
@RequestMapping("/overview/management-reporting")
public class MrPresentationController {

    private final MrPresentationService presentationService;

    public MrPresentationController(MrPresentationService presentationService) {
        this.presentationService = presentationService;
    }

    /** GET /overview/management-reporting/presentation?year=2026&month=9 — файл презентации за отчётный период. */
    @GetMapping("/presentation")
    public ResponseEntity<byte[]> getPresentation(@RequestParam int year, @RequestParam int month) {
        MrPresentationPdfRenderer.Result result = presentationService.render(year, month);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(result.fileName(), StandardCharsets.UTF_8).build().toString())
                .header("X-Slide-Count", String.valueOf(result.slideCount()))
                .body(result.pdf());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleRenderFailure(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
    }
}
