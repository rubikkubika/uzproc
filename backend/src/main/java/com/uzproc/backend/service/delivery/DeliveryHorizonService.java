package com.uzproc.backend.service.delivery;

import com.uzproc.backend.dto.delivery.DeliveryFilterParams;
import com.uzproc.backend.dto.delivery.DeliveryHorizonDto;
import com.uzproc.backend.entity.delivery.Delivery;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Tuple;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Root;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.uzproc.backend.service.delivery.DeliverySpecifications.HORIZON_LATER;
import static com.uzproc.backend.service.delivery.DeliverySpecifications.HORIZON_NO_DATE;
import static com.uzproc.backend.service.delivery.DeliverySpecifications.HORIZON_OVER;
import static com.uzproc.backend.service.delivery.DeliverySpecifications.HORIZON_TODAY;
import static com.uzproc.backend.service.delivery.DeliverySpecifications.HORIZON_WEEK;
import static com.uzproc.backend.service.delivery.DeliverySpecifications.HORIZON_WEEK_DAYS;

/**
 * Горизонт непоставленных поставок для блока «По дням»: отвечает на вопрос «что горит».
 * Один групповой запрос по плановой дате с фильтрами списка (без выбранного дня и группы),
 * дальше даты раскладываются по группам относительно сегодняшнего дня.
 */
@Service
@Transactional(readOnly = true)
public class DeliveryHorizonService {

    private static final Logger logger = LoggerFactory.getLogger(DeliveryHorizonService.class);

    private final EntityManager entityManager;

    public DeliveryHorizonService(EntityManager entityManager) {
        this.entityManager = entityManager;
    }

    public DeliveryHorizonDto getHorizon(DeliveryFilterParams filter) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<Tuple> query = cb.createTupleQuery();
        Root<Delivery> root = query.from(Delivery.class);
        Path<LocalDate> planned = root.get("plannedDeliveryDate");

        query.multiselect(planned, cb.count(root))
                .where(cb.and(
                        DeliverySpecifications.build(filter.withoutDaySelection()).toPredicate(root, query, cb),
                        DeliverySpecifications.notDelivered(root, cb)))
                .groupBy(planned)
                .orderBy(cb.asc(planned));

        LocalDate today = LocalDate.now();
        LocalDate weekEnd = today.plusDays(HORIZON_WEEK_DAYS);
        Map<String, List<DeliveryHorizonDto.Day>> days = new LinkedHashMap<>();
        Map<String, Long> counts = new LinkedHashMap<>();
        for (String key : List.of(HORIZON_OVER, HORIZON_TODAY, HORIZON_WEEK, HORIZON_LATER, HORIZON_NO_DATE)) {
            days.put(key, new ArrayList<>());
            counts.put(key, 0L);
        }

        for (Tuple row : entityManager.createQuery(query).getResultList()) {
            LocalDate date = row.get(0, LocalDate.class);
            long count = row.get(1, Long.class);
            String key = date == null ? HORIZON_NO_DATE
                    : date.isBefore(today) ? HORIZON_OVER
                    : date.isEqual(today) ? HORIZON_TODAY
                    : date.isAfter(weekEnd) ? HORIZON_LATER
                    : HORIZON_WEEK;
            counts.merge(key, count, Long::sum);
            if (date != null) {
                days.get(key).add(new DeliveryHorizonDto.Day(date, count));
            }
        }

        List<DeliveryHorizonDto.Group> groups = new ArrayList<>();
        counts.forEach((key, count) -> groups.add(new DeliveryHorizonDto.Group(key, count, days.get(key))));
        logger.info("Delivery horizon: {}", counts);
        return new DeliveryHorizonDto(today, HORIZON_WEEK_DAYS, groups);
    }
}
