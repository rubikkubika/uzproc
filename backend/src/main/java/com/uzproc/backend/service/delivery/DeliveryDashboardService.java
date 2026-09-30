package com.uzproc.backend.service.delivery;

import com.uzproc.backend.dto.delivery.dashboard.DeliveryBreakdownItemDto;
import com.uzproc.backend.dto.delivery.dashboard.DeliveryCurrencyAmountDto;
import com.uzproc.backend.dto.delivery.dashboard.DeliveryDelayBucketDto;
import com.uzproc.backend.dto.delivery.dashboard.DeliveryDelayMonthDto;
import com.uzproc.backend.dto.delivery.dashboard.DeliveryDisciplineResponseDto;
import com.uzproc.backend.dto.delivery.dashboard.DeliveryEsfMonthDto;
import com.uzproc.backend.dto.delivery.dashboard.DeliveryFinanceResponseDto;
import com.uzproc.backend.dto.delivery.dashboard.DeliveryPulseMonthDto;
import com.uzproc.backend.dto.delivery.dashboard.DeliveryPulseResponseDto;
import com.uzproc.backend.dto.delivery.dashboard.DeliverySupplierOverdueDto;
import com.uzproc.backend.entity.delivery.DeliveryStatus;
import com.uzproc.backend.entity.delivery.PaymentScheme;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Predicate;

/**
 * Дэшборды раздела «Обзор → Дэшборды по поставкам».
 *
 * Все показатели считаются по «фактам» поставок, загруженным одним нативным запросом
 * (поставок немного — тысячи строк), чтобы определения были в одном месте и совпадали
 * с правилами списка поставок (DeliverySpecifications):
 * <ul>
 *   <li><b>Поставлено</b> — статус поставки «Поставлено» (DELIVERED); год/месяц — по фактической дате поставки;</li>
 *   <li><b>Просрочено</b> — не поставлено (включая пустой статус), плановая дата поставки уже прошла (раньше сегодня);</li>
 *   <li><b>Срок поставки</b> — дедлайн (delivery_deadline), а если его нет — плановая дата поставки;</li>
 *   <li><b>В срок</b> — поставлено и фактическая дата ≤ срока поставки. Поставки без фактической даты
 *       или без срока в % «в срок» не входят (ни в числитель, ни в знаменатель);</li>
 *   <li><b>Задержка</b> — фактическая дата − срок поставки в календарных днях (для непоставленных — сегодня − плановая дата);</li>
 *   <li><b>Закрыто</b> — «Поставлено» + статус оплаты «Оплачено» (как вкладка «Закрыто» списка).</li>
 * </ul>
 * Суммы в разных валютах не складываются: везде отдаётся список сумм по валютам.
 */
@Service
public class DeliveryDashboardService {

    private static final Logger logger = LoggerFactory.getLogger(DeliveryDashboardService.class);

    /** Окно «ожидается в ближайшие дни»: плановая дата в [сегодня; сегодня + N]. */
    static final int EXPECTED_WINDOW_DAYS = 7;
    /** Размер топа поставщиков по просрочкам. */
    static final int TOP_SUPPLIERS_LIMIT = 10;
    /** Максимум сегментов в разбивке по схемам оплаты, остальные — в «Прочие». */
    static final int MAX_SCHEME_SEGMENTS = 8;

    private static final String NO_CURRENCY = "не указана";
    private static final String NO_SUPPLIER = "Не указан";
    private static final String NONE_KEY = "NONE";
    private static final String NO_STATUS_LABEL = "Без статуса";
    private static final String NO_SCHEME_LABEL = "Схема не указана";
    private static final String OTHER_KEY = "OTHER";
    private static final String OTHER_LABEL = "Прочие";

    @PersistenceContext
    private EntityManager entityManager;

