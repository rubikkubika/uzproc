package com.uzproc.backend.repository.calendar;

import com.uzproc.backend.entity.calendar.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface HolidayRepository extends JpaRepository<Holiday, Long> {

    List<Holiday> findByCalendarDateBetween(LocalDate fromInclusive, LocalDate toInclusive);
}
