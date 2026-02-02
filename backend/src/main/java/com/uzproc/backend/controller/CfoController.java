package com.uzproc.backend.controller;

import com.uzproc.backend.service.cfo.CfoService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
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
     * Возвращает список названий всех ЦФО для фильтров.
     */
    @GetMapping("/names")
    public ResponseEntity<List<String>> getNames() {
        List<String> names = cfoService.getAllNames();
        return ResponseEntity.ok(names);
    }
}