    /** Строка «фактов» по поставке — всё, что нужно дэшбордам. */
    private record Fact(
            boolean delivered,
            String paymentStatus,
            LocalDate planned,
            LocalDate deadline,
            LocalDate actual,
            LocalDate esf,
            LocalDate reportDate,
            BigDecimal amount,
            String currency,
            String supplier,
            String paymentScheme,
            String paymentSchemeLabel
    ) {
        /** Срок поставки: дедлайн, а без него — плановая дата. */
        LocalDate dueDate() {
            return deadline != null ? deadline : planned;
        }

        boolean deliveredIn(int year) {
            return delivered && actual != null && actual.getYear() == year;
        }

        /** Поставлено и срок известен — можно посчитать задержку. */
        boolean measurable() {
            return delivered && actual != null && dueDate() != null;
        }

        /** Задержка поставленной поставки в календарных днях (≤ 0 — в срок). */
        long delayDays() {
            return ChronoUnit.DAYS.between(dueDate(), actual);
        }

        boolean overdue(LocalDate today) {
            return !delivered && planned != null && planned.isBefore(today);
        }

        /** Дата, по которой поставка относится к году на дэшборде «Деньги и документы». */
        LocalDate cohortDate() {
            if (actual != null) return actual;
            if (planned != null) return planned;
            return reportDate;
        }
    }

    // ───────────────────────────── Пульс поставок ─────────────────────────────

    @Transactional(readOnly = true)
    public DeliveryPulseResponseDto getPulse(Integer year) {
        int y = resolveYear(year);
        LocalDate today = LocalDate.now();
        List<Fact> facts = loadFacts();

        List<Fact> deliveredYear = facts.stream().filter(f -> f.deliveredIn(y)).toList();
        List<Fact> overdueNow = facts.stream().filter(f -> f.overdue(today)).toList();
        LocalDate windowEnd = today.plusDays(EXPECTED_WINDOW_DAYS);
        List<Fact> expected = facts.stream()
                .filter(f -> !f.delivered() && f.planned() != null
                        && !f.planned().isBefore(today) && !f.planned().isAfter(windowEnd))
                .toList();

        long withoutEsf = deliveredYear.stream().filter(f -> f.esf() == null).count();
        long closed = deliveredYear.stream().filter(f -> DeliveryStatus.PAID.name().equals(f.paymentStatus())).count();
        long measurable = deliveredYear.stream().filter(Fact::measurable).count();
        long onTime = deliveredYear.stream().filter(f -> f.measurable() && f.delayDays() <= 0).count();

        List<DeliveryPulseMonthDto> months = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            final int month = m;
            List<Fact> monthDelivered = deliveredYear.stream().filter(f -> f.actual().getMonthValue() == month).toList();
            long mMeasurable = monthDelivered.stream().filter(Fact::measurable).count();
            long mOnTime = monthDelivered.stream().filter(f -> f.measurable() && f.delayDays() <= 0).count();
            long mOverdue = overdueNow.stream()
                    .filter(f -> f.planned().getYear() == y && f.planned().getMonthValue() == month)
                    .count();
            months.add(new DeliveryPulseMonthDto(month, monthDelivered.size(), mOnTime, mMeasurable,
                    percentage(mOnTime, mMeasurable), mOverdue));
        }

