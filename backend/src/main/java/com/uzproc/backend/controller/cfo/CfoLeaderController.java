package com.uzproc.backend.controller.cfo;

import com.uzproc.backend.dto.cfo.CfoLeaderDto;
import com.uzproc.backend.service.cfo.CfoLeaderService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Справочник руководителей ЦФО.
 */
@RestController
@RequestMapping("/cfo-leaders")
public class CfoLeaderController {

    private final CfoLeaderService cfoLeaderService;

    public CfoLeaderController(CfoLeaderService cfoLeaderService) {
        this.cfoLeaderService = cfoLeaderService;
    }

    /**
     * GET /cfo-leaders — все ЦФО (из заявок/закупок/договоров) с ФИО руководителей.
     */
    @GetMapping
    public ResponseEntity<List<CfoLeaderDto>> list() {
        return ResponseEntity.ok(cfoLeaderService.getAll());
    }

    /**
     * PUT /cfo-leaders — назначить пользователя руководителем ЦФО.
     */
    @PutMapping
    public ResponseEntity<CfoLeaderDto> upsert(@RequestBody CfoLeaderDto body) {
        return ResponseEntity.ok(
                cfoLeaderService.upsertLeader(body.getCfoName(), body.getUserId()));
    }

    /**
     * DELETE /cfo-leaders?cfoName=... — удалить ФИО руководителя (ЦФО остаётся в списке).
     */
    @DeleteMapping
    public ResponseEntity<Void> delete(@RequestParam String cfoName) {
        cfoLeaderService.deleteLeader(cfoName);
        return ResponseEntity.noContent().build();
    }
}
