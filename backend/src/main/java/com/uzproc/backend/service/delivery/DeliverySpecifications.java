package com.uzproc.backend.service.delivery;

import com.uzproc.backend.dto.delivery.DeliveryFilterParams;
import com.uzproc.backend.entity.delivery.Delivery;
import com.uzproc.backend.entity.delivery.DeliveryComment;
import com.uzproc.backend.entity.delivery.DeliveryStatus;
import com.uzproc.backend.entity.delivery.PaymentScheme;
import com.uzproc.backend.entity.delivery.ShipmentStatus;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.CriteriaQuery;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * JPA-спецификации списка поставок. Единый источник логики фильтрации для списка, счётчиков вкладок,
 * диаграммы «По дням» и горизонта — поэтому все они показывают одни и те же записи.
 *
 * Все составные условия построены null-безопасно (NULL-статусы дают TRUE/FALSE, а не UNKNOWN),
 * чтобы их отрицание не теряло строки с незаполненными полями.
 */
public final class DeliverySpecifications {

    private static final Logger logger = LoggerFactory.getLogger(DeliverySpecifications.class);

    /** Спецзначение фильтров статуса поставки и статуса оплаты: статус не заполнен (колонка «Без статуса» в сводке). */
    public static final String STATUS_NONE = "NONE";

    public static final String TAB_ALL = "all";
    public static final String TAB_IN_WORK = "in-work";
    public static final String TAB_CLOSED = "closed";
    public static final String TAB_CLOSED_REVIEW = "closed-review";

    public static final String HORIZON_OVER = "over";
    public static final String HORIZON_TODAY = "today";
    public static final String HORIZON_WEEK = "week";
    public static final String HORIZON_LATER = "later";
    public static final String HORIZON_NO_DATE = "nodate";

    /** Горизонт «Ближайшие дни»: плановая дата в (сегодня; сегодня + N] */
    public static final int HORIZON_WEEK_DAYS = 7;

    /** Значения «Статуса отчёта» (свободный текст из Excel) — в нижнем регистре, без пробелов по краям. */
    private static final String REPORT_CLOSED = "закрыто";
    private static final String REPORT_AWAITING_DELIVERY = "ожидаем поставку";
    private static final String REPORT_FULLY_DELIVERED = "полностью поставлено";
    private static final String REPORT_AWAITING_BALANCE = "ожидает доплату";
    private static final String REPORT_PARTIALLY_DELIVERED = "частично поставлено";

    private DeliverySpecifications() {
    }

    public static Specification<Delivery> build(DeliveryFilterParams p) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            addLike(predicates, cb, cb.lower(root.get("innerId")), p.getInnerId());

            if (hasText(p.getContractInnerId())) {
                var contractJoin = root.join("contract", JoinType.LEFT);
                addLike(predicates, cb, cb.lower(contractJoin.get("innerId")), p.getContractInnerId());
            }

            // Номер заявки на закупку берётся из связанного договора-спецификации.
            // Фильтр текстовый (поиск по вхождению), поэтому число приводится к строке.
            if (hasText(p.getContractPurchaseRequestId())) {
                var contractJoin = root.join("contract", JoinType.LEFT);
                predicates.add(cb.like(
                        contractJoin.get("purchaseRequestId").as(String.class),
                        "%" + p.getContractPurchaseRequestId().trim() + "%"));
            }

            if (hasText(p.getContractSubject())) {
                var contractJoin = root.join("contract", JoinType.LEFT);
                addLike(predicates, cb, cb.lower(contractJoin.get("subjectOrName")), p.getContractSubject());
            }

            if (hasText(p.getSupplierName())) {
                var supplierJoin = root.join("supplier", JoinType.LEFT);
                addLike(predicates, cb, cb.lower(supplierJoin.get("name")), p.getSupplierName());
            }

