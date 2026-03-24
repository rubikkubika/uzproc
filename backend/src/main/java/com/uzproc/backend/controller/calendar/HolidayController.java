package com.uzproc.backend.controller.calendar;

import com.uzproc.backend.dto.calendar.HolidayDto;
import com.uzproc.backend.service.calendar.HolidayService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/holidays")
public class HolidayController {

    private final HolidayService holidayService;

    public HolidayController(HolidayService holidayService) {
        this.holidayService = holidayService;
    }

    /**
     * Список праздников в диапазоне дат (включительно). Параметры можно передавать в любом порядке.
     */
    @GetMapping
    public ResponseEntity<List<HolidayDto>> listBetween(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(holidayService.findBetween(from, to));
    }
}
