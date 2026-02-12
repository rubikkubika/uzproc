package com.uzproc.backend.service.payment;

import com.uzproc.backend.dto.payment.PaymentDto;
import com.uzproc.backend.entity.payment.Payment;
import com.uzproc.backend.entity.payment.PaymentRequestStatus;
import com.uzproc.backend.entity.payment.PaymentStatus;
import com.uzproc.backend.entity.user.User;
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

import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class PaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;

    public PaymentService(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    public Page<PaymentDto> findAll(
            int page,
            int size,
            String sortBy,
            String sortDir,
            List<String> cfo,
            String comment,
            Boolean linkedOnly,
            List<String> paymentStatus,
            List<String> requestStatus) {

        Specification<Payment> spec = buildSpecification(cfo, comment, linkedOnly, paymentStatus, requestStatus);
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Payment> payments = paymentRepository.findAll(spec, pageable);

        logger.info("Payment list: page={}, size={}, totalElements={}",
                page, size, payments.getTotalElements());

        return payments.map(this::toDto);
    }

    public PaymentDto findById(Long id) {
        return paymentRepository.findById(id)
                .map(this::toDto)
                .orElse(null);
    }

    private Specification<Payment> buildSpecification(List<String> cfo, String comment, Boolean linkedOnly,
                                                      List<String> paymentStatus, List<String> requestStatus) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (Boolean.TRUE.equals(linkedOnly)) {
                predicates.add(cb.isNotNull(root.get("purchaseRequest")));
            }

            if (cfo != null && !cfo.isEmpty()) {
                List<String> validCfoValues = cfo.stream()
                        .filter(s -> s != null && !s.trim().isEmpty())
                        .map(String::trim)
                        .toList();
                if (!validCfoValues.isEmpty()) {
                    var cfoJoin = root.join("cfo", jakarta.persistence.criteria.JoinType.LEFT);
                    predicates.add(cb.lower(cfoJoin.get("name")).in(
                            validCfoValues.stream().map(String::toLowerCase).toList()));
                }
            }

            if (comment != null && !comment.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("comment")), "%" + comment.trim().toLowerCase() + "%"));
            }

            if (paymentStatus != null && !paymentStatus.isEmpty()) {
                List<PaymentStatus> statuses = paymentStatus.stream()
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .map(PaymentStatus::fromDisplayName)
                        .filter(s -> s != null)
                        .toList();
                if (!statuses.isEmpty()) {
                    predicates.add(root.get("paymentStatus").in(statuses));
                }
            }

            if (requestStatus != null && !requestStatus.isEmpty()) {
                List<PaymentRequestStatus> statuses = requestStatus.stream()
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .map(PaymentRequestStatus::fromDisplayName)
                        .filter(s -> s != null)
                        .toList();
                if (!statuses.isEmpty()) {
                    predicates.add(root.get("requestStatus").in(statuses));
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

    private PaymentDto toDto(Payment entity) {
        PaymentDto dto = new PaymentDto();
        dto.setId(entity.getId());
        dto.setAmount(entity.getAmount());
        dto.setCfo(entity.getCfo() != null ? entity.getCfo().getName() : null);
        dto.setCfoId(entity.getCfo() != null ? entity.getCfo().getId() : null);
        dto.setComment(entity.getComment());
        if (entity.getPurchaseRequest() != null) {
            dto.setPurchaseRequestId(entity.getPurchaseRequest().getId());
            dto.setPurchaseRequestNumber(entity.getPurchaseRequest().getIdPurchaseRequest());
        }
        dto.setPaymentStatus(entity.getPaymentStatus() != null ? entity.getPaymentStatus().getDisplayName() : null);
        dto.setRequestStatus(entity.getRequestStatus() != null ? entity.getRequestStatus().getDisplayName() : null);
        dto.setPlannedExpenseDate(entity.getPlannedExpenseDate());
        dto.setPaymentDate(entity.getPaymentDate());
        if (entity.getExecutor() != null) {
            dto.setExecutorId(entity.getExecutor().getId());
            dto.setExecutorDisplayName(formatUserDisplayName(entity.getExecutor()));
        }
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
