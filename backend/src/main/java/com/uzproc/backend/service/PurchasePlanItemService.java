package com.uzproc.backend.service;

import com.uzproc.backend.dto.PurchasePlanItemDto;
import com.uzproc.backend.entity.PurchasePlanItem;
import com.uzproc.backend.repository.PurchasePlanItemRepository;
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
public class PurchasePlanItemService {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanItemService.class);
    
    private final PurchasePlanItemRepository purchasePlanItemRepository;

    public PurchasePlanItemService(PurchasePlanItemRepository purchasePlanItemRepository) {
        this.purchasePlanItemRepository = purchasePlanItemRepository;
    }

    public Page<PurchasePlanItemDto> findAll(
            int page,
            int size,
            Integer year,
            String sortBy,
            String sortDir,
            String company,
            List<String> cfo,
            String purchaseSubject) {
        
        logger.info("=== FILTER REQUEST ===");
        logger.info("Filter parameters - year: {}, company: '{}', cfo: {}, purchaseSubject: '{}'",
                year, company, cfo, purchaseSubject);
        
        Specification<PurchasePlanItem> spec = buildSpecification(year, company, cfo, purchaseSubject);
        
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<PurchasePlanItem> items = purchasePlanItemRepository.findAll(spec, pageable);
        
        logger.info("Query result - Found {} purchase plan items on page {} (size {}), total elements: {}",
                items.getContent().size(), page, size, items.getTotalElements());
        logger.info("=== END FILTER REQUEST ===\n");
        
        // Конвертируем entity в DTO
        Page<PurchasePlanItemDto> dtoPage = items.map(this::toDto);
        
        return dtoPage;
    }

    public PurchasePlanItemDto findById(Long id) {
        PurchasePlanItem item = purchasePlanItemRepository.findById(id)
                .orElse(null);
        if (item == null) {
            return null;
        }
        return toDto(item);
    }

    /**
     * Конвертирует PurchasePlanItem entity в PurchasePlanItemDto
     */
    private PurchasePlanItemDto toDto(PurchasePlanItem entity) {
        PurchasePlanItemDto dto = new PurchasePlanItemDto();
        dto.setId(entity.getId());
        dto.setGuid(entity.getGuid());
        dto.setYear(entity.getYear());
        dto.setCompany(entity.getCompany());
        dto.setCfo(entity.getCfo());
        dto.setPurchaseSubject(entity.getPurchaseSubject());
        dto.setBudgetAmount(entity.getBudgetAmount());
        dto.setContractEndDate(entity.getContractEndDate());
        dto.setRequestDate(entity.getRequestDate());
        dto.setNewContractDate(entity.getNewContractDate());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    private Specification<PurchasePlanItem> buildSpecification(
            Integer year,
            String company,
            List<String> cfo,
            String purchaseSubject) {
        
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            int predicateCount = 0;
            
            // Фильтр по году
            if (year != null) {
                predicates.add(cb.equal(root.get("year"), year));
                predicateCount++;
                logger.info("Added year filter: {}", year);
            }
            
            // Фильтр по компании (частичное совпадение, case-insensitive)
            if (company != null && !company.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("company")), "%" + company.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added company filter: '{}'", company);
            }
            
            // Фильтр по ЦФО (поддержка множественного выбора - точное совпадение)
            if (cfo != null && !cfo.isEmpty()) {
                // Убираем пустые значения и тримим
                List<String> validCfoValues = cfo.stream()
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .map(String::trim)
                    .toList();
                
                if (!validCfoValues.isEmpty()) {
                    if (validCfoValues.size() == 1) {
                        // Одно значение - точное совпадение
                        predicates.add(cb.equal(cb.lower(root.get("cfo")), validCfoValues.get(0).toLowerCase()));
                        predicateCount++;
                        logger.info("Added single cfo filter: '{}'", validCfoValues.get(0));
                    } else {
                        // Несколько значений - IN запрос
                        List<Predicate> cfoPredicates = validCfoValues.stream()
                            .map(cfoValue -> cb.equal(cb.lower(root.get("cfo")), cfoValue.toLowerCase()))
                            .toList();
                        predicates.add(cb.or(cfoPredicates.toArray(new Predicate[0])));
                        predicateCount++;
                        logger.info("Added multiple cfo filter: {}", validCfoValues);
                    }
                }
            }
            
            // Фильтр по предмету закупки (частичное совпадение, case-insensitive)
            if (purchaseSubject != null && !purchaseSubject.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("purchaseSubject")), "%" + purchaseSubject.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added purchaseSubject filter: '{}'", purchaseSubject);
            }
            
            logger.info("Total predicates added: {}", predicateCount);
            
            if (predicates.isEmpty()) {
                logger.info("No filters applied - returning all records");
                return cb.conjunction(); // Возвращаем пустое условие (все записи)
            }
            
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSort(String sortBy, String sortDir) {
        if (sortBy != null && !sortBy.trim().isEmpty()) {
            Sort.Direction direction = (sortDir != null && sortDir.equalsIgnoreCase("desc")) 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
            return Sort.by(direction, sortBy);
        }
        return Sort.unsorted();
    }
}

