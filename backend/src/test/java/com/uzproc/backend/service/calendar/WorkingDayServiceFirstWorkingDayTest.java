package com.uzproc.backend.service.calendar;

import com.uzproc.backend.entity.calendar.Holiday;
import com.uzproc.backend.repository.calendar.HolidayRepository;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** Первый рабочий день месяца: выходные и праздники из таблицы holidays пропускаются. */
class WorkingDayServiceFirstWorkingDayTest {

    private WorkingDayService serviceWithHolidays(LocalDate... holidays) {
        HolidayRepository repo = mock(HolidayRepository.class);
        List<Holiday> list = java.util.Arrays.stream(holidays).map(d -> {
            Holiday h = new Holiday();
            h.setCalendarDate(d);
            return h;
        }).toList();
        when(repo.findByCalendarDateBetween(any(), any())).thenAnswer(inv -> {
            LocalDate from = inv.getArgument(0);
            LocalDate to = inv.getArgument(1);
            return list.stream()
                    .filter(h -> !h.getCalendarDate().isBefore(from) && !h.getCalendarDate().isAfter(to))
                    .toList();
        });
        return new WorkingDayService(repo);
    }

    @Test
    void firstDayIsWeekday() {
        WorkingDayService s = serviceWithHolidays();
        // 1 октября 2026 — четверг
        assertEquals(LocalDate.of(2026, 10, 1), s.firstWorkingDayOfMonth(YearMonth.of(2026, 10)));
        assertTrue(s.isFirstWorkingDayOfMonth(LocalDate.of(2026, 10, 1)));
        assertFalse(s.isFirstWorkingDayOfMonth(LocalDate.of(2026, 10, 2)));
    }

    @Test
    void firstDayOnWeekendMovesToMonday() {
        WorkingDayService s = serviceWithHolidays();
        // 1 августа 2026 — суббота → 3 августа (понедельник)
        assertEquals(LocalDate.of(2026, 8, 3), s.firstWorkingDayOfMonth(YearMonth.of(2026, 8)));
        assertFalse(s.isFirstWorkingDayOfMonth(LocalDate.of(2026, 8, 1)));
        assertTrue(s.isFirstWorkingDayOfMonth(LocalDate.of(2026, 8, 3)));
        assertFalse(s.isFirstWorkingDayOfMonth(LocalDate.of(2026, 8, 4)));
    }

    @Test
    void holidaysAreSkipped() {
        // 1 января 2027 — пятница (праздник) → 4 января (понедельник)
        WorkingDayService s = serviceWithHolidays(LocalDate.of(2027, 1, 1));
        assertEquals(LocalDate.of(2027, 1, 4), s.firstWorkingDayOfMonth(YearMonth.of(2027, 1)));
        assertTrue(s.isFirstWorkingDayOfMonth(LocalDate.of(2027, 1, 4)));
        assertFalse(s.isFirstWorkingDayOfMonth(LocalDate.of(2027, 1, 1)));
    }
}