        logger.info("Delivery pulse dashboard: year={}, delivered={}, overdue={}, expected7={}",
                y, deliveredYear.size(), overdueNow.size(), expected.size());
        return new DeliveryPulseResponseDto(y, today,
                deliveredYear.size(), amountsByCurrency(deliveredYear),
                overdueNow.size(), amountsByCurrency(overdueNow),
                withoutEsf,
                expected.size(), amountsByCurrency(expected),
                closed, onTime, measurable, percentage(onTime, measurable), months);
    }

    // ───────────────────────────── Дисциплина сроков ─────────────────────────────

    @Transactional(readOnly = true)
    public DeliveryDisciplineResponseDto getDiscipline(Integer year) {
        int y = resolveYear(year);
        LocalDate today = LocalDate.now();
        List<Fact> facts = loadFacts();

        List<Fact> deliveredYear = facts.stream().filter(f -> f.deliveredIn(y)).toList();
        List<Fact> measurable = deliveredYear.stream().filter(Fact::measurable).toList();
        List<Fact> late = measurable.stream().filter(f -> f.delayDays() > 0).toList();
        // Непоставленные с плановой датой в году, которая уже прошла
        List<Fact> openOverdue = facts.stream()
                .filter(f -> f.overdue(today) && f.planned().getYear() == y)
                .toList();

        long[] deliveredBuckets = new long[4];
        measurable.forEach(f -> deliveredBuckets[bucketIndex(f.delayDays())]++);
        long[] openBuckets = new long[4];
        openOverdue.forEach(f -> openBuckets[bucketIndex(ChronoUnit.DAYS.between(f.planned(), today))]++);
        List<DeliveryDelayBucketDto> buckets = List.of(
                new DeliveryDelayBucketDto("on-time", "В срок (0 дн.)", deliveredBuckets[0], openBuckets[0]),
                new DeliveryDelayBucketDto("1-7", "1–7 дн.", deliveredBuckets[1], openBuckets[1]),
                new DeliveryDelayBucketDto("8-30", "8–30 дн.", deliveredBuckets[2], openBuckets[2]),
                new DeliveryDelayBucketDto("30-plus", "Более 30 дн.", deliveredBuckets[3], openBuckets[3]));

        List<DeliveryDelayMonthDto> months = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            final int month = m;
            long mMeasurable = measurable.stream().filter(f -> f.actual().getMonthValue() == month).count();
            List<Fact> mLate = late.stream().filter(f -> f.actual().getMonthValue() == month).toList();
            months.add(new DeliveryDelayMonthDto(month, mMeasurable, mLate.size(), averageDelay(mLate)));
        }

        List<DeliverySupplierOverdueDto> topSuppliers = topSuppliers(late, openOverdue, today);

        logger.info("Delivery discipline dashboard: year={}, measurable={}, late={}, openOverdue={}",
                y, measurable.size(), late.size(), openOverdue.size());
        return new DeliveryDisciplineResponseDto(y, measurable.size(), deliveredYear.size() - measurable.size(),
                late.size(), averageDelay(late), buckets, months, topSuppliers);
    }

    /** Корзина задержки: 0 — в срок (≤ 0), 1 — 1–7, 2 — 8–30, 3 — более 30 дней. */
    private static int bucketIndex(long delayDays) {
        if (delayDays <= 0) return 0;
        if (delayDays <= 7) return 1;
        if (delayDays <= 30) return 2;
        return 3;
    }

    private static Double averageDelay(List<Fact> late) {
        if (late.isEmpty()) return null;
        return round1(late.stream().mapToLong(Fact::delayDays).average().orElse(0));
    }

    private List<DeliverySupplierOverdueDto> topSuppliers(List<Fact> late, List<Fact> openOverdue, LocalDate today) {
        Map<String, long[]> bySupplier = new HashMap<>(); // [lateDelivered, openOverdue, sumDelay, maxDelay]
        for (Fact f : late) {
            long[] acc = bySupplier.computeIfAbsent(supplierName(f), k -> new long[4]);
            long delay = f.delayDays();
            acc[0]++;
            acc[2] += delay;
            acc[3] = Math.max(acc[3], delay);
        }
        for (Fact f : openOverdue) {
            long[] acc = bySupplier.computeIfAbsent(supplierName(f), k -> new long[4]);
            long delay = ChronoUnit.DAYS.between(f.planned(), today);
            acc[1]++;
            acc[2] += delay;
            acc[3] = Math.max(acc[3], delay);
        }
        return bySupplier.entrySet().stream()
                .map(e -> {
                    long[] a = e.getValue();
                    long total = a[0] + a[1];
                    return new DeliverySupplierOverdueDto(e.getKey(), a[0], a[1], total,
                            round1((double) a[2] / total), a[3]);
                })
                .sorted(Comparator.comparingLong(DeliverySupplierOverdueDto::totalCount).reversed()
                        .thenComparing(Comparator.comparingDouble(DeliverySupplierOverdueDto::averageDelayDays).reversed())
                        .thenComparing(DeliverySupplierOverdueDto::supplier))
                .limit(TOP_SUPPLIERS_LIMIT)
                .toList();
    }

    private static String supplierName(Fact f) {
        return f.supplier() != null && !f.supplier().isBlank() ? f.supplier().trim() : NO_SUPPLIER;
    }

    // ───────────────────────────── Деньги и документы ─────────────────────────────

    @Transactional(readOnly = true)
    public DeliveryFinanceResponseDto getFinance(Integer year) {
        int y = resolveYear(year);
        List<Fact> facts = loadFacts();
        List<Fact> cohort = facts.stream()
                .filter(f -> f.cohortDate() != null && f.cohortDate().getYear() == y)
                .toList();

        // Статус оплаты — в порядке enum, «Без статуса» последним; пустые сегменты не отдаём
        List<DeliveryBreakdownItemDto> byStatus = new ArrayList<>();
        for (DeliveryStatus s : DeliveryStatus.values()) {
            addSegment(byStatus, s.name(), s.getDisplayName(), cohort, f -> s.name().equals(f.paymentStatus()));
        }
        addSegment(byStatus, NONE_KEY, NO_STATUS_LABEL, cohort, f -> f.paymentStatus() == null);

        List<DeliveryBreakdownItemDto> byScheme = schemeBreakdown(cohort);

        List<Fact> deliveredYear = facts.stream().filter(f -> f.deliveredIn(y)).toList();
        List<DeliveryEsfMonthDto> esfByMonth = new ArrayList<>();
        for (int m = 1; m <= 12; m++) {
            final int month = m;
            List<Fact> monthDelivered = deliveredYear.stream().filter(f -> f.actual().getMonthValue() == month).toList();
            long withoutEsf = monthDelivered.stream().filter(f -> f.esf() == null).count();
            esfByMonth.add(new DeliveryEsfMonthDto(month, monthDelivered.size(), withoutEsf));
        }
        long deliveredWithoutEsf = deliveredYear.stream().filter(f -> f.esf() == null).count();

        long[] undistributed = countUndistributedPayments(y);

        logger.info("Delivery finance dashboard: year={}, cohort={}, undistributedPayments={}",
                y, cohort.size(), undistributed[0]);
        return new DeliveryFinanceResponseDto(y, cohort.size(), byStatus, byScheme, esfByMonth,
                deliveredWithoutEsf, undistributed[0], undistributed[1]);
    }

    private void addSegment(List<DeliveryBreakdownItemDto> target, String key, String label,
                            List<Fact> cohort, Predicate<Fact> filter) {
        List<Fact> matched = cohort.stream().filter(filter).toList();
        if (!matched.isEmpty()) {
            target.add(new DeliveryBreakdownItemDto(key, label, matched.size(), amountsByCurrency(matched)));
        }
    }

    /**
     * Разбивка по схеме оплаты: подпись схемы из справочника («20/80/20 б.д.»), а если её нет —
     * тип схемы (Предоплата / Постоплата). Крупнейшие сегменты отдельно, остальные — «Прочие».
     */
    private List<DeliveryBreakdownItemDto> schemeBreakdown(List<Fact> cohort) {
        Map<String, List<Fact>> byLabel = new LinkedHashMap<>();
        for (Fact f : cohort) {
            byLabel.computeIfAbsent(schemeLabel(f), k -> new ArrayList<>()).add(f);
        }
        List<Map.Entry<String, List<Fact>>> sorted = byLabel.entrySet().stream()
                .sorted(Comparator.comparingInt((Map.Entry<String, List<Fact>> e) -> e.getValue().size()).reversed())
                .toList();
        List<DeliveryBreakdownItemDto> result = new ArrayList<>();
        List<Fact> other = new ArrayList<>();
        for (int i = 0; i < sorted.size(); i++) {
            Map.Entry<String, List<Fact>> e = sorted.get(i);
            if (i < MAX_SCHEME_SEGMENTS - 1 || sorted.size() == MAX_SCHEME_SEGMENTS) {
                result.add(new DeliveryBreakdownItemDto(e.getKey(), e.getKey(), e.getValue().size(),
                        amountsByCurrency(e.getValue())));
            } else {
                other.addAll(e.getValue());
            }
        }
        if (!other.isEmpty()) {
            result.add(new DeliveryBreakdownItemDto(OTHER_KEY, OTHER_LABEL, other.size(), amountsByCurrency(other)));
        }
        return result;
    }

    private static String schemeLabel(Fact f) {
        if (f.paymentSchemeLabel() != null && !f.paymentSchemeLabel().isBlank()) return f.paymentSchemeLabel().trim();
        if (PaymentScheme.PREPAYMENT.name().equals(f.paymentScheme())) return "Предоплата";
        if (PaymentScheme.POSTPAYMENT.name().equals(f.paymentScheme())) return "Постоплата";
        return NO_SCHEME_LABEL;
    }

    /**
     * Оплаты без типа (Аванс/По факту), привязанные к поставкам года (та же дата отнесения к году,
     * что и у разбивок). Оплата, привязанная к нескольким поставкам, считается один раз.
     *
     * @return [количество оплат без типа, количество поставок с такими оплатами]
     */
    private long[] countUndistributedPayments(int year) {
        String sql =
            "SELECT COUNT(DISTINCT p.id), COUNT(DISTINCT d.id) " +
            "FROM deliveries d " +
            "JOIN delivery_payments dp ON dp.delivery_id = d.id " +
            "JOIN payments p ON p.id = dp.payment_id " +
            "WHERE p.payment_type IS NULL " +
            "  AND COALESCE(d.actual_delivery_date, d.planned_delivery_date, d.date) BETWEEN :yearStart AND :yearEnd";
        Object[] row = (Object[]) entityManager.createNativeQuery(sql)
                .setParameter("yearStart", LocalDate.of(year, 1, 1))
                .setParameter("yearEnd", LocalDate.of(year, 12, 31))
                .getSingleResult();
        return new long[]{asLong(row[0]), asLong(row[1])};
    }

    // ───────────────────────────── Общие утилиты ─────────────────────────────

    private List<Fact> loadFacts() {
        String sql =
            "SELECT d.shipment_status, d.status, d.planned_delivery_date, d.delivery_deadline, " +
            "       d.actual_delivery_date, d.esf_date, d.date, d.amount, d.currency, s.name, " +
            "       d.payment_scheme, ps.label " +
            "FROM deliveries d " +
            "LEFT JOIN suppliers s ON s.id = d.supplier_id " +
            "LEFT JOIN delivery_payment_schemes ps ON ps.id = d.payment_scheme_id";
        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql).getResultList();
        List<Fact> facts = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            facts.add(new Fact(
                    "DELIVERED".equals(asString(r[0])),
                    blankToNull(asString(r[1])),
                    asDate(r[2]),
                    asDate(r[3]),
                    asDate(r[4]),
                    asDate(r[5]),
                    asDate(r[6]),
                    r[7] instanceof BigDecimal b ? b : (r[7] instanceof Number n ? BigDecimal.valueOf(n.doubleValue()) : null),
                    asString(r[8]),
                    asString(r[9]),
                    asString(r[10]),
                    asString(r[11])));
        }
        return facts;
    }

    /** Суммы по валютам: UZS первой, остальные по алфавиту, «не указана» последней. Поставки без суммы пропускаются. */
    private static List<DeliveryCurrencyAmountDto> amountsByCurrency(List<Fact> facts) {
        Map<String, BigDecimal> sums = new TreeMap<>(Comparator
                .comparingInt((String c) -> "UZS".equals(c) ? 0 : NO_CURRENCY.equals(c) ? 2 : 1)
                .thenComparing(Comparator.naturalOrder()));
        for (Fact f : facts) {
            if (f.amount() == null) continue;
            String currency = f.currency() != null && !f.currency().isBlank()
                    ? f.currency().trim().toUpperCase() : NO_CURRENCY;
            sums.merge(currency, f.amount(), BigDecimal::add);
        }
        List<DeliveryCurrencyAmountDto> result = new ArrayList<>();
        sums.forEach((c, a) -> result.add(new DeliveryCurrencyAmountDto(c, a)));
        return result;
    }

    private static int resolveYear(Integer year) {
        return year != null ? year : LocalDate.now().getYear();
    }

    private static Double percentage(long part, long total) {
        return total > 0 ? round1(part * 100.0 / total) : null;
    }

    private static double round1(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private static LocalDate asDate(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDate d) return d;
        if (value instanceof Date d) return d.toLocalDate();
        return LocalDate.parse(value.toString().substring(0, 10));
    }

    private static String asString(Object value) {
        return value != null ? value.toString() : null;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private static long asLong(Object value) {
        return value instanceof Number n ? n.longValue() : 0L;
    }
}
