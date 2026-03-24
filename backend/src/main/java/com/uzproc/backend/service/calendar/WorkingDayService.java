package com.uzproc.backend.service.calendar;

import com.uzproc.backend.entity.calendar.Holiday;
import com.uzproc.backend.repository.calendar.HolidayRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Рабочие дни: пн–пт, минус даты из таблицы {@code holidays}.
 */
@Service
@Transactional(readOnly = true)
public class WorkingDayService {

    private final HolidayRepository holidayRepository;
    private final Map<Integer, Set<LocalDate>> holidaysByYear = new ConcurrentHashMap<>();

    public WorkingDayService(HolidayRepository holidayRepository) {
        this.holidayRepository = holidayRepository;
    }

    /** Сброс кэша по годам (после ручного изменения праздников в БД без перезапуска). */
    public void clearHolidayCache() {
        holidaysByYear.clear();
    }

    private Set<LocalDate> holidaysForYear(int year) {
        return holidaysByYear.computeIfAbsent(year, this::loadHolidaysForYear);
    }

    private Set<LocalDate> loadHolidaysForYear(int year) {
        LocalDate from = LocalDate.of(year, 1, 1);
        LocalDate to = LocalDate.of(year, 12, 31);
        List<Holiday> list = holidayRepository.findByCalendarDateBetween(from, to);
        return list.stream().map(Holiday::getCalendarDate).collect(Collectors.toCollection(HashSet::new));
    }

    private Set<LocalDate> holidaysOverlapping(LocalDate from, LocalDate to) {
        if (from == null || to == null) {
            return Set.of();
        }
        LocalDate a = from;
        LocalDate b = to;
        if (a.isAfter(b)) {
            LocalDate t = a;
            a = b;
            b = t;
        }
        Set<LocalDate> out = new HashSet<>();
        for (int y = a.getYear(); y <= b.getYear(); y++) {
            for (LocalDate d : holidaysForYear(y)) {
                if (!d.isBefore(a) && !d.isAfter(b)) {
                    out.add(d);
                }
            }
        }
        return out;
    }

    public boolean isWorkingDay(LocalDate date) {
        DayOfWeek dow = date.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            return false;
        }
        return !holidaysForYear(date.getYear()).contains(date);
    }

    /**
     * Рабочие дни в диапазоне [start, end] включительно (пн–пт, без праздников).
     */
    public long countWorkingDaysInclusive(LocalDate start, LocalDate end) {
        if (start == null || end == null || start.isAfter(end)) {
            return 0;
        }
        Set<LocalDate> holidays = holidaysOverlapping(start, end);
        long n = 0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            if (isWorkingDay(d, holidays)) {
                n++;
            }
        }
        return n;
    }

    private static boolean isWorkingDay(LocalDate d, Set<LocalDate> holidays) {
        DayOfWeek dow = d.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            return false;
        }
        return !holidays.contains(d);
    }

    /**
     * Со следующего календарного дня после {@code assignment} по день {@code end} включительно.
     */
    public long countFromDayAfterThroughInclusive(LocalDateTime assignment, LocalDateTime end) {
        if (assignment == null || end == null) {
            return 0;
        }
        LocalDate start = assignment.toLocalDate().plusDays(1);
        LocalDate endDate = end.toLocalDate();
        if (start.isAfter(endDate)) {
            return 0;
        }
        return countWorkingDaysInclusive(start, endDate);
    }

    /**
     * Подготовка ЗнЗ: со следующего дня после {@code start} по {@code end} включительно;
     * если {@code start} и {@code end} в один календарный день — 0.
     */
    public long countFromDayAfterStartThroughEndInclusive(LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            return 0;
        }
        LocalDate s = start.toLocalDate();
        LocalDate e = end.toLocalDate();
        if (!s.isBefore(e)) {
            return 0;
        }
        LocalDate from = s.plusDays(1);
        if (from.isAfter(e)) {
            return 0;
        }
        return countWorkingDaysInclusive(from, e);
    }

    /**
     * Как на странице заявки для согласований договора: день назначения не считаем;
     * назначение и выполнение в один день → 1, если этот день рабочий.
     */
    public long countContractApprovalWorkingDays(LocalDateTime assignmentDate, LocalDateTime completionDate) {
        if (assignmentDate == null) {
            return 0;
        }
        LocalDate assignDay = assignmentDate.toLocalDate();
        LocalDate start = assignDay.plusDays(1);
        LocalDate end = completionDate != null ? completionDate.toLocalDate() : LocalDate.now();
        LocalDate rangeLo = Stream.of(assignDay, start, end).min(LocalDate::compareTo).orElse(assignDay);
        LocalDate rangeHi = Stream.of(assignDay, start, end).max(LocalDate::compareTo).orElse(end);
        Set<LocalDate> holidays = holidaysOverlapping(rangeLo, rangeHi);
        if (start.isAfter(end)) {
            return isWorkingDay(end, holidays) ? 1 : 0;
        }
        long n = 0;
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            if (isWorkingDay(d, holidays)) {
                n++;
            }
        }
        return n;
    }

    /**
     * Добавляет {@code workingDays} рабочих дней к дате: первый шаг — следующий календарный день после {@code date}.
     */
    public LocalDate addWorkingDaysAfterDate(LocalDate date, int workingDays) {
        if (workingDays <= 0) {
            return date;
        }
        LocalDate result = date;
        int added = 0;
        while (added < workingDays) {
            result = result.plusDays(1);
            if (isWorkingDay(result)) {
                added++;
            }
        }
        return result;
    }
}