            if (hasText(p.getStatus())) {
                // Спецзначение из сводки по ответственным: поставки с незаполненным статусом оплаты
                if (STATUS_NONE.equalsIgnoreCase(p.getStatus().trim())) {
                    predicates.add(cb.isNull(root.get("status")));
                } else {
                    DeliveryStatus parsed = DeliveryStatus.fromDisplayName(p.getStatus().trim());
                    // нет совпадения по displayName/name — гарантированно пустой результат
                    predicates.add(parsed != null ? cb.equal(root.get("status"), parsed) : cb.disjunction());
                }
            }

            addLike(predicates, cb, cb.lower(root.get("currency")), p.getCurrency());
            // Поиск по тексту любого комментария поставки
            if (hasText(p.getComment())) {
                Subquery<Long> commentSub = query.subquery(Long.class);
                Root<DeliveryComment> commentRoot = commentSub.from(DeliveryComment.class);
                commentSub.select(commentRoot.get("id")).where(
                        cb.equal(commentRoot.get("delivery"), root),
                        cb.like(cb.lower(commentRoot.get("text")), "%" + p.getComment().trim().toLowerCase() + "%"));
                predicates.add(cb.exists(commentSub));
            }

            if (hasText(p.getResponsibleName())) {
                var userJoin = root.join("responsible", JoinType.LEFT);
                String lowerFilter = "%" + p.getResponsibleName().trim().toLowerCase() + "%";
                // Полное отображаемое имя «Фамилия Имя» — для точного совпадения из выпадающего списка.
                var fullName = cb.lower(cb.concat(cb.concat(
                        cb.coalesce(userJoin.<String>get("surname"), ""), " "),
                        cb.coalesce(userJoin.<String>get("name"), "")));
                predicates.add(cb.or(
                        cb.like(cb.lower(userJoin.get("surname")), lowerFilter),
                        cb.like(cb.lower(userJoin.get("name")), lowerFilter),
                        cb.like(fullName, lowerFilter)
                ));
            }

            // Фильтр по конкретному дню (клик по дню ленты). День объединяет два среза:
            // непоставленные поставки с плановой датой в этот день и поставленные с фактической
            // датой поставки в этот день — таблица показывает и то, и другое.
            LocalDate day = parseDate(p.getPlannedDeliveryDate(), "plannedDeliveryDate");
            if (day != null) {
                predicates.add(cb.or(
                        cb.and(notDelivered(root, cb), cb.equal(root.get("plannedDeliveryDate"), day)),
                        cb.and(delivered(root, cb), cb.equal(root.get("actualDeliveryDate"), day))
                ));
            }

            if (Boolean.TRUE.equals(p.getDateNull())) {
                predicates.add(cb.isNull(root.get("date")));
            } else if (p.getDateYear() != null) {
                predicates.add(cb.between(root.get("date"),
                        LocalDate.of(p.getDateYear(), 1, 1), LocalDate.of(p.getDateYear(), 12, 31)));
            }

            if (hasText(p.getPaymentScheme())) {
                try {
                    PaymentScheme scheme = PaymentScheme.valueOf(p.getPaymentScheme().trim().toUpperCase());
                    predicates.add(cb.equal(root.get("paymentScheme"), scheme));
                } catch (IllegalArgumentException ignored) {
                    // некорректное значение — фильтр пропускаем
                }
            }

            if (hasText(p.getShipmentStatus())) {
                // Спецзначение из сводки по ответственным: поставки с незаполненным статусом
                if (STATUS_NONE.equalsIgnoreCase(p.getShipmentStatus().trim())) {
                    predicates.add(cb.isNull(root.get("shipmentStatus")));
                } else {
                    ShipmentStatus parsed = ShipmentStatus.fromDisplayName(p.getShipmentStatus().trim());
                    predicates.add(parsed != null ? cb.equal(root.get("shipmentStatus"), parsed) : cb.disjunction());
                }
            }

