package com.uzproc.backend.service.calendar;

import com.uzproc.backend.dto.calendar.HolidayDto;
import com.uzproc.backend.repository.calendar.HolidayRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class HolidayService {

    private final HolidayRepository holidayRepository;

    public HolidayService(HolidayRepository holidayRepository) {
        this.holidayRepository = holidayRepository;
    }

    public List<HolidayDto> findBetween(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            return List.of();
        }
        LocalDate a = from;
        LocalDate b = to;
        if (a.isAfter(b)) {
            LocalDate t = a;
            a = b;
            b = t;
        }
        return holidayRepository.findByCalendarDateBetween(a, b).stream()
                .map(h -> new HolidayDto(h.getCalendarDate(), h.getName()))
                .sorted(Comparator.comparing(HolidayDto::getCalendarDate))
                .collect(Collectors.toList());
    }
}
