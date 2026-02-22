package com.uzproc.backend.service.supplier;

import com.uzproc.backend.dto.supplier.SupplierDto;
import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.repository.supplier.SupplierRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class SupplierService {

    private static final Logger logger = LoggerFactory.getLogger(SupplierService.class);

    private final SupplierRepository supplierRepository;

    public SupplierService(SupplierRepository supplierRepository) {
        this.supplierRepository = supplierRepository;
    }

    public Page<SupplierDto> findAll(
            int page,
            int size,
            String sortBy,
            String sortDir,
            String type,
            String kpp,
            String inn,
            String code,
            String name) {

        Specification<Supplier> spec = buildSpecification(type, kpp, inn, code, name);
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);

        Page<Supplier> suppliers = supplierRepository.findAll(spec, pageable);
        return suppliers.map(this::toDto);
    }

    public SupplierDto findById(Long id) {
        return supplierRepository.findById(id)
                .map(this::toDto)
                .orElse(null);
    }

    private Specification<Supplier> buildSpecification(String type, String kpp, String inn, String code, String name) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (type != null && !type.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("type")), "%" + type.trim().toLowerCase() + "%"));
            }
            if (kpp != null && !kpp.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("kpp")), "%" + kpp.trim().toLowerCase() + "%"));
            }
            if (inn != null && !inn.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("inn")), "%" + inn.trim().toLowerCase() + "%"));
            }
            if (code != null && !code.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("code")), "%" + code.trim().toLowerCase() + "%"));
            }
            if (name != null && !name.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.trim().toLowerCase() + "%"));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSort(String sortBy, String sortDir) {
        if (sortBy == null || sortBy.trim().isEmpty()) {
            sortBy = "code";
        }
        boolean asc = sortDir == null || !"desc".equalsIgnoreCase(sortDir);
        Sort.Direction direction = asc ? Sort.Direction.ASC : Sort.Direction.DESC;
        return Sort.by(direction, sortBy);
    }

    private SupplierDto toDto(Supplier s) {
        SupplierDto dto = new SupplierDto();
        dto.setId(s.getId());
        dto.setType(s.getType());
        dto.setKpp(s.getKpp());
        dto.setInn(s.getInn());
        dto.setCode(s.getCode());
        dto.setName(s.getName());
        dto.setCreatedAt(s.getCreatedAt());
        dto.setUpdatedAt(s.getUpdatedAt());
        return dto;
    }
}
