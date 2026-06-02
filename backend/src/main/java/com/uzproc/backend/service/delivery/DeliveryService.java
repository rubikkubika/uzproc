package com.uzproc.backend.service.delivery;

import com.uzproc.backend.dto.delivery.CreateDeliveryRequestDto;
import com.uzproc.backend.dto.delivery.DeliveryContractSearchResultDto;
import com.uzproc.backend.dto.delivery.DeliveryDto;
import com.uzproc.backend.dto.payment.PaymentDto;
import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.contract.ContractStatus;
import com.uzproc.backend.entity.delivery.Delivery;
import com.uzproc.backend.entity.delivery.DeliveryStatus;
import com.uzproc.backend.entity.delivery.PaymentScheme;
import com.uzproc.backend.entity.payment.Payment;
import com.uzproc.backend.entity.payment.PaymentType;
import com.uzproc.backend.entity.user.User;
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

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DeliveryService {

    private static final Logger logger = LoggerFactory.getLogger(DeliveryService.class);

    private final DeliveryRepository deliveryRepository;
    private final ContractRepository contractRepository;
    private final PaymentRepository paymentRepository;

    public DeliveryService(DeliveryRepository deliveryRepository,
                           ContractRepository contractRepository,
                           PaymentRepository paymentRepository) {
        this.deliveryRepository = deliveryRepository;
        this.contractRepository = contractRepository;
        this.paymentRepository = paymentRepository;
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
            String paymentScheme) {

        Specification<Delivery> spec = buildSpecification(
                innerId, contractInnerId, supplierName, status, currency,
                comment, responsibleName, dateYear, dateNull, paymentScheme);
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Delivery> deliveries = deliveryRepository.findAll(spec, pageable);
        logger.info("Delivery list: page={}, size={}, totalElements={}", page, size, deliveries.getTotalElements());

        return deliveries.map(this::toDto);
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
        if (request.getPaymentScheme() == null || request.getPaymentScheme().isBlank()) {
            throw new IllegalArgumentException("paymentScheme обязателен");
        }
        PaymentScheme scheme;
        try {
            scheme = PaymentScheme.valueOf(request.getPaymentScheme().trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("Некорректное значение paymentScheme: " + request.getPaymentScheme());
        }

        Contract contract = contractRepository.findById(request.getContractId())
                .orElseThrow(() -> new IllegalArgumentException("Договор не найден: id=" + request.getContractId()));

        Delivery delivery = new Delivery();
        Integer maxInnerId = deliveryRepository.findMaxNumericInnerId();
        int nextInnerId = (maxInnerId != null ? maxInnerId : 0) + 1;
        delivery.setInnerId(String.valueOf(nextInnerId));
        delivery.setContract(contract);
        delivery.setPaymentScheme(scheme);
        if (contract.getCurrency() != null) delivery.setCurrency(contract.getCurrency());
        if (contract.getBudgetAmount() != null) delivery.setAmount(contract.getBudgetAmount());
        if (contract.getSuppliers() != null && !contract.getSuppliers().isEmpty()) {
            delivery.setSupplier(contract.getSuppliers().iterator().next());
        }
        if (contract.getPlannedDeliveryEndDate() != null) {
            delivery.setDeliveryDeadline(contract.getPlannedDeliveryEndDate().toLocalDate());
        }

        Set<Payment> linked = new HashSet<>();
        applyPaymentType(request.getAdvancePaymentIds(), contract, PaymentType.ADVANCE, linked);
        applyPaymentType(request.getFactPaymentIds(), contract, PaymentType.FACT, linked);
        if (!linked.isEmpty()) {
            delivery.setPayments(linked);
        }

        delivery.setStatus(resolveInitialStatus(scheme, linked));

        Delivery saved = deliveryRepository.save(delivery);
        logger.info("Created delivery id={} contractId={} paymentScheme={} payments={}",
                saved.getId(), contract.getId(), scheme,
                saved.getPayments() != null ? saved.getPayments().size() : 0);
        return toDto(saved);
    }

    /**
     * Определяет первоначальный статус поставки.
     * Аванс + есть авансовая оплата с paymentDate ⇒ ADVANCE_PAID.
     * Аванс + есть авансовая оплата без paymentDate ⇒ ADVANCE_PREPARED.
     * Иначе ⇒ PROJECT.
     */
    private DeliveryStatus resolveInitialStatus(PaymentScheme scheme, Set<Payment> linked) {
        if (scheme == PaymentScheme.PREPAYMENT && linked != null && !linked.isEmpty()) {
            boolean hasAdvance = false;
            boolean hasPaidAdvance = false;
            for (Payment p : linked) {
                if (p.getPaymentType() != PaymentType.ADVANCE) continue;
                hasAdvance = true;
                if (p.getPaymentDate() != null) {
                    hasPaidAdvance = true;
                    break;
                }
            }
            if (hasPaidAdvance) return DeliveryStatus.ADVANCE_PAID;
            if (hasAdvance) return DeliveryStatus.ADVANCE_PREPARED;
        }
        return DeliveryStatus.PROJECT;
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
            Integer dateYear, Boolean dateNull, String paymentScheme) {
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
        DeliveryDto dto = new DeliveryDto();
        dto.setId(entity.getId());
        dto.setInnerId(entity.getInnerId());
        dto.setDate(entity.getDate());
        dto.setDeliveryDeadline(entity.getDeliveryDeadline());
        if (entity.getContract() != null) {
            dto.setContractId(entity.getContract().getId());
            dto.setContractInnerId(entity.getContract().getInnerId());
            dto.setContractName(entity.getContract().getName());
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
        dto.setPaymentScheme(entity.getPaymentScheme() != null ? entity.getPaymentScheme().name() : null);
        if (entity.getPayments() != null) {
            dto.setPaymentIds(entity.getPayments().stream().map(Payment::getId).collect(Collectors.toList()));
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
