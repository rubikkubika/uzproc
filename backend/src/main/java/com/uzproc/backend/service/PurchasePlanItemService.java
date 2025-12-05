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
            String purchaseSubject,
            List<String> purchaser,
            List<String> category,
            Integer requestMonth,
            Integer requestYear) {
        
        logger.info("=== FILTER REQUEST ===");
        logger.info("Filter parameters - year: {}, company: '{}', cfo: {}, purchaseSubject: '{}', purchaser: {}, category: {}, requestMonth: {}, requestYear: {}",
                year, company, cfo, purchaseSubject, purchaser, category, requestMonth, requestYear);
        
        Specification<PurchasePlanItem> spec = buildSpecification(year, company, cfo, purchaseSubject, purchaser, category, requestMonth, requestYear);
        
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

    @Transactional
    public PurchasePlanItemDto updateDates(Long id, LocalDate requestDate, LocalDate newContractDate) {
        return purchasePlanItemRepository.findById(id)
                .map(item -> {
                    item.setRequestDate(requestDate);
                    item.setNewContractDate(newContractDate);
                    PurchasePlanItem saved = purchasePlanItemRepository.save(item);
                    logger.info("Updated dates for purchase plan item {}: requestDate={}, newContractDate={}", 
                            id, requestDate, newContractDate);
                    return toDto(saved);
                })
                .orElse(null);
    }

    @Transactional
    public PurchasePlanItemDto updateContractEndDate(Long id, LocalDate contractEndDate) {
        return purchasePlanItemRepository.findById(id)
                .map(item -> {
                    item.setContractEndDate(contractEndDate);
                    PurchasePlanItem saved = purchasePlanItemRepository.save(item);
                    logger.info("Updated contract end date for purchase plan item {}: contractEndDate={}", 
                            id, contractEndDate);
                    return toDto(saved);
                })
                .orElse(null);
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
        dto.setPurchaser(entity.getPurchaser());
        dto.setProduct(entity.getProduct());
        dto.setHasContract(entity.getHasContract());
        dto.setCurrentKa(entity.getCurrentKa());
        dto.setCurrentAmount(entity.getCurrentAmount());
        dto.setCurrentContractAmount(entity.getCurrentContractAmount());
        dto.setCurrentContractBalance(entity.getCurrentContractBalance());
        dto.setCurrentContractEndDate(entity.getCurrentContractEndDate());
        dto.setAutoRenewal(entity.getAutoRenewal());
        dto.setComplexity(entity.getComplexity());
        dto.setHolding(entity.getHolding());
        dto.setCategory(entity.getCategory());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    private Specification<PurchasePlanItem> buildSpecification(
            Integer year,
            String company,
            List<String> cfo,
            String purchaseSubject,
            List<String> purchaser,
            List<String> category,
            Integer requestMonth,
            Integer requestYear) {
        
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
            
            // Фильтр по закупщику (поддержка множественного выбора - точное совпадение)
            if (purchaser != null && !purchaser.isEmpty()) {
                // Убираем пустые значения и тримим
                List<String> validPurchaserValues = purchaser.stream()
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .map(String::trim)
                    .toList();
                
                if (!validPurchaserValues.isEmpty()) {
                    if (validPurchaserValues.size() == 1) {
                        // Одно значение - точное совпадение
                        predicates.add(cb.equal(cb.lower(root.get("purchaser")), validPurchaserValues.get(0).toLowerCase()));
                        predicateCount++;
                        logger.info("Added single purchaser filter: '{}'", validPurchaserValues.get(0));
                    } else {
                        // Несколько значений - IN запрос
                        List<Predicate> purchaserPredicates = validPurchaserValues.stream()
                            .map(purchaserValue -> cb.equal(cb.lower(root.get("purchaser")), purchaserValue.toLowerCase()))
                            .toList();
                        predicates.add(cb.or(purchaserPredicates.toArray(new Predicate[0])));
                        predicateCount++;
                        logger.info("Added multiple purchaser filter: {}", validPurchaserValues);
                    }
                }
            }
            
            // Фильтр по категории (поддержка множественного выбора - точное совпадение)
            if (category != null && !category.isEmpty()) {
                // Убираем пустые значения и тримим
                List<String> validCategoryValues = category.stream()
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .map(String::trim)
                    .toList();
                
                if (!validCategoryValues.isEmpty()) {
                    if (validCategoryValues.size() == 1) {
                        // Одно значение - точное совпадение
                        predicates.add(cb.equal(cb.lower(root.get("category")), validCategoryValues.get(0).toLowerCase()));
                        predicateCount++;
                        logger.info("Added single category filter: '{}'", validCategoryValues.get(0));
                    } else {
                        // Несколько значений - IN запрос
                        List<Predicate> categoryPredicates = validCategoryValues.stream()
                            .map(categoryValue -> cb.equal(cb.lower(root.get("category")), categoryValue.toLowerCase()))
                            .toList();
                        predicates.add(cb.or(categoryPredicates.toArray(new Predicate[0])));
                        predicateCount++;
                        logger.info("Added multiple category filter: {}", validCategoryValues);
                    }
                }
            }
            
            // Фильтр по месяцу даты заявки
            if (requestMonth != null) {
                if (requestMonth == -1) {
                    // Фильтр для записей без даты
                    predicates.add(cb.isNull(root.get("requestDate")));
                    predicateCount++;
                    logger.info("Added requestMonth filter: без даты (null)");
                } else {
                    // Фильтр по конкретному месяцу
                    // Определяем год для фильтрации:
                    // 1. Если передан requestYear - используем его (для месяцев из другого года, например декабрь предыдущего года)
                    // 2. Иначе используем year (год планирования)
                    // 3. Иначе текущий год
                    Integer filterYear = requestYear != null ? requestYear : (year != null ? year : java.time.Year.now().getValue());
                    java.time.LocalDate startOfMonth = java.time.LocalDate.of(filterYear, requestMonth + 1, 1);
                    java.time.LocalDate endOfMonth = startOfMonth.withDayOfMonth(startOfMonth.lengthOfMonth());
                    
                    predicates.add(cb.between(root.get("requestDate"), startOfMonth, endOfMonth));
                    predicateCount++;
                    logger.info("Added requestMonth filter: месяц {} года {} ({} - {})", requestMonth, filterYear, startOfMonth, endOfMonth);
                }
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

