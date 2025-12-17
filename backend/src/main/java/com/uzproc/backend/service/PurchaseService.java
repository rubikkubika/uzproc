package com.uzproc.backend.service;

import com.uzproc.backend.dto.PurchaseDto;
import com.uzproc.backend.entity.Purchase;
import com.uzproc.backend.entity.PurchaseRequest;
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

import com.uzproc.backend.entity.PurchaseStatus;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
            Integer month,
            String sortBy,
            String sortDir,
            String innerId,
            Long purchaseNumber,
            List<String> cfo,
            String purchaseInitiator,
            String name,
            String costType,
            String contractType,
            Long purchaseRequestId,
            String purchaser,
            List<String> status) {
        
        logger.info("=== FILTER REQUEST ===");
        logger.info("Filter parameters - year: {}, month: {}, innerId: '{}', purchaseNumber: {}, cfo: {}, purchaseInitiator: '{}', name: '{}', costType: '{}', contractType: '{}', purchaseRequestId: {}, purchaser: '{}', status: {}",
                year, month, innerId, purchaseNumber, cfo, purchaseInitiator, name, costType, contractType, purchaseRequestId, purchaser, status);
        
        Specification<Purchase> spec = buildSpecification(
                year, month, innerId, purchaseNumber, cfo, purchaseInitiator, name, costType, contractType, purchaseRequestId, purchaser, status);
        
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
        // Получаем закупщика из связанной заявки
        if (entity.getPurchaseRequest() != null) {
            dto.setPurchaser(entity.getPurchaseRequest().getPurchaser());
        }
        dto.setStatus(entity.getStatus());
        dto.setState(entity.getState());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    private Specification<Purchase> buildSpecification(
            Integer year,
            Integer month,
            String innerId,
            Long purchaseNumber,
            List<String> cfo,
            String purchaseInitiator,
            String name,
            String costType,
            String contractType,
            Long purchaseRequestId,
            String purchaser,
            List<String> status) {
        
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            int predicateCount = 0;
            
            // Фильтр по году и месяцу
            if (year != null) {
                if (month != null && month >= 1 && month <= 12) {
                    // Фильтр по конкретному месяцу
                    java.time.LocalDateTime startOfMonth = java.time.LocalDateTime.of(year, month, 1, 0, 0);
                    java.time.LocalDateTime endOfMonth = java.time.LocalDateTime.of(year, month, 
                        java.time.YearMonth.of(year, month).lengthOfMonth(), 23, 59, 59, 999999999);
                    predicates.add(cb.between(root.get("purchaseCreationDate"), startOfMonth, endOfMonth));
                    predicateCount++;
                    logger.info("Added year and month filter: {} year, {} month ({} - {})", 
                        year, month, startOfMonth, endOfMonth);
                } else {
                    // Фильтр только по году
                java.time.LocalDateTime startOfYear = java.time.LocalDateTime.of(year, 1, 1, 0, 0);
                java.time.LocalDateTime endOfYear = java.time.LocalDateTime.of(year, 12, 31, 23, 59, 59);
                predicates.add(cb.between(root.get("purchaseCreationDate"), startOfYear, endOfYear));
                predicateCount++;
                logger.info("Added year filter: {}", year);
                }
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
            
            // Фильтр по purchaseRequestId
            // По умолчанию (если purchaseRequestId не указан) исключаем закупки без заявки (purchaseRequestId = null)
            // Если purchaseRequestId указан:
            //   - Конкретное число (> 0) - показываем закупки с этим номером заявки
            //   - Специальное значение -1 - показываем только закупки без заявки (purchaseRequestId = null)
            if (purchaseRequestId != null) {
                if (purchaseRequestId == -1L) {
                    // Специальное значение -1 означает показать только закупки без заявки
                    predicates.add(cb.isNull(root.get("purchaseRequestId")));
                    predicateCount++;
                    logger.info("Added purchaseRequestId filter: show only purchases without request (null)");
                } else if (purchaseRequestId > 0) {
                    // Конкретное число - показываем закупки с этим номером заявки
                    predicates.add(cb.equal(root.get("purchaseRequestId"), purchaseRequestId));
                    predicateCount++;
                    logger.info("Added purchaseRequestId filter: {}", purchaseRequestId);
                }
            } else {
                // По умолчанию исключаем закупки без заявки
                predicates.add(cb.isNotNull(root.get("purchaseRequestId")));
                predicateCount++;
                logger.info("Added default filter: exclude purchases without request (purchaseRequestId IS NOT NULL)");
            }
            
            // Фильтр по закупщику (частичное совпадение, case-insensitive, через join с PurchaseRequest)
            if (purchaser != null && !purchaser.trim().isEmpty()) {
                jakarta.persistence.criteria.Join<Purchase, PurchaseRequest> purchaseRequestJoin = 
                    root.join("purchaseRequest", jakarta.persistence.criteria.JoinType.LEFT);
                predicates.add(cb.like(cb.lower(purchaseRequestJoin.get("purchaser")), "%" + purchaser.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added purchaser filter: '{}'", purchaser);
            }
            
            // Фильтр по статусу (множественный выбор)
            if (status != null && !status.isEmpty()) {
                // Убираем пустые значения и тримим
                List<String> validStatusValues = status.stream()
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .map(String::trim)
                    .toList();
                
                if (!validStatusValues.isEmpty()) {
                    // Преобразуем русские названия в enum значения
                    List<PurchaseStatus> statusEnums = validStatusValues.stream()
                        .map(statusStr -> {
                            // Ищем enum по displayName
                            for (PurchaseStatus statusEnum : PurchaseStatus.values()) {
                                if (statusEnum.getDisplayName().equals(statusStr)) {
                                    return statusEnum;
                                }
                            }
                            return null;
                        })
                        .filter(s -> s != null)
                        .collect(Collectors.toList());
                    
                    if (!statusEnums.isEmpty()) {
                        if (statusEnums.size() == 1) {
                            // Одно значение - точное совпадение
                            predicates.add(cb.equal(root.get("status"), statusEnums.get(0)));
                            predicateCount++;
                            logger.info("Added single status filter: '{}'", statusEnums.get(0).getDisplayName());
                        } else {
                            // Несколько значений - IN запрос
                            predicates.add(root.get("status").in(statusEnums));
                            predicateCount++;
                            logger.info("Added multiple status filter: {}", statusEnums.stream()
                                .map(PurchaseStatus::getDisplayName)
                                .collect(Collectors.toList()));
                        }
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
        List<Sort.Order> orders = new ArrayList<>();
        
        // ВАЖНО: Чтобы закупки без заявок (purchaseRequestId = null) всегда были в конце таблицы,
        // независимо от основной сортировки, нужно сначала отсортировать по наличию purchaseRequestId,
        // а затем по основной сортировке. Это гарантирует, что все закупки с purchaseRequestId = null
        // будут в конце, а внутри группы с purchaseRequestId != null будет применяться основная сортировка.
        
        // Сначала сортируем по наличию purchaseRequestId (nullsLast - записи с null будут в конце)
        // Это гарантирует, что закупки без заявок всегда будут в конце таблицы
        orders.add(Sort.Order.by("purchaseRequestId").with(Sort.Direction.ASC).nullsLast());
        
        // Основная сортировка (если указана и не по purchaseRequestId)
        if (sortBy != null && !sortBy.trim().isEmpty() && !"purchaseRequestId".equals(sortBy)) {
            Sort.Direction direction = (sortDir != null && sortDir.equalsIgnoreCase("desc")) 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
            
            // Добавляем основную сортировку после сортировки по purchaseRequestId
            // Это означает, что сначала все записи с purchaseRequestId != null будут отсортированы по основной сортировке,
            // а затем все записи с purchaseRequestId = null будут в конце
            orders.add(Sort.Order.by(sortBy).with(direction));
        } else if ("purchaseRequestId".equals(sortBy)) {
            // Если основная сортировка по purchaseRequestId, используем указанное направление
            Sort.Direction direction = (sortDir != null && sortDir.equalsIgnoreCase("desc")) 
                ? Sort.Direction.DESC 
                : Sort.Direction.ASC;
            // Заменяем первую сортировку на сортировку с указанным направлением
            orders.set(0, Sort.Order.by("purchaseRequestId").with(direction).nullsLast());
        }
        
        return orders.isEmpty() ? Sort.unsorted() : Sort.by(orders);
    }

    /**
     * Получить агрегированные данные по месяцам для закупочных процедур
     * @param year год создания закупки
     * @param useCalendarYear если true, то используется календарный год (январь-декабрь), иначе старая логика
     * @return Map с ключами: monthCounts (количество по месяцам), pendingStatusMonthCounts (количество со статусами "Не согласована", "Не утверждена", "Проект")
     */
    public Map<String, Object> getMonthlyStats(Integer year, Boolean useCalendarYear) {
        // Если useCalendarYear = true, используем новую логику (январь-декабрь выбранного года)
        if (useCalendarYear != null && useCalendarYear && year != null) {
            Specification<Purchase> specForYear = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                
                // Календарный год: январь-декабрь выбранного года
                LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
                LocalDateTime endOfYear = LocalDateTime.of(year, 12, 31, 23, 59, 59, 999999999);
                
                predicates.add(cb.and(
                    cb.isNotNull(root.get("purchaseCreationDate")),
                    cb.greaterThanOrEqualTo(root.get("purchaseCreationDate"), startOfYear),
                    cb.lessThanOrEqualTo(root.get("purchaseCreationDate"), endOfYear)
                ));
                
                return cb.and(predicates.toArray(new Predicate[0]));
            };
            
            List<Purchase> purchases = purchaseRepository.findAll(specForYear);
            
            // Группируем по месяцам (январь-декабрь)
            Map<String, Integer> monthCounts = new HashMap<>();
            String[] monthNames = {"Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"};
            for (String monthName : monthNames) {
                monthCounts.put(monthName, 0);
            }
            
            for (Purchase purchase : purchases) {
                if (purchase.getPurchaseCreationDate() != null) {
                    LocalDateTime date = purchase.getPurchaseCreationDate();
                    int monthIndex = date.getMonthValue() - 1; // 0-11
                    monthCounts.put(monthNames[monthIndex], monthCounts.get(monthNames[monthIndex]) + 1);
                }
            }
            
            // Загружаем данные для закупок со статусами "Не согласована", "Не утверждена", "Проект"
            // Для Purchase статусы: PROJECT
            Specification<Purchase> specForPendingStatus = (root, query, cb) -> {
                List<Predicate> predicates = new ArrayList<>();
                
                // Фильтр по статусу PROJECT
                predicates.add(cb.equal(root.get("status"), PurchaseStatus.PROJECT));
                
                // Календарный год: январь-декабрь выбранного года
                LocalDateTime startOfYear = LocalDateTime.of(year, 1, 1, 0, 0);
                LocalDateTime endOfYear = LocalDateTime.of(year, 12, 31, 23, 59, 59, 999999999);
                
                predicates.add(cb.and(
                    cb.isNotNull(root.get("purchaseCreationDate")),
                    cb.greaterThanOrEqualTo(root.get("purchaseCreationDate"), startOfYear),
                    cb.lessThanOrEqualTo(root.get("purchaseCreationDate"), endOfYear)
                ));
                
                return cb.and(predicates.toArray(new Predicate[0]));
            };
            
            List<Purchase> pendingStatusPurchases = purchaseRepository.findAll(specForPendingStatus);
            
            // Группируем по месяцам для закупок со статусами
            Map<String, Integer> pendingStatusMonthCounts = new HashMap<>();
            for (String monthName : monthNames) {
                pendingStatusMonthCounts.put(monthName, 0);
            }
            
            for (Purchase purchase : pendingStatusPurchases) {
                if (purchase.getPurchaseCreationDate() != null) {
                    LocalDateTime date = purchase.getPurchaseCreationDate();
                    int monthIndex = date.getMonthValue() - 1; // 0-11
                    pendingStatusMonthCounts.put(monthNames[monthIndex], pendingStatusMonthCounts.get(monthNames[monthIndex]) + 1);
                }
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("monthCounts", monthCounts);
            result.put("pendingStatusMonthCounts", pendingStatusMonthCounts);
            return result;
        }
        
        // Старая логика для обратной совместимости
        Map<String, Object> result = new HashMap<>();
        result.put("monthCounts", new HashMap<String, Integer>());
        result.put("pendingStatusMonthCounts", new HashMap<String, Integer>());
        return result;
    }
}

