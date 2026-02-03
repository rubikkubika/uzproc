package com.uzproc.backend.controller;

import com.uzproc.backend.service.cfo.CfoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/cfos")
public class CfoController {

    private final CfoService cfoService;

    public CfoController(CfoService cfoService) {
        this.cfoService = cfoService;
    }

    /**
     * Возвращает список названий ЦФО для фильтров.
     * Если задан {@code for}: только те ЦФО, по которым есть данные в указанной сущности
     * (purchase-plan-items, purchase-requests, contracts, purchases).
     * Иначе — все ЦФО.
     */
    @GetMapping("/names")
    public ResponseEntity<List<String>> getNames(
            @RequestParam(name = "for", required = false) String forContext) {
        List<String> names = cfoService.getNames(forContext);
        return ResponseEntity.ok(names);
    }
}
