package com.uzproc.backend.service.delivery;

import com.uzproc.backend.dto.delivery.DeliveryResponsibleSummaryDto;
import com.uzproc.backend.dto.delivery.DeliveryResponsibleSummaryItemDto;
import com.uzproc.backend.entity.delivery.DeliveryStatus;
import com.uzproc.backend.entity.delivery.ShipmentStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Сводка поставок по ответственным (ФИО): строки — ответственный, колонки — статусы поставки
 * и статусы оплаты, плюс «Просрочено» и «Поставлено» за год.
 * Сделана по образцу сводки по исполнителям в договорах (ContractService#getInWorkSummary):
 * один нативный запрос с группировкой, агрегация в DTO на стороне сервиса.
 *
 * Считается по всем поставкам, без ограничения вкладкой и без фильтров таблицы: клик по ячейке
 * переводит таблицу на вкладку «Все» и ставит ровно те фильтры, по которым посчитано число.
 */
@Service
public class DeliveryResponsibleSummaryService {

    private static final Logger logger = LoggerFactory.getLogger(DeliveryResponsibleSummaryService.class);

    /** Подпись строки для поставок без ответственного */
    private static final String UNASSIGNED = "Не назначен";

    /**
     * Подпись колонки для поставок с незаполненным статусом. Такие поставки есть
     * (статусы проставляются только после выбора схемы оплаты), и без отдельной колонки
     * сумма по статусам не сходилась бы с итогом.
     */
    public static final String NO_STATUS = "Без статуса";

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Считает сводку по ответственным.
     *
     * @param year год для колонки «Поставлено» (по фактической дате поставки); null — текущий год
     */
    @Transactional(readOnly = true)
    public DeliveryResponsibleSummaryDto getResponsibleSummary(Integer year) {
        int targetYear = (year != null) ? year : LocalDate.now().getYear();
        LocalDate yearStart = LocalDate.of(targetYear, 1, 1);
        LocalDate yearEnd = LocalDate.of(targetYear, 12, 31);

        String sql =
            "SELECT TRIM(CONCAT(COALESCE(u.surname,''), ' ', COALESCE(u.name,''))) AS responsible, " +
            "       COALESCE(d.shipment_status, '') AS shipment_status, " +
            "       COALESCE(d.status, '') AS payment_status, " +
            "       COUNT(*) AS total_count, " +
            "       COUNT(*) FILTER (WHERE d.shipment_status IS DISTINCT FROM 'DELIVERED' " +
            "                          AND d.planned_delivery_date IS NOT NULL " +
            "                          AND d.planned_delivery_date < CURRENT_DATE) AS overdue_count, " +
            "       COUNT(*) FILTER (WHERE d.shipment_status = 'DELIVERED' " +
            "                          AND d.actual_delivery_date BETWEEN :yearStart AND :yearEnd) AS delivered_count " +
            "FROM deliveries d " +
            "LEFT JOIN users u ON d.responsible_id = u.id " +
            "GROUP BY 1, 2, 3";

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql)
                .setParameter("yearStart", yearStart)
                .setParameter("yearEnd", yearEnd)
                .getResultList();

        Map<String, DeliveryResponsibleSummaryItemDto> byName = new LinkedHashMap<>();
        // Статусы, по которым реально есть поставки — только они станут колонками
        Set<ShipmentStatus> usedShipmentStatuses = new LinkedHashSet<>();
        Set<DeliveryStatus> usedPaymentStatuses = new LinkedHashSet<>();
        boolean shipmentNoStatus = false;
        boolean paymentNoStatus = false;

        for (Object[] row : rows) {
            String name = row[0] != null ? row[0].toString().trim() : "";
            if (name.isEmpty()) name = UNASSIGNED;
            ShipmentStatus shipmentStatus = ShipmentStatus.fromDisplayName(asString(row[1]));
            DeliveryStatus paymentStatus = DeliveryStatus.fromDisplayName(asString(row[2]));
            long total = asLong(row[3]);

            DeliveryResponsibleSummaryItemDto item =
                    byName.computeIfAbsent(name, DeliveryResponsibleSummaryItemDto::new);
            item.setTotalCount(item.getTotalCount() + total);
            item.setOverdueCount(item.getOverdueCount() + asLong(row[4]));
            item.setDeliveredCount(item.getDeliveredCount() + asLong(row[5]));

            if (shipmentStatus != null) {
                item.getCountByShipmentStatus().merge(shipmentStatus.getDisplayName(), total, Long::sum);
                usedShipmentStatuses.add(shipmentStatus);
            } else {
                item.getCountByShipmentStatus().merge(NO_STATUS, total, Long::sum);
                shipmentNoStatus = true;
            }

            if (paymentStatus != null) {
                item.getCountByPaymentStatus().merge(paymentStatus.getDisplayName(), total, Long::sum);
                usedPaymentStatuses.add(paymentStatus);
            } else {
                item.getCountByPaymentStatus().merge(NO_STATUS, total, Long::sum);
                paymentNoStatus = true;
            }
        }

        // Колонки — в порядке объявления enum, «Без статуса» последней колонкой группы
        List<String> shipmentStatuses = new ArrayList<>();
        for (ShipmentStatus s : ShipmentStatus.values()) {
            if (usedShipmentStatuses.contains(s)) shipmentStatuses.add(s.getDisplayName());
        }
        if (shipmentNoStatus) shipmentStatuses.add(NO_STATUS);

        List<String> paymentStatuses = new ArrayList<>();
        for (DeliveryStatus s : DeliveryStatus.values()) {
            if (usedPaymentStatuses.contains(s)) paymentStatuses.add(s.getDisplayName());
        }
        if (paymentNoStatus) paymentStatuses.add(NO_STATUS);

        List<DeliveryResponsibleSummaryItemDto> items = new ArrayList<>(byName.values());
        items.sort((a, b) -> Long.compare(b.getTotalCount(), a.getTotalCount()));

        logger.info("Delivery responsible summary: year={}, {} responsibles, {} shipment / {} payment status columns",
                targetYear, items.size(), shipmentStatuses.size(), paymentStatuses.size());
        return new DeliveryResponsibleSummaryDto(targetYear, shipmentStatuses, paymentStatuses, items);
    }

    private static String asString(Object value) {
        return value != null ? value.toString() : null;
    }

    private static long asLong(Object value) {
        return value instanceof Number n ? n.longValue() : 0L;
    }
}
