package com.uzproc.backend.controller.specificationfeedback;

import com.uzproc.backend.dto.specificationfeedback.SpecificationFeedbackDashboardDto;
import com.uzproc.backend.dto.specificationfeedback.SpecificationFeedbackFormDto;
import com.uzproc.backend.dto.specificationfeedback.SpecificationFeedbackSubmitDto;
import com.uzproc.backend.service.specificationfeedback.SpecificationFeedbackService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Публичная форма оценки работы закупок по спецификациям (по токену приглашения).
 */
@RestController
@RequestMapping("/specification-feedback")
public class SpecificationFeedbackController {

    private final SpecificationFeedbackService specificationFeedbackService;

    public SpecificationFeedbackController(SpecificationFeedbackService specificationFeedbackService) {
        this.specificationFeedbackService = specificationFeedbackService;
    }

    /** GET /specification-feedback/dashboard — сводка оценок для управленческой отчётности. */
    @GetMapping("/dashboard")
    public ResponseEntity<SpecificationFeedbackDashboardDto> dashboard() {
        return ResponseEntity.ok(specificationFeedbackService.getDashboard());
    }

    /** GET /specification-feedback/{token} — данные формы (ЦФО, месяц, спецификации, статус). */
    @GetMapping("/{token}")
    public ResponseEntity<SpecificationFeedbackFormDto> getForm(@PathVariable String token) {
        return ResponseEntity.ok(specificationFeedbackService.getByToken(token));
    }

    /** POST /specification-feedback/{token} — сохранить оценку. */
    @PostMapping("/{token}")
    public ResponseEntity<SpecificationFeedbackFormDto> submit(@PathVariable String token,
                                                               @RequestBody SpecificationFeedbackSubmitDto body) {
        return ResponseEntity.ok(specificationFeedbackService.submit(token, body));
    }
}
