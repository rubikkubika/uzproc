package com.uzproc.backend.service;

import com.uzproc.backend.dto.PurchasePlanItemDto;
import com.uzproc.backend.entity.PurchasePlanItem;
import com.uzproc.backend.entity.PurchasePlanItemStatus;
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
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional(readOnly = true)
public class PurchasePlanItemService {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanItemService.class);
    
    private final PurchasePlanItemRepository purchasePlanItemRepository;
    private final PurchasePlanItemChangeService purchasePlanItemChangeService;

    public PurchasePlanItemService(PurchasePlanItemRepository purchasePlanItemRepository, PurchasePlanItemChangeService purchasePlanItemChangeService) {
        this.purchasePlanItemRepository = purchasePlanItemRepository;
        this.purchasePlanItemChangeService = purchasePlanItemChangeService;
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
            Integer requestYear,
            String currentContractEndDate,
            List<String> status) {
        
        logger.info("=== FILTER REQUEST ===");
        logger.info("Filter parameters - year: {}, company: '{}', cfo: {}, purchaseSubject: '{}', purchaser: {}, category: {}, requestMonth: {}, requestYear: {}, currentContractEndDate: '{}', status: {}",
                year, company, cfo, purchaseSubject, purchaser, category, requestMonth, requestYear, currentContractEndDate, status);
        
        Specification<PurchasePlanItem> spec = buildSpecification(year, company, cfo, purchaseSubject, purchaser, category, requestMonth, requestYear, currentContractEndDate, status);
        
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
                    // Валидация: дата нового договора не может быть позже даты окончания действующего договора
                    if (newContractDate != null && item.getCurrentContractEndDate() != null) {
                        if (newContractDate.isAfter(item.getCurrentContractEndDate())) {
                            logger.warn("Validation failed for purchase plan item {}: newContractDate ({}) cannot be after currentContractEndDate ({})", 
                                    id, newContractDate, item.getCurrentContractEndDate());
                            throw new IllegalArgumentException(
                                    String.format("Дата нового договора (%s) не может быть позже даты окончания действующего договора (%s)", 
                                            newContractDate, item.getCurrentContractEndDate()));
                        }
                    }
                    
                    // Сохраняем старые значения для логирования изменений
                    LocalDate oldRequestDate = item.getRequestDate();
                    LocalDate oldNewContractDate = item.getNewContractDate();
                    
                    // Логируем изменения перед обновлением
                    if (requestDate != null && !requestDate.equals(oldRequestDate)) {
                        purchasePlanItemChangeService.logChange(
                            item.getId(),
                            item.getGuid(),
                            "requestDate",
                            oldRequestDate,
                            requestDate
                        );
                    }
                    
                    if (newContractDate != null && !newContractDate.equals(oldNewContractDate)) {
                        purchasePlanItemChangeService.logChange(
                            item.getId(),
                            item.getGuid(),
                            "newContractDate",
                            oldNewContractDate,
                            newContractDate
                        );
                    }
                    
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
                    // Сохраняем старое значение для логирования изменений
                    LocalDate oldContractEndDate = item.getContractEndDate();
                    
                    // Логируем изменение перед обновлением
                    if (contractEndDate != null && !contractEndDate.equals(oldContractEndDate)) {
                        purchasePlanItemChangeService.logChange(
                            item.getId(),
                            item.getGuid(),
                            "contractEndDate",
                            oldContractEndDate,
                            contractEndDate
                        );
                    }
                    
                    item.setContractEndDate(contractEndDate);
                    PurchasePlanItem saved = purchasePlanItemRepository.save(item);
                    logger.info("Updated contract end date for purchase plan item {}: contractEndDate={}", 
                            id, contractEndDate);
                    return toDto(saved);
                })
                .orElse(null);
    }

    @Transactional
    public PurchasePlanItemDto updateStatus(Long id, PurchasePlanItemStatus status) {
        return purchasePlanItemRepository.findById(id)
                .map(item -> {
                    // Сохраняем старое значение для логирования изменений
                    PurchasePlanItemStatus oldStatus = item.getStatus();
                    
                    // Логируем изменение перед обновлением
                    if (status != null && !status.equals(oldStatus)) {
                        purchasePlanItemChangeService.logChange(
                            item.getId(),
                            item.getGuid(),
                            "status",
                            oldStatus != null ? oldStatus.getDisplayName() : null,
                            status != null ? status.getDisplayName() : null
                        );
                    }
                    
                    item.setStatus(status);
                    PurchasePlanItem saved = purchasePlanItemRepository.save(item);
                    logger.info("Updated status for purchase plan item {}: status={}", 
                            id, status);
                    return toDto(saved);
                })
                .orElse(null);
    }

    @Transactional
    public PurchasePlanItemDto updateHolding(Long id, String holding) {
        return purchasePlanItemRepository.findById(id)
                .map(item -> {
                    // Сохраняем старое значение для логирования изменений
                    String oldHolding = item.getHolding();
                    
                    // Нормализуем новое значение (trim и null если пусто)
                    String newHolding = holding != null && !holding.trim().isEmpty() ? holding.trim() : null;
                    
                    // Логируем изменение перед обновлением
                    if ((oldHolding == null && newHolding != null) || 
                        (oldHolding != null && !oldHolding.equals(newHolding))) {
                        purchasePlanItemChangeService.logChange(
                            item.getId(),
                            item.getGuid(),
                            "holding",
                            oldHolding,
                            newHolding
                        );
                    }
                    
                    item.setHolding(newHolding);
                    PurchasePlanItem saved = purchasePlanItemRepository.save(item);
                    logger.info("Updated holding for purchase plan item {}: holding={}", 
                            id, newHolding);
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
        dto.setStatus(entity.getStatus());
        dto.setState(entity.getState());
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
            Integer requestYear,
            String currentContractEndDate,
            List<String> status) {
        
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
            
            // Фильтр по дате окончания действующего договора
            if (currentContractEndDate != null && !currentContractEndDate.trim().isEmpty()) {
                String trimmedValue = currentContractEndDate.trim();
                // Если значение "null" или "-", фильтруем записи без даты
                if ("null".equalsIgnoreCase(trimmedValue) || "-".equals(trimmedValue)) {
                    predicates.add(cb.isNull(root.get("currentContractEndDate")));
                    predicateCount++;
                    logger.info("Added currentContractEndDate filter: без даты (null)");
                } else {
                    try {
                        LocalDate filterDate = LocalDate.parse(trimmedValue);
                        predicates.add(cb.equal(root.get("currentContractEndDate"), filterDate));
                        predicateCount++;
                        logger.info("Added currentContractEndDate filter: {}", filterDate);
                    } catch (Exception e) {
                        logger.warn("Invalid currentContractEndDate filter value: '{}', error: {}", currentContractEndDate, e.getMessage());
                    }
                }
            }
            
            // Фильтр по статусу (поддержка множественного выбора)
            if (status != null && !status.isEmpty()) {
                // Убираем пустые значения и тримим
                List<String> validStatusValues = status.stream()
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .map(String::trim)
                    .toList();
                
                if (!validStatusValues.isEmpty()) {
                    try {
                        // Преобразуем строковые значения (displayName) в enum
                        List<com.uzproc.backend.entity.PurchasePlanItemStatus> statusEnums = validStatusValues.stream()
                            .map(statusValue -> {
                                // Ищем по displayName (отображаемое имя)
                                for (com.uzproc.backend.entity.PurchasePlanItemStatus statusEnum : com.uzproc.backend.entity.PurchasePlanItemStatus.values()) {
                                    if (statusEnum.getDisplayName().equalsIgnoreCase(statusValue)) {
                                        return statusEnum;
                                    }
                                }
                                // Если не найдено по displayName, пробуем по имени enum
                                try {
                                    return com.uzproc.backend.entity.PurchasePlanItemStatus.valueOf(statusValue.toUpperCase().replace(" ", "_").replace("НЕ_", "NOT_"));
                                } catch (IllegalArgumentException e) {
                                    return null;
                                }
                            })
                            .filter(java.util.Objects::nonNull)
                            .toList();
                        
                        if (!statusEnums.isEmpty()) {
                            if (statusEnums.size() == 1) {
                                // Одно значение - точное совпадение
                                predicates.add(cb.equal(root.get("status"), statusEnums.get(0)));
                                predicateCount++;
                                logger.info("Added single status filter: '{}'", statusEnums.get(0));
                            } else {
                                // Несколько значений - IN запрос
                                predicates.add(root.get("status").in(statusEnums));
                                predicateCount++;
                                logger.info("Added multiple status filter: {}", statusEnums);
                            }
                        }
                    } catch (Exception e) {
                        logger.warn("Error processing status filter: {}", e.getMessage());
                    }
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

    /**
     * Получить агрегированные данные по месяцам для плана закупок
     * Логика: "Дек (пред. год)" = декабрь выбранного года (selectedYear), остальные месяцы = год + 1
     * year - год планирования (year в таблице purchase_plan_items), который соответствует selectedYear + 1 на фронтенде
     * selectedYear на фронтенде = year - 1 на бэкенде
     * "Дек (пред. год)" = декабрь selectedYear = декабрь (year - 1)
     * Январь-декабрь = year (selectedYear + 1)
     */
    public Map<String, Object> getMonthlyStats(Integer year) {
        // Загружаем данные с годом планирования = year
        // requestDate может быть в декабре (year - 1) или в year
        Specification<PurchasePlanItem> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (year != null) {
                predicates.add(cb.equal(root.get("year"), year));
            }
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
        
        List<PurchasePlanItem> items = purchasePlanItemRepository.findAll(spec);
        
        // Группируем по месяцам на основе requestDate
        Map<String, Integer> monthCounts = new HashMap<>();
        monthCounts.put("Дек (пред. год)", 0);
        for (int i = 0; i < 12; i++) {
            String[] monthNames = {"Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"};
            monthCounts.put(monthNames[i], 0);
        }
        
        for (PurchasePlanItem item : items) {
            if (item.getRequestDate() != null) {
                LocalDate date = item.getRequestDate();
                int monthIndex = date.getMonthValue() - 1; // 0-11
                int requestYear = date.getYear();
                
                if (year != null) {
                    // selectedYear = year - 1
                    // "Дек (пред. год)" = декабрь selectedYear = декабрь (year - 1)
                    if (monthIndex == 11 && requestYear == year - 1) {
                        monthCounts.put("Дек (пред. год)", monthCounts.get("Дек (пред. год)") + 1);
                    } else if (requestYear == year) {
                        // Остальные месяцы года планирования (year = selectedYear + 1)
                        String[] monthNames = {"Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"};
                        monthCounts.put(monthNames[monthIndex], monthCounts.get(monthNames[monthIndex]) + 1);
                    }
                } else {
                    // Если год не указан, показываем все данные
                    String[] monthNames = {"Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"};
                    monthCounts.put(monthNames[monthIndex], monthCounts.get(monthNames[monthIndex]) + 1);
                }
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("monthCounts", monthCounts);
        return result;
    }
}