            // «Просрочено» из сводки: ещё не поставлено, а плановая дата поставки уже прошла
            if (Boolean.TRUE.equals(p.getOverdue())) {
                predicates.add(overdue(root, cb));
            }

            // «Поставлено за год» из сводки: статус «Поставлено» и фактическая дата поставки в этом году
            if (p.getDeliveredYear() != null) {
                predicates.add(cb.and(
                        delivered(root, cb),
                        cb.between(root.get("actualDeliveryDate"),
                                LocalDate.of(p.getDeliveredYear(), 1, 1),
                                LocalDate.of(p.getDeliveredYear(), 12, 31))));
            }

            addLike(predicates, cb, cb.lower(root.get("reportStatus")), p.getReportStatus());

            if (hasText(p.getPaymentsStatus())) {
                Predicate paymentsPredicate = paymentsStatus(root, query, cb, p.getPaymentsStatus());
                if (paymentsPredicate != null) predicates.add(paymentsPredicate);
            }

            if (hasText(p.getTab())) {
                Predicate tabPredicate = tab(root, cb, p.getTab().trim());
                if (tabPredicate != null) predicates.add(tabPredicate);
            }

            if (hasText(p.getHorizon())) {
                Predicate horizonPredicate = horizon(root, cb, p.getHorizon().trim());
                if (horizonPredicate != null) predicates.add(horizonPredicate);
            }

            if (hasText(p.getSignal())) {
                Predicate signalPredicate = signal(root, query, cb, p.getSignal().trim());
                if (signalPredicate != null) predicates.add(signalPredicate);
            }

            if (hasText(p.getEsf())) {
                switch (p.getEsf().trim()) {
                    case "present" -> predicates.add(cb.isNotNull(root.get("esfDate")));
                    case "missing" -> predicates.add(cb.isNull(root.get("esfDate")));
                    default -> logger.warn("Delivery list: неизвестное значение esf '{}' — фильтр пропущен", p.getEsf());
                }
            }

            if (hasText(p.getDiscrepancy())) {
                switch (p.getDiscrepancy().trim()) {
                    case "yes" -> predicates.add(reportDiscrepancy(root, cb));
                    case "no" -> predicates.add(cb.not(reportDiscrepancy(root, cb)));
                    default -> logger.warn("Delivery list: неизвестное значение discrepancy '{}' — фильтр пропущен", p.getDiscrepancy());
                }
            }

