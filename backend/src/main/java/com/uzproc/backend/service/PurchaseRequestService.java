package com.uzproc.backend.service;

import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.repository.PurchaseRequestRepository;
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
public class PurchaseRequestService {

    private static final Logger logger = LoggerFactory.getLogger(PurchaseRequestService.class);
    
    private final PurchaseRequestRepository purchaseRequestRepository;

    public PurchaseRequestService(PurchaseRequestRepository purchaseRequestRepository) {
        this.purchaseRequestRepository = purchaseRequestRepository;
    }

    public Page<PurchaseRequest> findAll(
            int page,
            int size,
            Integer year,
            String sortBy,
            String sortDir,
            Long idPurchaseRequest,
            List<String> cfo,
            String purchaseRequestInitiator,
            String name,
            String costType,
            String contractType,
            Boolean isPlanned,
            Boolean requiresPurchase) {
        
        logger.info("=== FILTER REQUEST ===");
        logger.info("Filter parameters - year: {}, idPurchaseRequest: {}, cfo: {}, purchaseRequestInitiator: '{}', name: '{}', costType: '{}', contractType: '{}', isPlanned: {}, requiresPurchase: {}",
                year, idPurchaseRequest, cfo, purchaseRequestInitiator, name, costType, contractType, isPlanned, requiresPurchase);
        
        Specification<PurchaseRequest> spec = buildSpecification(
                year, idPurchaseRequest, cfo, purchaseRequestInitiator, name, costType, contractType, isPlanned, requiresPurchase);
        
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<PurchaseRequest> purchaseRequests = purchaseRequestRepository.findAll(spec, pageable);
        
        logger.info("Query result - Found {} purchase requests on page {} (size {}), total elements: {}",
                purchaseRequests.getContent().size(), page, size, purchaseRequests.getTotalElements());
        logger.info("=== END FILTER REQUEST ===\n");
        
        return purchaseRequests;
    }

    public PurchaseRequest findById(Long id) {
        return purchaseRequestRepository.findById(id)
                .orElse(null);
    }

    private Specification<PurchaseRequest> buildSpecification(
            Integer year,
            Long idPurchaseRequest,
            List<String> cfo,
            String purchaseRequestInitiator,
            String name,
            String costType,
            String contractType,
            Boolean isPlanned,
            Boolean requiresPurchase) {
        
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            int predicateCount = 0;
            
            // Фильтр по году
            if (year != null) {
                java.time.LocalDateTime startOfYear = java.time.LocalDateTime.of(year, 1, 1, 0, 0);
                java.time.LocalDateTime endOfYear = java.time.LocalDateTime.of(year, 12, 31, 23, 59, 59);
                predicates.add(cb.between(root.get("purchaseRequestCreationDate"), startOfYear, endOfYear));
                predicateCount++;
                logger.info("Added year filter: {}", year);
            }
            
            // Фильтр по номеру заявки
            if (idPurchaseRequest != null) {
                predicates.add(cb.equal(root.get("idPurchaseRequest"), idPurchaseRequest));
                predicateCount++;
                logger.info("Added idPurchaseRequest filter: {}", idPurchaseRequest);
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
            if (purchaseRequestInitiator != null && !purchaseRequestInitiator.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("purchaseRequestInitiator")), "%" + purchaseRequestInitiator.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added purchaseRequestInitiator filter: '{}'", purchaseRequestInitiator);
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
            
            // Фильтр по плану
            if (isPlanned != null) {
                predicates.add(cb.equal(root.get("isPlanned"), isPlanned));
                predicateCount++;
                logger.info("Added isPlanned filter: {}", isPlanned);
            }
            
            // Фильтр по требуется закупка
            if (requiresPurchase != null) {
                predicates.add(cb.equal(root.get("requiresPurchase"), requiresPurchase));
                predicateCount++;
                logger.info("Added requiresPurchase filter: {}", requiresPurchase);
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

