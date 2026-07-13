package com.uzproc.backend.service.delivery;

import com.uzproc.backend.dto.delivery.BulkCreateDeliveriesResultDto;
import com.uzproc.backend.dto.delivery.CreateDeliveryRequestDto;
import com.uzproc.backend.dto.delivery.DeliveryContractSearchResultDto;
import com.uzproc.backend.dto.delivery.DeliveryDto;
import com.uzproc.backend.dto.delivery.DeliveryPaymentSchemeDto;
import com.uzproc.backend.entity.delivery.DeliveryPaymentScheme;
import com.uzproc.backend.dto.delivery.UpdateDeliveryPaymentsRequestDto;
import com.uzproc.backend.dto.payment.PaymentDto;
import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.contract.ContractStatus;
import com.uzproc.backend.entity.delivery.Delivery;
import com.uzproc.backend.entity.delivery.DeliveryStatus;
import com.uzproc.backend.entity.delivery.PaymentScheme;
import com.uzproc.backend.entity.delivery.ShipmentStatus;
import com.uzproc.backend.entity.payment.Payment;
import com.uzproc.backend.entity.payment.PaymentStatus;
import com.uzproc.backend.entity.payment.PaymentType;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.entity.calendar.Holiday;
import com.uzproc.backend.repository.calendar.HolidayRepository;
import com.uzproc.backend.repository.contract.ContractApprovalRepository;
import com.uzproc.backend.repository.contract.ContractRepository;
import com.uzproc.backend.repository.delivery.DeliveryRepository;
import com.uzproc.backend.repository.payment.PaymentRepository;
import jakarta.persistence.criteria.Predicate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DeliveryService {

    private static final Logger logger = LoggerFactory.getLogger(DeliveryService.class);

    private final DeliveryRepository deliveryRepository;
    private final ContractRepository contractRepository;
    private final PaymentRepository paymentRepository;
    private final HolidayRepository holidayRepository;
    private final ContractApprovalRepository contractApprovalRepository;
    private final com.uzproc.backend.repository.delivery.DeliveryPaymentSchemeRepository paymentSchemeRepository;

    public DeliveryService(DeliveryRepository deliveryRepository,
                           ContractRepository contractRepository,
                           PaymentRepository paymentRepository,
                           HolidayRepository holidayRepository,
                           ContractApprovalRepository contractApprovalRepository,
                           com.uzproc.backend.repository.delivery.DeliveryPaymentSchemeRepository paymentSchemeRepository) {
        this.deliveryRepository = deliveryRepository;
        this.contractRepository = contractRepository;
        this.paymentRepository = paymentRepository;
        this.holidayRepository = holidayRepository;
        this.contractApprovalRepository = contractApprovalRepository;
        this.paymentSchemeRepository = paymentSchemeRepository;
    }

    /** Уникальные значения «Статуса из отчёта» — для выпадающего фильтра в таблице поставок. */
    public List<String> listReportStatuses() {
        return deliveryRepository.findDistinctReportStatuses();
    }

    /** Уникальные значения количества нераспределённых оплат — для выпадающего фильтра столбца «Оплаты». */
    public List<Integer> listUndistributedPaymentCounts() {
        return deliveryRepository.findUndistributedPaymentCounts().stream()
                .map(Long::intValue)
                .distinct()
                .sorted()
                .collect(Collectors.toList());
    }

    /** Список активных схем оплаты (справочник) для выпадающего списка в карточке поставки. */
    public List<DeliveryPaymentSchemeDto> listPaymentSchemes() {
        return paymentSchemeRepository.findByActiveTrueOrderBySortOrderAsc().stream()
                .map(this::toSchemeDto)
                .collect(Collectors.toList());
    }

    private com.uzproc.backend.dto.delivery.DeliveryPaymentSchemeDto toSchemeDto(
            com.uzproc.backend.entity.delivery.DeliveryPaymentScheme s) {
        var dto = new com.uzproc.backend.dto.delivery.DeliveryPaymentSchemeDto();
        dto.setId(s.getId());
        dto.setLabel(s.getLabel());
        dto.setAdvancePercent(s.getAdvancePercent());
        dto.setFinalPercent(s.getFinalPercent());
        dto.setTermDays(s.getTermDays());
        dto.setDayType(s.getDayType());
        dto.setPaymentType(s.getPaymentType());
        dto.setSortOrder(s.getSortOrder());
        return dto;
    }

    /**
     * Разрешает выбранную схему оплаты: по id из справочника (приоритет) или по строковому коду схемы.
     * Возвращает массив [DeliveryPaymentScheme ref (или null), PaymentScheme enum (или null)].
     * Легаси-enum (Аванс/По факту) выводится из payment_type справочной схемы.
     */
    private Object[] resolvePaymentScheme(Long schemeId, String schemeCode) {
        if (schemeId != null) {
            com.uzproc.backend.entity.delivery.DeliveryPaymentScheme ref = paymentSchemeRepository.findById(schemeId)
                    .orElseThrow(() -> new IllegalArgumentException("Схема оплаты не найдена: id=" + schemeId));
            PaymentScheme legacy = PaymentScheme.valueOf(ref.getPaymentType().trim().toUpperCase());
            return new Object[]{ref, legacy};
        }
        if (schemeCode != null && !schemeCode.isBlank()) {
            try {
                return new Object[]{null, PaymentScheme.valueOf(schemeCode.trim().toUpperCase())};
            } catch (IllegalArgumentException ex) {
                throw new IllegalArgumentException("Некорректное значение paymentScheme: " + schemeCode);
            }
        }
        return new Object[]{null, null};
    }

    public Page<DeliveryDto> findAll(
            int page,
            int size,
            String sortBy,
            String sortDir,
            String innerId,
            String contractInnerId,
            String supplierName,
            String status,
            String currency,
            String comment,
            String responsibleName,
            Integer dateYear,
            Boolean dateNull,
            String paymentScheme,
            String shipmentStatus,
            String reportStatus,
            String paymentsStatus,
            Boolean closed) {

        Specification<Delivery> spec = buildSpecification(
                innerId, contractInnerId, supplierName, status, currency,
                comment, responsibleName, dateYear, dateNull, paymentScheme, shipmentStatus, reportStatus, paymentsStatus, closed);
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Delivery> deliveries = deliveryRepository.findAll(spec, pageable);
        logger.info("Delivery list: page={}, size={}, totalElements={}", page, size, deliveries.getTotalElements());

        // Батч-загрузка дат регистрации/синхронизации договоров для всей страницы (вместо 2 нативных запросов на строку)
        List<Long> contractIds = deliveries.getContent().stream()
                .map(d -> d.getContract() != null ? d.getContract().getId() : null)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .collect(Collectors.toList());
        java.util.Map<Long, LocalDate> regDates = contractIds.isEmpty() ? java.util.Collections.emptyMap()
                : toDateMap(contractApprovalRepository.findRegistrationCompletionDatesByContractIds(contractIds));
        java.util.Map<Long, LocalDate> syncDates = contractIds.isEmpty() ? java.util.Collections.emptyMap()
                : toDateMap(contractApprovalRepository.findSynchronizationCompletionDatesByContractIds(contractIds));

        return deliveries.map(d -> {
            Long cid = d.getContract() != null ? d.getContract().getId() : null;
            return toDtoCore(d, cid != null ? regDates.get(cid) : null, cid != null ? syncDates.get(cid) : null);
        });
    }

    public DeliveryDto findById(Long id) {
        return deliveryRepository.findById(id)
                .map(this::toDto)
                .orElse(null);
    }

    /**
     * Создаёт поставку на основании договора и схемы оплаты.
     * Опционально привязывает указанные оплаты, если они относятся к выбранному договору.
     */
    @Transactional
    public DeliveryDto create(CreateDeliveryRequestDto request) {
        if (request == null || request.getContractId() == null) {
            throw new IllegalArgumentException("contractId обязателен");
        }
        // Схема оплаты: по id из справочника (приоритет) или по строковому коду. Обязательна.
        Object[] resolved = resolvePaymentScheme(request.getPaymentSchemeId(), request.getPaymentScheme());
        DeliveryPaymentScheme schemeRef = (DeliveryPaymentScheme) resolved[0];
        PaymentScheme scheme = (PaymentScheme) resolved[1];
        if (scheme == null) {
            throw new IllegalArgumentException("Схема оплаты обязательна (paymentSchemeId или paymentScheme)");
        }

        Contract contract = contractRepository.findById(request.getContractId())
                .orElseThrow(() -> new IllegalArgumentException("Договор не найден: id=" + request.getContractId()));

        Delivery delivery = new Delivery();
        Integer maxInnerId = deliveryRepository.findMaxNumericInnerId();
        int nextInnerId = (maxInnerId != null ? maxInnerId : 0) + 1;
        delivery.setInnerId(String.valueOf(nextInnerId));
        delivery.setContract(contract);
        delivery.setPaymentScheme(scheme);
        delivery.setPaymentSchemeRef(schemeRef);
        if (contract.getCurrency() != null) delivery.setCurrency(contract.getCurrency());
        if (contract.getBudgetAmount() != null) delivery.setAmount(contract.getBudgetAmount());
        if (contract.getSuppliers() != null && !contract.getSuppliers().isEmpty()) {
            delivery.setSupplier(contract.getSuppliers().iterator().next());
        }
        // Ответственный = тот, кто подготовил договор.
        delivery.setResponsible(contract.getPreparedBy());

        // Срок поставки в рабочих днях: из запроса, иначе — первое число из договора.
        Integer term = request.getDeliveryTermWorkingDays();
        if (term == null) term = parseFirstNumber(contract.getDeliveryTerm());
        delivery.setDeliveryTermWorkingDays(term);

        Set<Payment> linked = new HashSet<>();
        applyPaymentType(request.getAdvancePaymentIds(), contract, PaymentType.ADVANCE, linked);
        applyPaymentType(request.getFactPaymentIds(), contract, PaymentType.FACT, linked);
        if (!linked.isEmpty()) {
            delivery.setPayments(linked);
        }

        delivery.setStatus(resolveInitialStatus(scheme, linked));
        applyDerivedShipmentStatus(delivery);
        recomputeDeliveryDeadline(delivery);

        Delivery saved = deliveryRepository.save(delivery);
        logger.info("Created delivery id={} contractId={} paymentScheme={} payments={}",
                saved.getId(), contract.getId(), scheme,
                saved.getPayments() != null ? saved.getPayments().size() : 0);
        return toDto(saved);
    }

    /**
     * Массово создаёт поставки по подписанным спецификациям
     * (договоры с documentForm = «Спецификация» и status = SIGNED),
     * подготовленным договорником (preparedBy.isContractor = true),
     * у которых дата регистрации (а при её отсутствии — дата синхронизации) договора
     * попадает в указанный месяц/год.
     * Спецификации, по которым поставка уже существует, пропускаются.
     * Схема оплаты у создаваемых поставок не задаётся (выбирается пользователем позже).
     */
    @Transactional
    public BulkCreateDeliveriesResultDto createDeliveriesFromSignedSpecifications(Integer year, Integer month) {
        int y = (year != null) ? year : LocalDate.now().getYear();
        int m = (month != null) ? month : 4; // по умолчанию — апрель
        LocalDate monthStart = LocalDate.of(y, m, 1);
        LocalDate monthEnd = monthStart.plusMonths(1).minusDays(1);

        // По требованию: перед балк-созданием полностью очищаем поставки (и связи delivery_payments),
        // чтобы пересоздать их заново с актуальными правилами схемы оплаты.
        // deleteAll() (а не deleteAllInBatch) — чтобы Hibernate почистил join-таблицу delivery_payments.
        long existing = deliveryRepository.count();
        if (existing > 0) {
            deliveryRepository.deleteAll();
            deliveryRepository.flush();
            logger.info("Bulk create deliveries: deleted {} existing deliveries before recreation", existing);
        }

        // Лёгкая projection-выборка id подписанных спецификаций договорников (без гидрации сущностей).
        List<Long> contractIds = contractRepository.findSignedContractorSpecificationIds(ContractStatus.SIGNED);

        // Даты регистрации и синхронизации по каждому договору — пакетными запросами.
        java.util.Map<Long, LocalDate> registrationDates = toDateMap(
                contractIds.isEmpty() ? List.of()
                        : contractApprovalRepository.findRegistrationCompletionDatesByContractIds(contractIds));
        java.util.Map<Long, LocalDate> synchronizationDates = toDateMap(
                contractIds.isEmpty() ? List.of()
                        : contractApprovalRepository.findSynchronizationCompletionDatesByContractIds(contractIds));

        // Отбираем только id с датой регистрации (или, если её нет, синхронизации) в нужном месяце,
        // и поднимаем полные сущности ТОЛЬКО для них (а не для всех договорных спецификаций).
        List<Long> monthContractIds = contractIds.stream().filter(id -> {
            LocalDate d = registrationDates.get(id);
            if (d == null) d = synchronizationDates.get(id);
            return d != null && !d.isBefore(monthStart) && !d.isAfter(monthEnd);
        }).collect(Collectors.toList());
        List<Contract> specifications = monthContractIds.isEmpty()
                ? List.of() : contractRepository.findAllById(monthContractIds);
        logger.info("Bulk create deliveries: {} signed contractor specifications, {} in {}-{}",
                contractIds.size(), specifications.size(), y, m);

        Integer maxInnerId = deliveryRepository.findMaxNumericInnerId();
        int nextInnerId = (maxInnerId != null ? maxInnerId : 0);

        // Справочник схем оплаты — для авто-подстановки по «Схеме оплаты» договора (один запрос).
        List<DeliveryPaymentScheme> schemeList = paymentSchemeRepository.findByActiveTrueOrderBySortOrderAsc();

        int created = 0;
        int skipped = 0;
        for (Contract contract : specifications) {
            if (deliveryRepository.existsByContractId(contract.getId())) {
                skipped++;
                continue;
            }
            nextInnerId++;
            createDeliveryForContract(contract, schemeList, nextInnerId);
            created++;
        }
        int total = created + skipped;
        logger.info("Bulk create deliveries done: created={}, skipped={}, total={}", created, skipped, total);
        return new BulkCreateDeliveriesResultDto(created, skipped, total);
    }

    /**
     * Применяет к поставке правила из договора «по нашим правилам»: авто-подбор схемы оплаты
     * (см. {@link #autoSchemeForContract}), сумма/валюта/поставщик/ответственный/срок/оплаты из договора,
     * статус оплаты, статус отгрузки и «Дату поставки». НЕ сохраняет — только заполняет поля.
     * Используется и при создании новой поставки, и при обновлении существующей из handreport.
     */
    private void applyContractRules(Delivery delivery, Contract contract, List<DeliveryPaymentScheme> schemeList) {
        delivery.setContract(contract);
        // Авто-подбор схемы оплаты по «Схеме оплаты» договора; если правило не сработало — не выбрана.
        DeliveryPaymentScheme autoScheme = autoSchemeForContract(
                contract.getPaymentScheme(), contract.getPaymentTerms(), schemeList);
        if (autoScheme != null) {
            delivery.setPaymentSchemeRef(autoScheme);
            delivery.setPaymentScheme(PaymentScheme.valueOf(autoScheme.getPaymentType().trim().toUpperCase()));
        } else {
            delivery.setPaymentSchemeRef(null);
            delivery.setPaymentScheme(null);
        }
        if (contract.getCurrency() != null) delivery.setCurrency(contract.getCurrency());
        if (contract.getBudgetAmount() != null) delivery.setAmount(contract.getBudgetAmount());
        if (contract.getSuppliers() != null && !contract.getSuppliers().isEmpty()) {
            delivery.setSupplier(contract.getSuppliers().iterator().next());
        }
        delivery.setResponsible(contract.getPreparedBy());
        delivery.setDeliveryTermWorkingDays(parseFirstNumber(contract.getDeliveryTerm()));
        List<Payment> contractPayments = paymentRepository.findByContractId(contract.getId());
        delivery.setPayments(contractPayments.isEmpty() ? new HashSet<>() : new HashSet<>(contractPayments));
        // Авто-распределение типов оплат (Аванс/По факту), если оплаты сходятся по сумме со схемой.
        autoDistributePayments(delivery);
        delivery.setStatus(resolveInitialStatus(delivery.getPaymentScheme(), delivery.getPayments()));
        applyDerivedShipmentStatus(delivery);
        recomputeDeliveryDeadline(delivery);
    }

    /** Допуск на округление при сверке сумм оплат с долями схемы (копеечные расхождения). */
    private static final BigDecimal DISTRIBUTION_TOLERANCE = new BigDecimal("1.00");

    /**
     * Авто-распределение типов оплат по схеме и сумме поставки.
     * Условия: выбрана схема из справочника (с процентами аванс/доплата) и задана сумма поставки.
     *   • Полная постоплата (0/100): все оплаты — «По факту».
     *   • Полный аванс (100/0): все оплаты — «Аванс».
     *   • Иначе распределяем, если оплаты «сходятся»: их суммарная сумма равна сумме поставки,
     *     каждая оплата относится к ближайшей доле (аванс amount·adv% или доплата amount·fin%),
     *     а суммы по «Авансу» и «По факту» совпадают с целевыми долями с точностью до округления
     *     ({@link #DISTRIBUTION_TOLERANCE}).
     * Если сходимости нет — типы не трогаем (оплаты остаются нераспределёнными).
     */
    private void autoDistributePayments(Delivery delivery) {
        DeliveryPaymentScheme ref = delivery.getPaymentSchemeRef();
        Set<Payment> payments = delivery.getPayments();
        BigDecimal amount = delivery.getAmount();
        if (ref == null || payments == null || payments.isEmpty()) return;

        int adv = ref.getAdvancePercent() != null ? ref.getAdvancePercent() : 0;
        int fin = ref.getFinalPercent() != null ? ref.getFinalPercent() : 0;

        // Полная постоплата / полный аванс — распределяем без проверки суммы.
        if (adv == 0 && fin > 0) { assignType(payments, PaymentType.FACT); return; }
        if (fin == 0 && adv > 0) { assignType(payments, PaymentType.ADVANCE); return; }
        if (adv <= 0 || fin <= 0) return;

        if (amount == null || amount.signum() <= 0) return;

        // Суммарная сумма оплат должна сходиться с суммой поставки.
        BigDecimal total = payments.stream()
                .map(Payment::getAmount).filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (total.compareTo(amount) != 0) return;

        BigDecimal hundred = BigDecimal.valueOf(100);
        BigDecimal advTarget = amount.multiply(BigDecimal.valueOf(adv)).divide(hundred, 4, java.math.RoundingMode.HALF_UP);
        BigDecimal finTarget = amount.multiply(BigDecimal.valueOf(fin)).divide(hundred, 4, java.math.RoundingMode.HALF_UP);

        // Классифицируем каждую оплату по ближайшей доле (аванс/доплата).
        java.util.Map<Payment, PaymentType> plan = new java.util.HashMap<>();
        BigDecimal advSum = BigDecimal.ZERO;
        BigDecimal finSum = BigDecimal.ZERO;
        for (Payment p : payments) {
            BigDecimal a = p.getAmount();
            if (a == null) return; // нет суммы — не распределяем
            BigDecimal distAdv = a.subtract(advTarget).abs();
            BigDecimal distFin = a.subtract(finTarget).abs();
            if (distAdv.compareTo(distFin) <= 0) {
                plan.put(p, PaymentType.ADVANCE);
                advSum = advSum.add(a);
            } else {
                plan.put(p, PaymentType.FACT);
                finSum = finSum.add(a);
            }
        }
        // Суммы по «Авансу» и «По факту» должны сойтись с целевыми долями (с допуском на округление).
        if (advSum.subtract(advTarget).abs().compareTo(DISTRIBUTION_TOLERANCE) > 0
                || finSum.subtract(finTarget).abs().compareTo(DISTRIBUTION_TOLERANCE) > 0) {
            return;
        }

        plan.forEach((p, type) -> {
            p.setPaymentType(type);
            paymentRepository.save(p);
        });
    }

    /** Проставляет всем оплатам одинаковый тип и сохраняет их. */
    private void assignType(Set<Payment> payments, PaymentType type) {
        for (Payment p : payments) {
            p.setPaymentType(type);
            paymentRepository.save(p);
        }
    }

    /**
     * Создаёт поставку по договору «по нашим правилам» (см. {@link #applyContractRules}).
     * Сохраняет и возвращает поставку.
     */
    private Delivery createDeliveryForContract(Contract contract, List<DeliveryPaymentScheme> schemeList, int innerId) {
        Delivery delivery = new Delivery();
        delivery.setInnerId(String.valueOf(innerId));
        applyContractRules(delivery, contract, schemeList);
        return deliveryRepository.save(delivery);
    }

    /**
     * Для парсинга handreport: гарантирует наличие поставки по договору-спецификации.
     * Если поставки нет — создаёт «по нашим правилам»; если есть — обновляет её по тем же
     * правилам договора (авто-подбор схемы оплаты, сумма/валюта/поставщик/срок/оплаты/статусы).
     * Поверх правил проставляет данные из отчёта: фактическую дату поставки, дату ЭСФ
     * (колонка «Дата выставления ЭСФ»), комментарий (колонка «Примечания») и статус из отчёта (колонка «41»).
     * Договор перезагружается по id ВНУТРИ транзакции, чтобы работали ленивые связи (suppliers).
     * @return true, если поставка была создана.
     */
    @Transactional
    public boolean upsertDeliveryForSpecification(Long contractId, LocalDate actualDeliveryDate, LocalDate esfDate,
                                                  String comment, String reportStatus) {
        Contract spec = contractRepository.findById(contractId).orElse(null);
        if (spec == null) return false;
        List<DeliveryPaymentScheme> schemeList = paymentSchemeRepository.findByActiveTrueOrderBySortOrderAsc();
        Delivery delivery = deliveryRepository.findFirstByContractIdOrderByIdAsc(contractId).orElse(null);
        boolean created = false;
        if (delivery == null) {
            Integer maxInnerId = deliveryRepository.findMaxNumericInnerId();
            int innerId = (maxInnerId != null ? maxInnerId : 0) + 1;
            delivery = createDeliveryForContract(spec, schemeList, innerId);
            created = true;
        } else {
            // Существующую поставку обновляем по правилам договора (в т.ч. авто-подбор схемы оплаты).
            applyContractRules(delivery, spec, schemeList);
        }
        // Данные из отчёта — поверх правил.
        if (actualDeliveryDate != null) {
            delivery.setActualDeliveryDate(actualDeliveryDate);
            // Есть факт поставки → статус отгрузки «Поставлено».
            delivery.setShipmentStatus(ShipmentStatus.DELIVERED);
        }
        if (esfDate != null) {
            delivery.setEsfDate(esfDate);
        }
        if (comment != null && !comment.isBlank()) {
            delivery.setComment(comment.trim());
        }
        if (reportStatus != null && !reportStatus.isBlank()) {
            delivery.setReportStatus(reportStatus.trim());
        }
        deliveryRepository.save(delivery);
        return created;
    }

    private static final Pattern PERCENT_PATTERN = Pattern.compile("(\\d+)\\s*%");
    private static final Pattern FIRST_INT_PATTERN = Pattern.compile("\\d+");

    /**
     * Авто-подбор схемы оплаты поставки по «Схеме оплаты» (paymentScheme) и «Условиям оплаты»
     * (paymentTerms) договора. Логика:
     *   • «Постоплата - 100%» (без аванса/предоплаты) → «0/100/10 д.» (срок не важен);
     *   • иначе: аванс % = первый процент из «Схемы оплаты», доплата = 100 − аванс,
     *     срок = первое число из «Условий оплаты» → точный матч в справочнике по (аванс, доплата, срок).
     *   • неоднозначность «30/70/10 д.» vs «30/30/40/10 д.» — по числу долей в «Схеме оплаты».
     * Если точного совпадения нет — возвращает null (схема остаётся не выбранной, «не трогаем»).
     */
    private DeliveryPaymentScheme autoSchemeForContract(String contractScheme, String contractTerms,
                                                        List<DeliveryPaymentScheme> schemes) {
        if (schemes == null || schemes.isEmpty()) return null;
        String s = (contractScheme == null) ? "" : contractScheme.trim().replaceAll("\\s+", " ").toLowerCase();

        // Полная постоплата → «0/100/10 д.» (срок не учитываем).
        if (s.contains("постоплата") && s.contains("100")
                && !s.contains("аванс") && !s.contains("предоплата")) {
            return pickSchemeByLabel(schemes, "0/100/10 д.");
        }

        List<Integer> pcts = extractPercents(s);
        if (pcts.isEmpty()) return null;
        int advance = pcts.get(0);
        if (advance < 0 || advance > 100) return null;
        int balance = 100 - advance;
        int stages = pcts.size();

        Integer term = extractFirstInt(contractTerms);
        if (term == null) return null;

        List<DeliveryPaymentScheme> matches = schemes.stream()
                .filter(x -> eqInt(x.getAdvancePercent(), advance)
                        && eqInt(x.getFinalPercent(), balance)
                        && eqInt(x.getTermDays(), term))
                .collect(Collectors.toList());
        if (matches.isEmpty()) return null;
        if (matches.size() == 1) return matches.get(0);
        // Неоднозначность (напр. 30/70/10): 3 доли → «30/30/40/10 д.», иначе 2-этапная.
        boolean threeStage = stages >= 3;
        return matches.stream()
                .filter(x -> isMultiStageLabel(x.getLabel()) == threeStage)
                .findFirst().orElse(matches.get(0));
    }

    /** Все проценты из строки по порядку: «Аванс - 30% ... 70%» → [30,70]; «30% 30% 40%» → [30,30,40]. */
    private List<Integer> extractPercents(String s) {
        List<Integer> out = new ArrayList<>();
        Matcher m = PERCENT_PATTERN.matcher(s);
        while (m.find()) {
            try {
                out.add(Integer.parseInt(m.group(1)));
            } catch (NumberFormatException ignored) {
                // пропускаем некорректное число
            }
        }
        return out;
    }

    /** Первое целое число из строки (срок из «Условий оплаты»). */
    private Integer extractFirstInt(String s) {
        if (s == null) return null;
        Matcher m = FIRST_INT_PATTERN.matcher(s);
        return m.find() ? Integer.valueOf(m.group()) : null;
    }

    private boolean eqInt(Integer a, int b) {
        return a != null && a == b;
    }

    /** Многоэтапный ярлык (4 числовые доли): «30/30/40/10 д.» → true; «30/70/10 д.» → false. */
    private boolean isMultiStageLabel(String label) {
        if (label == null) return false;
        String head = label.trim().split("\\s")[0];
        return head.split("/").length >= 4;
    }

    /** Находит схему справочника по точному ярлыку. */
    private DeliveryPaymentScheme pickSchemeByLabel(List<DeliveryPaymentScheme> schemes, String label) {
        return schemes.stream()
                .filter(x -> x.getLabel() != null && label.equals(x.getLabel().trim()))
                .findFirst().orElse(null);
    }

    /**
     * Стартовая проверка авто-закрытия поставок по факту оплаты.
     * Условие: схема оплаты POSTPAYMENT («Постоплата - 100%»), статус оплаты PAID («Оплачено»)
     * и сумма привязанных оплат равна сумме поставки — тогда статус отгрузки → DELIVERED («Поставлено»).
     * Факт-дата поставки (actualDeliveryDate) НЕ заполняется (по требованию — остаётся пустой).
     * Возвращает число обновлённых поставок.
     */
    /** Ярлыки схем оплаты, для которых работает авто-закрытие (100% одним платежом). */
    private static final List<String> AUTO_CLOSE_SCHEME_LABELS = List.of("0/100/10 д.", "100/0/10 д.");

    /** Ярлык постоплатной схемы («по факту»), для которой авто-простановка «Поставлено» разрешена. */
    private static final String POSTPAY_SCHEME_LABEL = "0/100/10 д.";

    /**
     * Авто-закрытие полностью оплаченных поставок (для «по факту» и «аванс 100%»).
     * Условие: схема оплаты — «0/100/10 д.» (по факту) или «100/0/10 д.» (аванс),
     * и сумма фактически оплаченных платежей (статус «Оплачена»/PAID) равна сумме поставки.
     * Тогда ставим статус оплаты PAID («Оплачено»). Статус отгрузки DELIVERED («Поставлено»)
     * ставим ТОЛЬКО для постоплаты («0/100/10 д.») — оплата аванса не означает факт поставки.
     * Возвращает число обновлённых поставок.
     */
    @Transactional
    public int autoCloseFullyPaidDeliveries() {
        List<Delivery> candidates = deliveryRepository.findAutoCloseCandidatesBySchemeLabels(AUTO_CLOSE_SCHEME_LABELS);
        int updated = 0;
        for (Delivery d : candidates) {
            BigDecimal amount = d.getAmount();
            if (amount == null) continue;
            // Учитываем только фактически оплаченные платежи (статус «Оплачена»/PAID);
            // неоплаченные (пустой статус, «К оплате» и т.п.) в сумму не входят.
            BigDecimal paid = (d.getPayments() == null) ? BigDecimal.ZERO
                    : d.getPayments().stream()
                        .filter(p -> p.getPaymentStatus() == PaymentStatus.PAID)
                        .map(Payment::getAmount)
                        .filter(java.util.Objects::nonNull)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (paid.compareTo(amount) != 0) continue;

            String label = (d.getPaymentSchemeRef() != null && d.getPaymentSchemeRef().getLabel() != null)
                    ? d.getPaymentSchemeRef().getLabel().trim() : null;
            boolean isPostpay = POSTPAY_SCHEME_LABEL.equals(label);

            boolean changed = false;
            if (d.getStatus() != DeliveryStatus.PAID) {
                d.setStatus(DeliveryStatus.PAID);
                changed = true;
            }
            // «Поставлено» — только для постоплаты; для аванса не проставляем.
            if (isPostpay && d.getShipmentStatus() != ShipmentStatus.DELIVERED) {
                d.setShipmentStatus(ShipmentStatus.DELIVERED);
                changed = true;
            }
            if (changed) {
                deliveryRepository.save(d);
                updated++;
            }
        }
        if (updated > 0) {
            logger.info("Auto-close deliveries: {} updated (PAID; DELIVERED only for postpayment)", updated);
        }
        return updated;
    }

    /**
     * Определяет статус оплаты поставки.
     * Схема «Аванс» (PREPAYMENT):
     *   оплачены и аванс, и платёж по факту (у обоих paymentDate) ⇒ PAID («Оплачено», зелёный);
     *   оплачен только аванс ⇒ ADVANCE_PAID («Аванс оплачен», зелёный);
     *   аванс не оплачен ⇒ ADVANCE_PREPARED («Оплата аванса», жёлтый).
     * Схема «По факту» (POSTPAYMENT):
     *   есть оплаченный платёж (paymentDate) ⇒ PAID («Оплачено», зелёный);
     *   оплат нет / не распределены ⇒ NOT_PAID («Не оплачено»).
     * Схема не выбрана ⇒ null (статус пустой).
     */
    private DeliveryStatus resolveInitialStatus(PaymentScheme scheme, Set<Payment> linked) {
        if (scheme == PaymentScheme.PREPAYMENT) {
            boolean hasPaidAdvance = linked != null && linked.stream()
                    .anyMatch(p -> p.getPaymentType() == PaymentType.ADVANCE && p.getPaymentDate() != null);
            boolean hasPaidFact = linked != null && linked.stream()
                    .anyMatch(p -> p.getPaymentType() == PaymentType.FACT && p.getPaymentDate() != null);
            if (hasPaidAdvance && hasPaidFact) return DeliveryStatus.PAID;
            return hasPaidAdvance ? DeliveryStatus.ADVANCE_PAID : DeliveryStatus.ADVANCE_PREPARED;
        }
        if (scheme == PaymentScheme.POSTPAYMENT) {
            boolean hasPaid = linked != null && linked.stream()
                    .anyMatch(p -> p.getPaymentDate() != null);
            return hasPaid ? DeliveryStatus.PAID : DeliveryStatus.NOT_PAID;
        }
        return null;
    }

    /**
     * Авто-расчёт статуса поставки (отгрузки) на основе статуса оплаты.
     * Схема не выбрана ⇒ статус пустой (null).
     * Схема «Аванс» + статус оплаты «Оплата аванса» (аванс не оплачен)
     * ⇒ «Ожидает оплаты аванса» (жёлтый). Иначе ⇒ «Ожидает поставку».
     * Вручную выставленные статусы «Поставлено»/«Просрочено» не перетираются.
     */
    private void applyDerivedShipmentStatus(Delivery delivery) {
        ShipmentStatus current = delivery.getShipmentStatus();
        if (current == ShipmentStatus.DELIVERED || current == ShipmentStatus.OVERDUE) {
            return;
        }
        if (delivery.getPaymentScheme() == null) {
            delivery.setShipmentStatus(null);
            return;
        }
        boolean awaitingAdvance = delivery.getPaymentScheme() == PaymentScheme.PREPAYMENT
                && delivery.getStatus() == DeliveryStatus.ADVANCE_PREPARED;
        delivery.setShipmentStatus(awaitingAdvance
                ? ShipmentStatus.AWAITING_ADVANCE_PAYMENT
                : ShipmentStatus.EXPECTED);
    }

    /**
     * Обновляет схему оплаты и распределение оплат существующей поставки.
     * Логика распределения совпадает с созданием: указанным оплатам присваивается тип
     * (Аванс/По факту), и именно они привязываются к поставке. Статус пересчитывается.
     */
    @Transactional
    public DeliveryDto updatePaymentSchemeAndPayments(Long id, UpdateDeliveryPaymentsRequestDto request) {
        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Поставка не найдена: id=" + id));

        // Схема оплаты: по id из справочника (приоритет) или по строковому коду. Может быть пустой (сброс).
        Object[] resolved = resolvePaymentScheme(
                request != null ? request.getPaymentSchemeId() : null,
                request != null ? request.getPaymentScheme() : null);
        DeliveryPaymentScheme schemeRef = (DeliveryPaymentScheme) resolved[0];
        PaymentScheme scheme = (PaymentScheme) resolved[1];
        delivery.setPaymentScheme(scheme);
        delivery.setPaymentSchemeRef(schemeRef);

        if (request != null && request.getDeliveryTermWorkingDays() != null) {
            delivery.setDeliveryTermWorkingDays(request.getDeliveryTermWorkingDays());
        }

        Contract contract = delivery.getContract();
        Set<Payment> linked = new HashSet<>();
        if (contract != null && request != null) {
            applyPaymentType(request.getAdvancePaymentIds(), contract, PaymentType.ADVANCE, linked);
            applyPaymentType(request.getFactPaymentIds(), contract, PaymentType.FACT, linked);
        }
        delivery.setPayments(linked);
        delivery.setStatus(resolveInitialStatus(scheme, linked));
        applyDerivedShipmentStatus(delivery);
        recomputeDeliveryDeadline(delivery);

        Delivery saved = deliveryRepository.save(delivery);
        logger.info("Updated delivery id={} paymentScheme={} payments={}",
                saved.getId(), scheme, linked.size());
        return toDto(saved);
    }

    /**
     * Отменяет распределение типов оплат поставки: схема оплаты снимается,
     * у всех оплат договора очищается тип (Аванс/По факту), и они заново привязываются
     * к поставке как «нераспределённые». Статус сбрасывается в PROJECT.
     * Результат соответствует состоянию поставки сразу после массового создания.
     */
    @Transactional
    public DeliveryDto resetPaymentDistribution(Long id) {
        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Поставка не найдена: id=" + id));

        delivery.setPaymentScheme(null);
        delivery.setPaymentSchemeRef(null);

        Contract contract = delivery.getContract();
        Set<Payment> linked = new HashSet<>();
        if (contract != null) {
            List<Payment> contractPayments = paymentRepository.findByContractId(contract.getId());
            for (Payment p : contractPayments) {
                p.setPaymentType(null);
                paymentRepository.save(p);
                linked.add(p);
            }
        }
        delivery.setPayments(linked);
        delivery.setStatus(resolveInitialStatus(null, linked));
        applyDerivedShipmentStatus(delivery);
        recomputeDeliveryDeadline(delivery);

        Delivery saved = deliveryRepository.save(delivery);
        logger.info("Reset payment distribution for delivery id={} payments={}", saved.getId(), linked.size());
        return toDto(saved);
    }

    /**
     * Inline-обновление поля «Срок поставки». Принимает ISO-дату или null (сброс).
     */
    @Transactional
    public DeliveryDto updateDeliveryDeadline(Long id, String isoDate) {
        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Поставка не найдена: id=" + id));
        if (isoDate == null || isoDate.trim().isEmpty()) {
            delivery.setDeliveryDeadline(null);
        } else {
            try {
                delivery.setDeliveryDeadline(LocalDate.parse(isoDate.trim()));
            } catch (Exception ex) {
                throw new IllegalArgumentException("Некорректная дата: " + isoDate);
            }
        }
        Delivery saved = deliveryRepository.save(delivery);
        logger.info("Updated delivery id={} deliveryDeadline={}", saved.getId(), saved.getDeliveryDeadline());
        return toDto(saved);
    }

    /**
     * Inline-обновление статуса поставки (Ожидает поставку / Поставлено / Просрочено).
     * Принимает name() или displayName. При статусе «Поставлено» сохраняет фактическую дату
     * поставки (actualDeliveryDateIso), при остальных статусах фактическая дата очищается.
     */
    @Transactional
    public DeliveryDto updateShipmentStatus(Long id, String value, String actualDeliveryDateIso) {
        Delivery delivery = deliveryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Поставка не найдена: id=" + id));
        ShipmentStatus parsed = ShipmentStatus.fromDisplayName(value);
        if (parsed == null) {
            throw new IllegalArgumentException("Некорректный статус поставки: " + value);
        }
        delivery.setShipmentStatus(parsed);
        if (parsed == ShipmentStatus.DELIVERED) {
            if (actualDeliveryDateIso == null || actualDeliveryDateIso.trim().isEmpty()) {
                throw new IllegalArgumentException("Для статуса «Поставлено» требуется фактическая дата поставки");
            }
            try {
                delivery.setActualDeliveryDate(LocalDate.parse(actualDeliveryDateIso.trim()));
            } catch (Exception ex) {
                throw new IllegalArgumentException("Некорректная фактическая дата поставки: " + actualDeliveryDateIso);
            }
        } else {
            delivery.setActualDeliveryDate(null);
        }
        Delivery saved = deliveryRepository.save(delivery);
        logger.info("Updated delivery id={} shipmentStatus={} actualDeliveryDate={}",
                saved.getId(), parsed, saved.getActualDeliveryDate());
        return toDto(saved);
    }

    /**
     * Загружает указанные оплаты, проверяет принадлежность к договору, присваивает им тип и добавляет в общий набор для привязки.
     */
    private void applyPaymentType(List<Long> paymentIds, Contract contract, PaymentType type, Set<Payment> linkSink) {
        if (paymentIds == null || paymentIds.isEmpty()) return;
        List<Payment> payments = paymentRepository.findAllById(paymentIds);
        for (Payment p : payments) {
            if (p.getContract() == null || !contract.getId().equals(p.getContract().getId())) continue;
            p.setPaymentType(type);
            paymentRepository.save(p);
            linkSink.add(p);
        }
    }

    /** Извлекает первое целое число из текста (срок поставки из договора — свободный текст). */
    private static Integer parseFirstNumber(String text) {
        if (text == null) return null;
        java.util.regex.Matcher m = java.util.regex.Pattern.compile("\\d+").matcher(text);
        if (m.find()) {
            try {
                return Integer.parseInt(m.group());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    /**
     * Пересчитывает «Дату поставки» = базовая дата + срок поставки (рабочие дни).
     * Аванс (PREPAYMENT): база — дата оплаты аванса (самая ранняя оплаченная авансовая оплата).
     * По факту (POSTPAYMENT): база — дата регистрации договора (дата выполнения согласования «Регистрация»).
     * Если срока нет, схема не выбрана или нет базовой даты — дата поставки сбрасывается в null.
     */
    private void recomputeDeliveryDeadline(Delivery delivery) {
        Integer term = delivery.getDeliveryTermWorkingDays();
        PaymentScheme scheme = delivery.getPaymentScheme();
        Set<Payment> payments = delivery.getPayments();
        LocalDate base = null;
        if (term != null && term > 0 && scheme != null) {
            if (scheme == PaymentScheme.PREPAYMENT) {
                if (payments != null && !payments.isEmpty()) {
                    base = payments.stream()
                            .filter(p -> p.getPaymentType() == PaymentType.ADVANCE && p.getPaymentDate() != null)
                            .map(Payment::getPaymentDate)
                            .min(LocalDate::compareTo)
                            .orElse(null);
                }
            } else if (scheme == PaymentScheme.POSTPAYMENT) {
                if (delivery.getContract() != null) {
                    Long contractId = delivery.getContract().getId();
                    // База — дата регистрации; если её нет, используем дату синхронизации.
                    base = getContractRegistrationDate(contractId);
                    if (base == null) {
                        base = getContractSynchronizationDate(contractId);
                    }
                }
            }
        }
        delivery.setDeliveryDeadline(base != null ? addWorkingDays(base, term) : null);
    }

    /**
     * Дата регистрации договора: дата выполнения согласования этапа «Регистрация»
     * (MAX completion_date по stage 'регистрация%'). Возвращает LocalDate или null.
     */
    private LocalDate getContractRegistrationDate(Long contractId) {
        if (contractId == null) return null;
        return firstDate(contractApprovalRepository.findRegistrationCompletionDatesByContractIds(List.of(contractId)));
    }

    /**
     * Дата синхронизации договора: дата выполнения согласования этапа «Синхронизация»
     * (MAX completion_date по stage 'синхронизация%'). Возвращает LocalDate или null.
     */
    private LocalDate getContractSynchronizationDate(Long contractId) {
        if (contractId == null) return null;
        return firstDate(contractApprovalRepository.findSynchronizationCompletionDatesByContractIds(List.of(contractId)));
    }

    /** Извлекает дату из первой строки результата (contract_id, completion_date). */
    private LocalDate firstDate(List<Object[]> rows) {
        for (Object[] row : rows) {
            if (row[1] != null) {
                return toLocalDate(row[1]);
            }
        }
        return null;
    }

    /** Преобразует строки (contract_id, completion_date) в map contractId -> LocalDate. */
    private static java.util.Map<Long, LocalDate> toDateMap(List<Object[]> rows) {
        java.util.Map<Long, LocalDate> map = new java.util.HashMap<>();
        for (Object[] row : rows) {
            if (row[0] == null || row[1] == null) continue;
            LocalDate d = toLocalDate(row[1]);
            if (d != null) map.put(((Number) row[0]).longValue(), d);
        }
        return map;
    }

    /** Преобразует значение completion_date (Timestamp/LocalDateTime/Date) в LocalDate. */
    private static LocalDate toLocalDate(Object value) {
        if (value == null) return null;
        if (value instanceof java.sql.Timestamp) {
            return ((java.sql.Timestamp) value).toLocalDateTime().toLocalDate();
        }
        if (value instanceof java.time.LocalDateTime) {
            return ((java.time.LocalDateTime) value).toLocalDate();
        }
        if (value instanceof java.sql.Date) {
            return ((java.sql.Date) value).toLocalDate();
        }
        if (value instanceof LocalDate) {
            return (LocalDate) value;
        }
        return null;
    }

    /** Прибавляет n рабочих дней к дате, пропуская сб/вс и праздники из справочника. */
    private LocalDate addWorkingDays(LocalDate start, int n) {
        if (n <= 0) return start;
        // запас календарных дней с буфером на выходные/праздники
        LocalDate upperBound = start.plusDays((long) n * 2 + 60);
        Set<LocalDate> holidays = holidayRepository.findByCalendarDateBetween(start, upperBound)
                .stream().map(Holiday::getCalendarDate).collect(Collectors.toSet());
        LocalDate current = start;
        int added = 0;
        while (added < n) {
            current = current.plusDays(1);
            java.time.DayOfWeek dow = current.getDayOfWeek();
            boolean weekend = dow == java.time.DayOfWeek.SATURDAY || dow == java.time.DayOfWeek.SUNDAY;
            if (!weekend && !holidays.contains(current)) {
                added++;
            }
        }
        return current;
    }

    /**
     * Поиск подписанных договоров, подготовленных договорником (preparedBy.isContractor = true).
     * Используется в модальном окне создания поставки.
     */
    public List<DeliveryContractSearchResultDto> searchSignedContracts(String search, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 50));
        org.springframework.data.jpa.domain.Specification<Contract> spec = (root, query, cb) -> {
            var preds = new ArrayList<jakarta.persistence.criteria.Predicate>();
            preds.add(cb.equal(root.get("status"), ContractStatus.SIGNED));
            var preparedByJoin = root.join("preparedBy", jakarta.persistence.criteria.JoinType.INNER);
            preds.add(cb.equal(preparedByJoin.get("isContractor"), true));
            if (search != null && !search.trim().isEmpty()) {
                String lower = "%" + search.trim().toLowerCase() + "%";
                preds.add(cb.or(
                        cb.like(cb.lower(root.get("innerId")), lower),
                        cb.like(cb.lower(root.get("name")), lower),
                        cb.like(cb.lower(root.get("title")), lower)
                ));
            }
            query.orderBy(cb.desc(root.get("contractCreationDate")));
            return cb.and(preds.toArray(new jakarta.persistence.criteria.Predicate[0]));
        };
        var pageable = PageRequest.of(0, safeLimit);
        return contractRepository.findAll(spec, pageable).stream()
                .map(c -> {
                    DeliveryContractSearchResultDto dto = new DeliveryContractSearchResultDto();
                    dto.setId(c.getId());
                    dto.setInnerId(c.getInnerId());
                    dto.setName(c.getName());
                    dto.setTitle(c.getTitle());
                    dto.setDocumentForm(c.getDocumentForm());
                    if (c.getSuppliers() != null && !c.getSuppliers().isEmpty()) {
                        dto.setSupplierName(c.getSuppliers().iterator().next().getName());
                    }
                    dto.setBudgetAmount(c.getBudgetAmount());
                    dto.setCurrency(c.getCurrency());
                    dto.setPaymentTerms(c.getPaymentTerms());
                    dto.setPaymentScheme(c.getPaymentScheme());
                    dto.setDeliveryTerm(c.getDeliveryTerm());
                    return dto;
                })
                .collect(Collectors.toList());
    }

    /**
     * Оплаты, привязанные к договору — используются при выборе оплат в модальном окне создания поставки.
     */
    public List<PaymentDto> findPaymentsByContract(Long contractId) {
        if (contractId == null) return List.of();
        return paymentRepository.findByContractId(contractId).stream()
                .map(this::toPaymentDto)
                .collect(Collectors.toList());
    }

    private PaymentDto toPaymentDto(Payment p) {
        PaymentDto dto = new PaymentDto();
        dto.setId(p.getId());
        dto.setMainId(p.getMainId());
        dto.setAmount(p.getAmount());
        dto.setComment(p.getComment());
        if (p.getContract() != null) {
            dto.setContractId(p.getContract().getId());
            dto.setContractTitle(p.getContract().getTitle());
        }
        dto.setPaymentStatus(p.getPaymentStatus() != null ? p.getPaymentStatus().getDisplayName() : null);
        dto.setRequestStatus(p.getRequestStatus() != null ? p.getRequestStatus().getDisplayName() : null);
        dto.setPaymentType(p.getPaymentType() != null ? p.getPaymentType().getDisplayName() : null);
        dto.setPlannedExpenseDate(p.getPlannedExpenseDate());
        dto.setPaymentDate(p.getPaymentDate());
        if (p.getExecutor() != null) {
            dto.setExecutorId(p.getExecutor().getId());
            dto.setExecutorDisplayName(formatUserDisplayName(p.getExecutor()));
        }
        if (p.getResponsible() != null) {
            dto.setResponsibleId(p.getResponsible().getId());
            dto.setResponsibleDisplayName(formatUserDisplayName(p.getResponsible()));
        }
        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());
        return dto;
    }

    private Specification<Delivery> buildSpecification(
            String innerId, String contractInnerId, String supplierName, String status,
            String currency, String comment, String responsibleName,
            Integer dateYear, Boolean dateNull, String paymentScheme, String shipmentStatus,
            String reportStatus, String paymentsStatus, Boolean closed) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (innerId != null && !innerId.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("innerId")), "%" + innerId.trim().toLowerCase() + "%"));
            }

            if (contractInnerId != null && !contractInnerId.trim().isEmpty()) {
                var contractJoin = root.join("contract", jakarta.persistence.criteria.JoinType.LEFT);
                predicates.add(cb.like(cb.lower(contractJoin.get("innerId")), "%" + contractInnerId.trim().toLowerCase() + "%"));
            }

            if (supplierName != null && !supplierName.trim().isEmpty()) {
                var supplierJoin = root.join("supplier", jakarta.persistence.criteria.JoinType.LEFT);
                predicates.add(cb.like(cb.lower(supplierJoin.get("name")), "%" + supplierName.trim().toLowerCase() + "%"));
            }

            if (status != null && !status.trim().isEmpty()) {
                DeliveryStatus parsed = DeliveryStatus.fromDisplayName(status.trim());
                if (parsed != null) {
                    predicates.add(cb.equal(root.get("status"), parsed));
                } else {
                    // нет совпадения по displayName/name — гарантированно пустой результат
                    predicates.add(cb.disjunction());
                }
            }

            if (currency != null && !currency.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("currency")), "%" + currency.trim().toLowerCase() + "%"));
            }

            if (comment != null && !comment.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("comment")), "%" + comment.trim().toLowerCase() + "%"));
            }

            if (responsibleName != null && !responsibleName.trim().isEmpty()) {
                var userJoin = root.join("responsible", jakarta.persistence.criteria.JoinType.LEFT);
                String lowerFilter = "%" + responsibleName.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(userJoin.get("surname")), lowerFilter),
                        cb.like(cb.lower(userJoin.get("name")), lowerFilter)
                ));
            }

            if (dateNull != null && dateNull) {
                predicates.add(cb.isNull(root.get("date")));
            } else if (dateYear != null) {
                LocalDate yearStart = LocalDate.of(dateYear, 1, 1);
                LocalDate yearEnd = LocalDate.of(dateYear, 12, 31);
                predicates.add(cb.between(root.get("date"), yearStart, yearEnd));
            }

            if (paymentScheme != null && !paymentScheme.trim().isEmpty()) {
                try {
                    PaymentScheme scheme = PaymentScheme.valueOf(paymentScheme.trim().toUpperCase());
                    predicates.add(cb.equal(root.get("paymentScheme"), scheme));
                } catch (IllegalArgumentException ignored) {
                    // некорректное значение — фильтр пропускаем
                }
            }

            if (shipmentStatus != null && !shipmentStatus.trim().isEmpty()) {
                ShipmentStatus parsed = ShipmentStatus.fromDisplayName(shipmentStatus.trim());
                if (parsed != null) {
                    predicates.add(cb.equal(root.get("shipmentStatus"), parsed));
                } else {
                    predicates.add(cb.disjunction());
                }
            }

            if (reportStatus != null && !reportStatus.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("reportStatus")), "%" + reportStatus.trim().toLowerCase() + "%"));
            }

            // Статус оплат (вычисляемый по коллекции payments):
            //   none          — оплат нет;
            //   undistributed — есть оплаты, но хотя бы у одной не указан тип (Аванс/По факту);
            //   distributed   — есть оплаты и у всех указан тип.
            if (paymentsStatus != null && !paymentsStatus.trim().isEmpty()) {
                String ps = paymentsStatus.trim().toLowerCase();
                if ("none".equals(ps)) {
                    predicates.add(cb.isEmpty(root.get("payments")));
                } else if (ps.startsWith("undistributed") || "distributed".equals(ps)) {
                    // Подзапрос: количество привязанных оплат без типа у этой поставки.
                    jakarta.persistence.criteria.Subquery<Long> sub = query.subquery(Long.class);
                    jakarta.persistence.criteria.Root<Delivery> subRoot = sub.from(Delivery.class);
                    var subPayments = subRoot.join("payments", jakarta.persistence.criteria.JoinType.INNER);
                    sub.select(cb.count(subPayments));
                    sub.where(
                            cb.equal(subRoot.get("id"), root.get("id")),
                            cb.isNull(subPayments.get("paymentType")));
                    if ("distributed".equals(ps)) {
                        // Есть оплаты и ни одной без типа.
                        predicates.add(cb.and(cb.isNotEmpty(root.get("payments")), cb.equal(sub, 0L)));
                    } else {
                        // «undistributed» — любое кол-во нераспределённых; «undistributed:N» — ровно N.
                        Integer exact = null;
                        int colon = ps.indexOf(':');
                        if (colon >= 0) {
                            try {
                                exact = Integer.valueOf(ps.substring(colon + 1).trim());
                            } catch (NumberFormatException ignored) {
                                // некорректное число — трактуем как «любое кол-во»
                            }
                        }
                        if (exact != null) {
                            predicates.add(cb.equal(sub, exact.longValue()));
                        } else {
                            predicates.add(cb.and(cb.isNotEmpty(root.get("payments")), cb.greaterThan(sub, 0L)));
                        }
                    }
                }
            }

            // Вкладки «В работе» / «Закрыто».
            // «Закрыто» = статус отгрузки DELIVERED («Поставлено») И статус оплаты PAID («Оплачено»).
            // «В работе» = всё остальное. closed == null → без фильтра (все).
            if (closed != null) {
                if (closed) {
                    predicates.add(cb.and(
                            cb.equal(root.get("shipmentStatus"), ShipmentStatus.DELIVERED),
                            cb.equal(root.get("status"), DeliveryStatus.PAID)));
                } else {
                    // Null-безопасное «НЕ закрыто»: строки с NULL-статусами тоже относятся к «В работе»
                    // (иначе cb.not(...) на NULL даёт UNKNOWN и такие строки выпадают из выборки).
                    predicates.add(cb.or(
                            cb.notEqual(root.get("shipmentStatus"), ShipmentStatus.DELIVERED),
                            cb.isNull(root.get("shipmentStatus")),
                            cb.notEqual(root.get("status"), DeliveryStatus.PAID),
                            cb.isNull(root.get("status"))));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSort(String sortBy, String sortDir) {
        if (sortBy == null || sortBy.trim().isEmpty()) {
            sortBy = "id";
        }
        if (sortDir == null || !sortDir.equalsIgnoreCase("asc")) {
            sortDir = "desc";
        }
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, sortBy);
    }

    public DeliveryDto toDto(Delivery entity) {
        Long contractId = entity.getContract() != null ? entity.getContract().getId() : null;
        return toDtoCore(entity, getContractRegistrationDate(contractId), getContractSynchronizationDate(contractId));
    }

    /**
     * Ядро конвертации: даты регистрации/синхронизации договора передаются извне
     * (для листинга считаются батчем, чтобы не делать 2 нативных запроса на каждую строку — N+1).
     */
    private DeliveryDto toDtoCore(Delivery entity, LocalDate contractRegistrationDate, LocalDate contractSynchronizationDate) {
        DeliveryDto dto = new DeliveryDto();
        dto.setId(entity.getId());
        dto.setInnerId(entity.getInnerId());
        dto.setDate(entity.getDate());
        dto.setDeliveryDeadline(entity.getDeliveryDeadline());
        dto.setActualDeliveryDate(entity.getActualDeliveryDate());
        dto.setEsfDate(entity.getEsfDate());
        dto.setReportStatus(entity.getReportStatus());
        dto.setDeliveryTermWorkingDays(entity.getDeliveryTermWorkingDays());
        if (entity.getContract() != null) {
            dto.setContractId(entity.getContract().getId());
            dto.setContractInnerId(entity.getContract().getInnerId());
            dto.setContractName(entity.getContract().getName());
            dto.setContractPurchaseRequestId(entity.getContract().getPurchaseRequestId());
            dto.setContractPaymentScheme(entity.getContract().getPaymentScheme());
            dto.setContractPaymentTerms(entity.getContract().getPaymentTerms());
            dto.setContractDeliveryTerm(entity.getContract().getDeliveryTerm());
            dto.setContractRegistrationDate(contractRegistrationDate);
            dto.setContractSynchronizationDate(contractSynchronizationDate);
            dto.setContractPlannedDeliveryStartDate(entity.getContract().getPlannedDeliveryStartDate() != null
                    ? entity.getContract().getPlannedDeliveryStartDate().toLocalDate() : null);
        }
        if (entity.getSupplier() != null) {
            dto.setSupplierId(entity.getSupplier().getId());
            dto.setSupplierName(entity.getSupplier().getName());
            dto.setSupplierInn(entity.getSupplier().getInn());
        }
        dto.setAmount(entity.getAmount());
        dto.setCurrency(entity.getCurrency());
        dto.setStatus(entity.getStatus() != null ? entity.getStatus().getDisplayName() : null);
        dto.setStatusColor(entity.getStatus() != null ? entity.getStatus().getColor() : null);
        dto.setShipmentStatus(entity.getShipmentStatus() != null ? entity.getShipmentStatus().getDisplayName() : null);
        dto.setShipmentStatusColor(entity.getShipmentStatus() != null ? entity.getShipmentStatus().getColor() : null);
        dto.setPaymentScheme(entity.getPaymentScheme() != null ? entity.getPaymentScheme().name() : null);
        if (entity.getPaymentSchemeRef() != null) {
            dto.setPaymentSchemeId(entity.getPaymentSchemeRef().getId());
            dto.setPaymentSchemeLabel(entity.getPaymentSchemeRef().getLabel());
        }
        if (entity.getPayments() != null) {
            dto.setPaymentIds(entity.getPayments().stream().map(Payment::getId).collect(Collectors.toList()));
            int count = entity.getPayments().size();
            dto.setPaymentsCount(count);
            // «Распределены» — все привязанные оплаты имеют тип (Аванс/По факту)
            dto.setPaymentsDistributed(count > 0
                    && entity.getPayments().stream().allMatch(p -> p.getPaymentType() != null));
        }
        dto.setComment(entity.getComment());
        if (entity.getResponsible() != null) {
            dto.setResponsibleId(entity.getResponsible().getId());
            dto.setResponsibleDisplayName(formatUserDisplayName(entity.getResponsible()));
        }
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    private static String formatUserDisplayName(User user) {
        if (user == null) return null;
        String surname = user.getSurname() != null ? user.getSurname().trim() : "";
        String name = user.getName() != null ? user.getName().trim() : "";
        if (surname.isEmpty() && name.isEmpty()) {
            return user.getUsername() != null ? user.getUsername() : null;
        }
        return (surname + " " + name).trim();
    }
}
