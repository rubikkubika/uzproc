package com.uzproc.backend.service;

import com.uzproc.backend.dto.PurchaseDto;
import com.uzproc.backend.entity.Purchase;
import com.uzproc.backend.repository.PurchaseRepository;
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
public class PurchaseService {

    private static final Logger logger = LoggerFactory.getLogger(PurchaseService.class);
    
    private final PurchaseRepository purchaseRepository;

    public PurchaseService(PurchaseRepository purchaseRepository) {
        this.purchaseRepository = purchaseRepository;
    }

    public Page<PurchaseDto> findAll(
            int page,
            int size,
            Integer year,
            String sortBy,
            String sortDir,
            String innerId,
            Long purchaseNumber,
            List<String> cfo,
            String purchaseInitiator,
            String name,
            String costType,
            String contractType,
            Long purchaseRequestId) {
        
        logger.info("=== FILTER REQUEST ===");
        logger.info("Filter parameters - year: {}, innerId: '{}', purchaseNumber: {}, cfo: {}, purchaseInitiator: '{}', name: '{}', costType: '{}', contractType: '{}', purchaseRequestId: {}",
                year, innerId, purchaseNumber, cfo, purchaseInitiator, name, costType, contractType, purchaseRequestId);
        
        Specification<Purchase> spec = buildSpecification(
                year, innerId, purchaseNumber, cfo, purchaseInitiator, name, costType, contractType, purchaseRequestId);
        
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<Purchase> purchases = purchaseRepository.findAll(spec, pageable);
        
        logger.info("Query result - Found {} purchases on page {} (size {}), total elements: {}",
                purchases.getContent().size(), page, size, purchases.getTotalElements());
        logger.info("=== END FILTER REQUEST ===\n");
        
        // Конвертируем entity в DTO
        Page<PurchaseDto> dtoPage = purchases.map(this::toDto);
        
        return dtoPage;
    }

    public PurchaseDto findById(Long id) {
        Purchase purchase = purchaseRepository.findById(id)
                .orElse(null);
        if (purchase == null) {
            return null;
        }
        return toDto(purchase);
    }

    /**
     * Конвертирует Purchase entity в PurchaseDto
     */
    private PurchaseDto toDto(Purchase entity) {
        PurchaseDto dto = new PurchaseDto();
        dto.setId(entity.getId());
        dto.setGuid(entity.getGuid());
        dto.setPurchaseNumber(entity.getPurchaseNumber());
        dto.setPurchaseCreationDate(entity.getPurchaseCreationDate());
        dto.setInnerId(entity.getInnerId());
        dto.setName(entity.getName());
        dto.setTitle(entity.getTitle());
        dto.setCfo(entity.getCfo());
        dto.setMcc(entity.getMcc());
        dto.setPurchaseInitiator(entity.getPurchaseInitiator());
        dto.setPurchaseSubject(entity.getPurchaseSubject());
        dto.setBudgetAmount(entity.getBudgetAmount());
        dto.setCostType(entity.getCostType());
        dto.setContractType(entity.getContractType());
        dto.setContractDurationMonths(entity.getContractDurationMonths());
        dto.setPurchaseRequestId(entity.getPurchaseRequestId());
        dto.setStatus(entity.getStatus());
        dto.setState(entity.getState());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    private Specification<Purchase> buildSpecification(
            Integer year,
            String innerId,
            Long purchaseNumber,
            List<String> cfo,
            String purchaseInitiator,
            String name,
            String costType,
            String contractType,
            Long purchaseRequestId) {
        
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            int predicateCount = 0;
            
            // Фильтр по году
            if (year != null) {
                java.time.LocalDateTime startOfYear = java.time.LocalDateTime.of(year, 1, 1, 0, 0);
                java.time.LocalDateTime endOfYear = java.time.LocalDateTime.of(year, 12, 31, 23, 59, 59);
                predicates.add(cb.between(root.get("purchaseCreationDate"), startOfYear, endOfYear));
                predicateCount++;
                logger.info("Added year filter: {}", year);
            }
            
            // Фильтр по внутреннему номеру (частичное совпадение, case-insensitive)
            if (innerId != null && !innerId.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("innerId")), "%" + innerId.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added innerId filter: '{}'", innerId);
            }
            
            // Фильтр по номеру закупки
            if (purchaseNumber != null) {
                predicates.add(cb.equal(root.get("purchaseNumber"), purchaseNumber));
                predicateCount++;
                logger.info("Added purchaseNumber filter: {}", purchaseNumber);
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
            
            // Фильтр по инициатору (частичное совпадение, case-insensitive)
            if (purchaseInitiator != null && !purchaseInitiator.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("purchaseInitiator")), "%" + purchaseInitiator.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added purchaseInitiator filter: '{}'", purchaseInitiator);
            }
            
            // Фильтр по наименованию (частичное совпадение, case-insensitive)
            if (name != null && !name.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added name filter: '{}'", name);
            }
            
            // Фильтр по типу затрат (точное совпадение)
            if (costType != null && !costType.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("costType"), costType));
                predicateCount++;
                logger.info("Added costType filter: '{}'", costType);
            }
            
            // Фильтр по типу договора (точное совпадение)
            if (contractType != null && !contractType.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("contractType"), contractType));
                predicateCount++;
                logger.info("Added contractType filter: '{}'", contractType);
            }
            
            // Фильтр по purchaseRequestId (точное совпадение)
            if (purchaseRequestId != null) {
                predicates.add(cb.equal(root.get("purchaseRequestId"), purchaseRequestId));
                predicateCount++;
                logger.info("Added purchaseRequestId filter: {}", purchaseRequestId);
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

