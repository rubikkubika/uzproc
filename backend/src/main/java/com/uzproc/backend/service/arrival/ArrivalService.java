package com.uzproc.backend.service.arrival;

import com.uzproc.backend.dto.arrival.ArrivalDto;
import com.uzproc.backend.entity.arrival.Arrival;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.arrival.ArrivalRepository;
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
import java.util.List;

@Service
@Transactional(readOnly = true)
public class ArrivalService {

    private static final Logger logger = LoggerFactory.getLogger(ArrivalService.class);

    private final ArrivalRepository arrivalRepository;

    public ArrivalService(ArrivalRepository arrivalRepository) {
        this.arrivalRepository = arrivalRepository;
    }

    public Page<ArrivalDto> findAll(
            int page,
            int size,
            String sortBy,
            String sortDir,
            String number,
            String supplierName,
            String invoice,
            String warehouse,
            String operationType,
            String department,
            String incomingNumber,
            String currency,
            String comment,
            String responsibleName,
            Integer incomingDateYear,
            Boolean incomingDateNull) {

        Specification<Arrival> spec = buildSpecification(number, supplierName, invoice, warehouse, operationType, department, incomingNumber, currency, comment, responsibleName, incomingDateYear, incomingDateNull);
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Arrival> arrivals = arrivalRepository.findAll(spec, pageable);

        logger.info("Arrival list: page={}, size={}, totalElements={}", page, size, arrivals.getTotalElements());

        return arrivals.map(this::toDto);
    }

    public ArrivalDto findById(Long id) {
        return arrivalRepository.findById(id)
                .map(this::toDto)
                .orElse(null);
    }

    public List<ArrivalDto> findBySupplierIds(List<Long> supplierIds) {
        if (supplierIds == null || supplierIds.isEmpty()) {
            return List.of();
        }
        return arrivalRepository.findBySupplierIdIn(supplierIds).stream()
                .map(this::toDto)
                .toList();
    }

    private Specification<Arrival> buildSpecification(
            String number, String supplierName, String invoice, String warehouse,
            String operationType, String department, String incomingNumber,
            String currency, String comment, String responsibleName, Integer incomingDateYear, Boolean incomingDateNull) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (number != null && !number.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("number")), "%" + number.trim().toLowerCase() + "%"));
            }

            if (supplierName != null && !supplierName.trim().isEmpty()) {
                var supplierJoin = root.join("supplier", jakarta.persistence.criteria.JoinType.LEFT);
                predicates.add(cb.like(cb.lower(supplierJoin.get("name")), "%" + supplierName.trim().toLowerCase() + "%"));
            }

            if (invoice != null && !invoice.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("invoice")), "%" + invoice.trim().toLowerCase() + "%"));
            }

            if (warehouse != null && !warehouse.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("warehouse")), "%" + warehouse.trim().toLowerCase() + "%"));
            }

            if (operationType != null && !operationType.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("operationType")), "%" + operationType.trim().toLowerCase() + "%"));
            }

            if (department != null && !department.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("department")), "%" + department.trim().toLowerCase() + "%"));
            }

            if (incomingNumber != null && !incomingNumber.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("incomingNumber")), "%" + incomingNumber.trim().toLowerCase() + "%"));
            }

            if (currency != null && !currency.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("currency").as(String.class)), "%" + currency.trim().toLowerCase() + "%"));
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

            // Фильтр по году "Дата вх." или "без даты"
            if (incomingDateNull != null && incomingDateNull) {
                predicates.add(cb.isNull(root.get("incomingDate")));
            } else if (incomingDateYear != null) {
                LocalDate yearStart = LocalDate.of(incomingDateYear, 1, 1);
                LocalDate yearEnd = LocalDate.of(incomingDateYear, 12, 31);
                predicates.add(cb.between(root.get("incomingDate"), yearStart, yearEnd));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSort(String sortBy, String sortDir) {
        if (sortBy == null || sortBy.trim().isEmpty()) {
            sortBy = "incomingDate";
        }
        if (sortDir == null || !sortDir.equalsIgnoreCase("asc")) {
            sortDir = "desc";
        }
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, sortBy);
    }

    private ArrivalDto toDto(Arrival entity) {
        ArrivalDto dto = new ArrivalDto();
        dto.setId(entity.getId());
        dto.setDate(entity.getDate());
        dto.setNumber(entity.getNumber());
        if (entity.getSupplier() != null) {
            dto.setSupplierId(entity.getSupplier().getId());
            dto.setSupplierName(entity.getSupplier().getName());
            dto.setSupplierInn(entity.getSupplier().getInn());
        }
        dto.setInvoice(entity.getInvoice());
        dto.setWarehouse(entity.getWarehouse());
        dto.setOperationType(entity.getOperationType());
        dto.setDepartment(entity.getDepartment());
        dto.setIncomingDate(entity.getIncomingDate());
        dto.setIncomingNumber(entity.getIncomingNumber());
        dto.setAmount(entity.getAmount());
        dto.setCurrency(entity.getCurrency() != null ? entity.getCurrency().getDisplayName() : null);
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
