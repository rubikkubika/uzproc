package com.uzproc.backend.service.payment;

import com.uzproc.backend.dto.payment.PaymentDto;
import com.uzproc.backend.entity.payment.Payment;
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
            String comment) {

        Specification<Payment> spec = buildSpecification(cfo, comment);
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

    private Specification<Payment> buildSpecification(List<String> cfo, String comment) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

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
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
}