            LocalDate plannedFrom = parseDate(p.getPlannedFrom(), "plannedFrom");
            if (plannedFrom != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("plannedDeliveryDate"), plannedFrom));
            }
            LocalDate plannedTo = parseDate(p.getPlannedTo(), "plannedTo");
            if (plannedTo != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("plannedDeliveryDate"), plannedTo));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    /** Статус поставки «Поставлено» (FALSE для незаполненного статуса). */
    public static Predicate delivered(Root<Delivery> root, CriteriaBuilder cb) {
        return cb.and(cb.isNotNull(root.get("shipmentStatus")),
                cb.equal(root.get("shipmentStatus"), ShipmentStatus.DELIVERED));
    }

    /** Ещё не поставлено, включая незаполненный статус. */
    public static Predicate notDelivered(Root<Delivery> root, CriteriaBuilder cb) {
        return cb.or(cb.isNull(root.get("shipmentStatus")),
                cb.notEqual(root.get("shipmentStatus"), ShipmentStatus.DELIVERED));
    }

    /** Просрочено: не поставлено, а плановая дата поставки уже прошла. */
    private static Predicate overdue(Root<Delivery> root, CriteriaBuilder cb) {
        return cb.and(notDelivered(root, cb),
                cb.isNotNull(root.get("plannedDeliveryDate")),
                cb.lessThan(root.get("plannedDeliveryDate"), LocalDate.now()));
    }

    private static Predicate paid(Root<Delivery> root, CriteriaBuilder cb) {
        return cb.and(cb.isNotNull(root.get("status")), cb.equal(root.get("status"), DeliveryStatus.PAID));
    }

    /** Закрыто по правилам системы: «Поставлено» + «Оплачено». */
    private static Predicate closedByRules(Root<Delivery> root, CriteriaBuilder cb) {
        return cb.and(delivered(root, cb), paid(root, cb));
    }

    private static Predicate notClosedByRules(Root<Delivery> root, CriteriaBuilder cb) {
        return cb.or(notDelivered(root, cb), cb.not(paid(root, cb)));
    }

    /** «Статус отчёта» равен значению (без учёта регистра и пробелов по краям); FALSE для пустого статуса. */
    private static Predicate reportIs(Root<Delivery> root, CriteriaBuilder cb, String value) {
        return cb.and(cb.isNotNull(root.get("reportStatus")),
                cb.equal(cb.lower(cb.trim(root.<String>get("reportStatus"))), value));
    }

    /**
     * Ручной отчёт противоречит состоянию поставки в системе. Правила совпадают с фронтом
     * (utils/delivery-signal.utils.ts): «Закрыто» — но не закрыто по правилам; «Ожидаем поставку» —
     * но уже поставлено; «Полностью поставлено» — но не поставлено; «Ожидает доплату» — но не поставлено
     * или уже оплачено; «Частично поставлено» — но в системе поставка полная.
     * Прочие значения отчёта расхождением не считаются.
     */
    public static Predicate reportDiscrepancy(Root<Delivery> root, CriteriaBuilder cb) {
        return cb.or(
                cb.and(reportIs(root, cb, REPORT_CLOSED), notClosedByRules(root, cb)),
                cb.and(reportIs(root, cb, REPORT_AWAITING_DELIVERY), delivered(root, cb)),
                cb.and(reportIs(root, cb, REPORT_FULLY_DELIVERED), notDelivered(root, cb)),
                cb.and(reportIs(root, cb, REPORT_AWAITING_BALANCE), cb.or(notDelivered(root, cb), paid(root, cb))),
                cb.and(reportIs(root, cb, REPORT_PARTIALLY_DELIVERED), delivered(root, cb))
        );
    }

    /**
     * Вкладки. Взаимоисключающие: поставка попадает ровно в одну.
     *   «Закрыто»            — статус отгрузки DELIVERED И статус оплаты PAID (правила системы);
     *   «Закрыто-разобрать»  — в отчёте «Закрыто», но по правилам поставка не закрыта;
     *   «В работе»           — всё остальное.
     */
    private static Predicate tab(Root<Delivery> root, CriteriaBuilder cb, String tab) {
        Predicate closedInReport = reportIs(root, cb, REPORT_CLOSED);
        return switch (tab) {
            case TAB_CLOSED -> closedByRules(root, cb);
            case TAB_CLOSED_REVIEW -> cb.and(closedInReport, notClosedByRules(root, cb));
            case TAB_IN_WORK -> cb.and(notClosedByRules(root, cb), cb.not(closedInReport));
            // «Все» и любое неизвестное значение — без фильтра по состоянию.
            // Исключение здесь роняло бы запрос, а при stateless-JWT ошибка контроллера
            // возвращается клиенту как 403 и выглядит как проблема доступа.
            case TAB_ALL -> null;
            default -> {
                logger.warn("Delivery list: неизвестная вкладка '{}' — фильтр по вкладке пропущен", tab);
                yield null;
            }
        };
    }

    /** Группа горизонта: где плановая дата непоставленной поставки относительно сегодняшнего дня. */
    private static Predicate horizon(Root<Delivery> root, CriteriaBuilder cb, String horizon) {
        LocalDate today = LocalDate.now();
        Expression<LocalDate> planned = root.get("plannedDeliveryDate");
        Predicate open = notDelivered(root, cb);
        return switch (horizon) {
            case HORIZON_OVER -> overdue(root, cb);
            case HORIZON_TODAY -> cb.and(open, cb.equal(planned, today));
            case HORIZON_WEEK -> cb.and(open, cb.greaterThan(planned, today),
                    cb.lessThanOrEqualTo(planned, today.plusDays(HORIZON_WEEK_DAYS)));
            case HORIZON_LATER -> cb.and(open, cb.greaterThan(planned, today.plusDays(HORIZON_WEEK_DAYS)));
            case HORIZON_NO_DATE -> cb.and(open, cb.isNull(planned));
            default -> {
                logger.warn("Delivery list: неизвестная группа горизонта '{}' — фильтр пропущен", horizon);
                yield null;
            }
        };
    }

    /** Сигнал строки («что делать»): фильтрует по условию сигнала, независимо от приоритета показа. */
    private static Predicate signal(Root<Delivery> root, CriteriaQuery<?> query, CriteriaBuilder cb, String signal) {
        return switch (signal) {
            case "overdue" -> overdue(root, cb);
            case "discrepancy" -> reportDiscrepancy(root, cb);
            case "undistributed" -> paymentsStatus(root, query, cb, "undistributed");
            case "no-esf" -> cb.and(delivered(root, cb), cb.isNull(root.get("esfDate")));
            case "closed" -> closedByRules(root, cb);
            case "no-date" -> cb.and(notDelivered(root, cb), cb.isNull(root.get("plannedDeliveryDate")));
            default -> {
                logger.warn("Delivery list: неизвестный сигнал '{}' — фильтр пропущен", signal);
                yield null;
            }
        };
    }

    /**
     * Статус оплат (вычисляемый по коллекции payments):
     *   none          — оплат нет;
     *   undistributed — есть оплаты, но хотя бы у одной не указан тип (Аванс/По факту); undistributed:N — ровно N;
     *   distributed   — есть оплаты и у всех указан тип.
     */
    private static Predicate paymentsStatus(Root<Delivery> root, CriteriaQuery<?> query, CriteriaBuilder cb, String value) {
        String ps = value.trim().toLowerCase();
        if ("none".equals(ps)) {
            return cb.isEmpty(root.get("payments"));
        }
        if (!ps.startsWith("undistributed") && !"distributed".equals(ps)) {
            return null;
        }
        // Подзапрос: количество привязанных оплат без типа у этой поставки.
        Subquery<Long> sub = query.subquery(Long.class);
        Root<Delivery> subRoot = sub.from(Delivery.class);
        var subPayments = subRoot.join("payments", JoinType.INNER);
        sub.select(cb.count(subPayments));
        sub.where(cb.equal(subRoot.get("id"), root.get("id")), cb.isNull(subPayments.get("paymentType")));
        if ("distributed".equals(ps)) {
            return cb.and(cb.isNotEmpty(root.get("payments")), cb.equal(sub, 0L));
        }
        int colon = ps.indexOf(':');
        if (colon >= 0) {
            try {
                return cb.equal(sub, Long.valueOf(ps.substring(colon + 1).trim()));
            } catch (NumberFormatException ignored) {
                // некорректное число — трактуем как «любое кол-во»
            }
        }
        return cb.and(cb.isNotEmpty(root.get("payments")), cb.greaterThan(sub, 0L));
    }

    private static void addLike(List<Predicate> predicates, CriteriaBuilder cb, Expression<String> lowerExpr, String value) {
        if (hasText(value)) {
            predicates.add(cb.like(lowerExpr, "%" + value.trim().toLowerCase() + "%"));
        }
    }

    private static LocalDate parseDate(String value, String param) {
        if (!hasText(value)) return null;
        try {
            return LocalDate.parse(value.trim());
        } catch (Exception e) {
            logger.warn("Delivery list: некорректная дата {}='{}' — фильтр пропущен", param, value);
            return null;
        }
    }

    private static boolean hasText(String value) {
        return value != null && !value.trim().isEmpty();
    }
}
