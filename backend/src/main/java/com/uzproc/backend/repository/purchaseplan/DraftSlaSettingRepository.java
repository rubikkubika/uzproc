package com.uzproc.backend.repository.purchaseplan;

import com.uzproc.backend.entity.purchaseplan.DraftSlaSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DraftSlaSettingRepository extends JpaRepository<DraftSlaSetting, Long> {

    List<DraftSlaSetting> findByYearOrderByComplexityAsc(Integer year);

    /** Последний год раньше указанного, для которого задана таблица SLA */
    @Query("SELECT MAX(s.year) FROM DraftSlaSetting s WHERE s.year < :year")
    Optional<Integer> findLatestYearBefore(@Param("year") Integer year);

    /** Ближайший год позже указанного (если драфт на прошлые годы открывают впервые) */
    @Query("SELECT MIN(s.year) FROM DraftSlaSetting s WHERE s.year > :year")
    Optional<Integer> findEarliestYearAfter(@Param("year") Integer year);
}
