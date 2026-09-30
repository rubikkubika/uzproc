package com.uzproc.backend.repository.sendingcenter;

import com.uzproc.backend.entity.sendingcenter.ComplexityErrorNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ComplexityErrorNotificationRepository extends JpaRepository<ComplexityErrorNotification, Long> {

    /** Все отправки за год — новые сверху (первая по закупщику = последняя отправка). */
    List<ComplexityErrorNotification> findByYearOrderBySentAtDesc(Integer year);
}
