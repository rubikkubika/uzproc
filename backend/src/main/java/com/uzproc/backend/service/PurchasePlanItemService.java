package com.uzproc.backend.service;

import com.uzproc.backend.dto.PurchasePlanItemDto;
import com.uzproc.backend.entity.Company;
import com.uzproc.backend.entity.Cfo;
import com.uzproc.backend.entity.PurchasePlanItem;
import com.uzproc.backend.entity.PurchasePlanItemStatus;
import com.uzproc.backend.repository.CfoRepository;
import com.uzproc.backend.repository.PurchasePlanItemRepository;
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
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final CfoRepository cfoRepository;

    public PurchasePlanItemService(
            PurchasePlanItemRepository purchasePlanItemRepository, 
            PurchasePlanItemChangeService purchasePlanItemChangeService,
            PurchaseRequestRepository purchaseRequestRepository,
            CfoRepository cfoRepository) {
        this.purchasePlanItemRepository = purchasePlanItemRepository;
        this.purchasePlanItemChangeService = purchasePlanItemChangeService;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.cfoRepository = cfoRepository;
    }

    public Page<PurchasePlanItemDto> findAll(
            int page,
            int size,
            Integer year,
            String sortBy,
            String sortDir,
            List<String> company,
            List<String> cfo,
            String purchaseSubject,
            List<String> purchaser,
            List<String> category,
            Integer requestMonth,
            Integer requestYear,
            String currentContractEndDate,
            List<String> status,
            String purchaseRequestId) {
        
        logger.info("=== FILTER REQUEST ===");
        logger.info("Filter parameters - year: {}, company: {}, cfo: {}, purchaseSubject: '{}', purchaser: {}, category: {}, requestMonth: {}, requestYear: {}, currentContractEndDate: '{}', status: {}, purchaseRequestId: '{}'",
                year, company, cfo, purchaseSubject, purchaser, category, requestMonth, requestYear, currentContractEndDate, status, purchaseRequestId);
        
        Specification<PurchasePlanItem> spec = buildSpecification(year, company, cfo, purchaseSubject, purchaser, category, requestMonth, requestYear, currentContractEndDate, status, purchaseRequestId);
        
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
     * Добавляет рабочие дни к дате (исключая выходные: суббота и воскресенье)
     */
    private LocalDate addWorkingDays(LocalDate date, int workingDays) {
        LocalDate result = date;
        int daysAdded = 0;
        
        while (daysAdded < workingDays) {
            result = result.plusDays(1);
            int dayOfWeek = result.getDayOfWeek().getValue(); // 1 = понедельник, 7 = воскресенье
            // Пропускаем выходные (суббота = 6, воскресенье = 7)
            if (dayOfWeek != 6 && dayOfWeek != 7) {
                daysAdded++;
            }
        }
        
        return result;
    }

    /**
     * Получает количество рабочих дней на основе сложности
     */
    private Integer getWorkingDaysByComplexity(String complexity) {
        if (complexity == null || complexity.trim().isEmpty()) {
            return null;
        }
        try {
            int complexityNum = Integer.parseInt(complexity.trim());
            switch (complexityNum) {
                case 1: return 7;
                case 2: return 14;
                case 3: return 22;
                case 4: return 50;
                default: return null;
            }
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Рассчитывает дату нового договора на основе даты заявки и сложности
     */
    private LocalDate calculateNewContractDate(LocalDate requestDate, String complexity) {
        if (requestDate == null || complexity == null || complexity.trim().isEmpty()) {
            return null;
        }
        
        Integer workingDays = getWorkingDaysByComplexity(complexity);
        if (workingDays == null) {
            return null;
        }
        
        return addWorkingDays(requestDate, workingDays);
    }

    @Transactional
    public PurchasePlanItemDto updateDates(Long id, LocalDate requestDate, LocalDate newContractDate) {
        return purchasePlanItemRepository.findById(id)
                .map(item -> {
                    // Сохраняем старые значения для логирования изменений
                    LocalDate oldRequestDate = item.getRequestDate();
                    LocalDate oldNewContractDate = item.getNewContractDate();
                    
                    // Создаем финальные копии для использования в лямбда-выражении
                    LocalDate finalRequestDate = requestDate;
                    LocalDate finalNewContractDate = newContractDate;
                    
                    // Если изменяется дата заявки и есть сложность, автоматически пересчитываем дату нового договора
                    if (finalRequestDate != null && !finalRequestDate.equals(oldRequestDate) && item.getComplexity() != null) {
                        LocalDate calculatedDate = calculateNewContractDate(finalRequestDate, item.getComplexity());
                        if (calculatedDate != null) {
                            finalNewContractDate = calculatedDate;
                        }
                    }
                    
                    // Логируем изменения перед обновлением
                    if (finalRequestDate != null && !finalRequestDate.equals(oldRequestDate)) {
                        purchasePlanItemChangeService.logChange(
                            item.getId(),
                            item.getGuid(),
                            "requestDate",
                            oldRequestDate,
                            finalRequestDate
                        );
                    }
                    
                    if (finalNewContractDate != null && !finalNewContractDate.equals(oldNewContractDate)) {
                        purchasePlanItemChangeService.logChange(
                            item.getId(),
                            item.getGuid(),
                            "newContractDate",
                            oldNewContractDate,
                            finalNewContractDate
                        );
                    }
                    
                    item.setRequestDate(finalRequestDate);
                    item.setNewContractDate(finalNewContractDate);
                    PurchasePlanItem saved = purchasePlanItemRepository.save(item);
                    logger.info("Updated dates for purchase plan item {}: requestDate={}, newContractDate={}", 
                            id, finalRequestDate, finalNewContractDate);
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

    @Transactional
    public PurchasePlanItemDto updateCompany(Long id, Company company) {
        return purchasePlanItemRepository.findById(id)
                .map(item -> {
                    Company oldCompany = item.getCompany();
                    if (company != null && !company.equals(oldCompany)) {
                        purchasePlanItemChangeService.logChange(
                            item.getId(),
                            item.getGuid(),
                            "company",
                            oldCompany != null ? oldCompany.getDisplayName() : null,
                            company != null ? company.getDisplayName() : null
                        );
                    }
                    item.setCompany(company);
                    PurchasePlanItem saved = purchasePlanItemRepository.save(item);
                    logger.info("Updated company for purchase plan item {}: company={}",
                            id, company);
                    return toDto(saved);
                })
                .orElse(null);
    }

    @Transactional
    public PurchasePlanItemDto updatePurchaseRequestId(Long id, Long purchaseRequestId) {
        return purchasePlanItemRepository.findById(id)
                .map(item -> {
                    // Если purchaseRequestId не null, проверяем существование заявки на закупку
                    if (purchaseRequestId != null) {
                        boolean exists = purchaseRequestRepository.existsByIdPurchaseRequest(purchaseRequestId);
                        if (!exists) {
                            logger.warn("PurchaseRequest with idPurchaseRequest={} not found for purchase plan item {}", 
                                    purchaseRequestId, id);
                            throw new IllegalArgumentException(
                                    String.format("Заявка на закупку с номером %d не найдена", purchaseRequestId));
                        }
                    }
                    
                    Long oldPurchaseRequestId = item.getPurchaseRequestId();
                    com.uzproc.backend.entity.PurchasePlanItemStatus oldStatus = item.getStatus();
                    
                    // Логируем изменение перед обновлением
                    if ((oldPurchaseRequestId == null && purchaseRequestId != null) || 
                        (oldPurchaseRequestId != null && !oldPurchaseRequestId.equals(purchaseRequestId))) {
                        purchasePlanItemChangeService.logChange(
                            item.getId(),
                            item.getGuid(),
                            "purchaseRequestId",
                            oldPurchaseRequestId != null ? oldPurchaseRequestId.toString() : null,
                            purchaseRequestId != null ? purchaseRequestId.toString() : null
                        );
                    }
                    
                    item.setPurchaseRequestId(purchaseRequestId);
                    
                    // Если присваивается номер заявки (purchaseRequestId не null), устанавливаем статус "Заявка"
                    if (purchaseRequestId != null && oldPurchaseRequestId == null) {
                        // Присваивается номер заявки впервые - устанавливаем статус "Заявка"
                        item.setStatus(com.uzproc.backend.entity.PurchasePlanItemStatus.REQUEST);
                        if (oldStatus != com.uzproc.backend.entity.PurchasePlanItemStatus.REQUEST) {
                            purchasePlanItemChangeService.logChange(
                                item.getId(),
                                item.getGuid(),
                                "status",
                                oldStatus != null ? oldStatus.getDisplayName() : null,
                                com.uzproc.backend.entity.PurchasePlanItemStatus.REQUEST.getDisplayName()
                            );
                            logger.info("Set status to REQUEST for purchase plan item {} when assigning purchaseRequestId={}",
                                    id, purchaseRequestId);
                        }
                    } else if (purchaseRequestId == null && oldPurchaseRequestId != null) {
                        // Номер заявки удаляется - сбрасываем статус "Заявка" (если он был установлен)
                        if (oldStatus == com.uzproc.backend.entity.PurchasePlanItemStatus.REQUEST) {
                            item.setStatus(null);
                            purchasePlanItemChangeService.logChange(
                                item.getId(),
                                item.getGuid(),
                                "status",
                                com.uzproc.backend.entity.PurchasePlanItemStatus.REQUEST.getDisplayName(),
                                null
                            );
                            logger.info("Cleared status REQUEST for purchase plan item {} when removing purchaseRequestId",
                                    id);
                        }
                    }
                    
                    PurchasePlanItem saved = purchasePlanItemRepository.save(item);
                    logger.info("Updated purchaseRequestId for purchase plan item {}: purchaseRequestId={}",
                            id, purchaseRequestId);
                    return toDto(saved);
                })
                .orElse(null);
    }

    @Transactional
    public PurchasePlanItemDto updatePurchaseSubject(Long id, String purchaseSubject) {
        return purchasePlanItemRepository.findById(id)
                .map(item -> {
                    String oldPurchaseSubject = item.getPurchaseSubject();
                    String trimmedSubject = purchaseSubject != null ? purchaseSubject.trim() : null;
                    
                    // Логируем изменение перед обновлением
                    if ((oldPurchaseSubject == null && trimmedSubject != null) || 
                        (oldPurchaseSubject != null && !oldPurchaseSubject.equals(trimmedSubject))) {
                        purchasePlanItemChangeService.logChange(
                            item.getId(),
                            item.getGuid(),
                            "purchaseSubject",
                            oldPurchaseSubject,
                            trimmedSubject
                        );
                    }
                    
                    item.setPurchaseSubject(trimmedSubject);
                    PurchasePlanItem saved = purchasePlanItemRepository.save(item);
                    logger.info("Updated purchaseSubject for purchase plan item {}: purchaseSubject={}",
                            id, trimmedSubject);
                    return toDto(saved);
                })
                .orElse(null);
    }

    @Transactional
    public PurchasePlanItemDto updateCfo(Long id, String cfoName) {
        return purchasePlanItemRepository.findById(id)
                .map(item -> {
                    Cfo oldCfo = item.getCfo();
                    String oldCfoName = oldCfo != null ? oldCfo.getName() : null;
                    
                    Cfo newCfo = null;
                    String trimmedCfoName = cfoName != null ? cfoName.trim() : null;
                    
                    if (trimmedCfoName != null && !trimmedCfoName.isEmpty()) {
                        // Ищем существующий ЦФО по названию (регистронезависимо)
                        newCfo = cfoRepository.findByNameIgnoreCase(trimmedCfoName).orElse(null);
                        
                        if (newCfo == null) {
                            // Если ЦФО не найден, создаем новый
                            newCfo = new Cfo(trimmedCfoName);
                            newCfo = cfoRepository.save(newCfo);
                            logger.debug("Created new Cfo: {}", trimmedCfoName);
                        }
                    }
                    
                    // Логируем изменение перед обновлением
                    if ((oldCfoName == null && trimmedCfoName != null) || 
                        (oldCfoName != null && !oldCfoName.equals(trimmedCfoName))) {
                        purchasePlanItemChangeService.logChange(
                            item.getId(),
                            item.getGuid(),
                            "cfo",
                            oldCfoName,
                            trimmedCfoName
                        );
                    }
                    
                    item.setCfo(newCfo);
                    PurchasePlanItem saved = purchasePlanItemRepository.save(item);
                    logger.info("Updated cfo for purchase plan item {}: cfo={}",
                            id, trimmedCfoName);
                    return toDto(saved);
                })
                .orElse(null);
    }

    @Transactional
    public PurchasePlanItemDto create(PurchasePlanItemDto dto) {
        PurchasePlanItem item = new PurchasePlanItem();
        
        // Устанавливаем год (если не указан, используем текущий год + 1 для планирования)
        if (dto.getYear() != null) {
            item.setYear(dto.getYear());
        } else {
            // По умолчанию год планирования = текущий год + 1
            item.setYear(LocalDate.now().getYear() + 1);
        }
        
        // Устанавливаем компанию
        item.setCompany(dto.getCompany());
        
        // Устанавливаем ЦФО
        if (dto.getCfo() != null && !dto.getCfo().trim().isEmpty()) {
            String trimmedCfoName = dto.getCfo().trim();
            Cfo cfo = cfoRepository.findByNameIgnoreCase(trimmedCfoName).orElse(null);
            if (cfo == null) {
                // Если ЦФО не найден, создаем новый
                cfo = new Cfo(trimmedCfoName);
                cfo = cfoRepository.save(cfo);
                logger.debug("Created new Cfo: {}", trimmedCfoName);
            }
            item.setCfo(cfo);
        }
        
        // Устанавливаем остальные поля
        item.setPurchaseSubject(dto.getPurchaseSubject());
        item.setBudgetAmount(dto.getBudgetAmount());
        item.setContractEndDate(dto.getContractEndDate());
        item.setRequestDate(dto.getRequestDate());
        item.setNewContractDate(dto.getNewContractDate());
        item.setPurchaser(dto.getPurchaser());
        item.setProduct(dto.getProduct());
        item.setHasContract(dto.getHasContract());
        item.setCurrentKa(dto.getCurrentKa());
        item.setCurrentAmount(dto.getCurrentAmount());
        item.setCurrentContractAmount(dto.getCurrentContractAmount());
        item.setCurrentContractBalance(dto.getCurrentContractBalance());
        item.setCurrentContractEndDate(dto.getCurrentContractEndDate());
        item.setAutoRenewal(dto.getAutoRenewal());
        item.setComplexity(dto.getComplexity());
        item.setHolding(dto.getHolding());
        item.setCategory(dto.getCategory());
        
        // Устанавливаем статус (по умолчанию "Проект")
        PurchasePlanItemStatus status = PurchasePlanItemStatus.PROJECT;
        if (dto.getStatus() != null) {
            // Пробуем найти статус по displayName
            for (PurchasePlanItemStatus s : PurchasePlanItemStatus.values()) {
                if (s.getDisplayName().equalsIgnoreCase(dto.getStatus().toString())) {
                    status = s;
                    break;
                }
            }
        }
        item.setStatus(status);
        
        item.setState(dto.getState());
        item.setPurchaseRequestId(dto.getPurchaseRequestId());
        
        // GUID будет создан автоматически через @PrePersist
        PurchasePlanItem saved = purchasePlanItemRepository.save(item);
        
        logger.info("Created new purchase plan item with id: {}", saved.getId());
        return toDto(saved);
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
        dto.setCfo(entity.getCfo() != null ? entity.getCfo().getName() : null);
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
        dto.setPurchaseRequestId(entity.getPurchaseRequestId());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    private Specification<PurchasePlanItem> buildSpecification(
            Integer year,
            List<String> company,
            List<String> cfo,
            String purchaseSubject,
            List<String> purchaser,
            List<String> category,
            Integer requestMonth,
            Integer requestYear,
            String currentContractEndDate,
            List<String> status,
            String purchaseRequestId) {
        
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            int predicateCount = 0;
            
            // Фильтр по году
            if (year != null) {
                predicates.add(cb.equal(root.get("year"), year));
                predicateCount++;
                logger.info("Added year filter: {}", year);
            }
            
            // Фильтр по компании (поддержка множественного выбора - поиск по displayName enum)
            if (company != null && !company.isEmpty()) {
                // Убираем пустые значения и тримим
                List<String> validCompanyValues = company.stream()
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .map(String::trim)
                    .toList();
                
                if (!validCompanyValues.isEmpty()) {
                    // Конвертируем строковые значения в enum
                    List<Company> companyEnums = new ArrayList<>();
                    for (String companyStr : validCompanyValues) {
                        String companyLower = companyStr.toLowerCase();
                        // Пробуем найти соответствующий enum по displayName
                        Company companyEnum = null;
                        for (Company c : Company.values()) {
                            if (c.getDisplayName().toLowerCase().equals(companyLower) || 
                                c.getDisplayName().toLowerCase().contains(companyLower) ||
                                companyLower.contains(c.getDisplayName().toLowerCase())) {
                                companyEnum = c;
                                break;
                            }
                        }
                        // Также пробуем найти по имени enum (UZUM_MARKET, UZUM_TECHNOLOGIES)
                        if (companyEnum == null) {
                            try {
                                companyEnum = Company.valueOf(companyStr.toUpperCase().replace(" ", "_"));
                            } catch (IllegalArgumentException e) {
                                // Игнорируем, если не найден
                            }
                        }
                        if (companyEnum != null) {
                            companyEnums.add(companyEnum);
                        }
                    }
                    
                    if (!companyEnums.isEmpty()) {
                        if (companyEnums.size() == 1) {
                            predicates.add(cb.equal(root.get("company"), companyEnums.get(0)));
                            predicateCount++;
                            logger.info("Added single company filter: '{}' (enum: {})", validCompanyValues.get(0), companyEnums.get(0));
                        } else {
                            predicates.add(root.get("company").in(companyEnums));
                            predicateCount++;
                            logger.info("Added multiple company filter: {} (enums: {})", validCompanyValues, companyEnums);
                        }
                    } else {
                        logger.warn("No valid company enums found for values: {}", validCompanyValues);
                    }
                }
            }
            
            // Фильтр по ЦФО (поддержка множественного выбора - точное совпадение)
            if (cfo != null && !cfo.isEmpty()) {
                // Убираем пустые значения и тримим
                List<String> validCfoValues = cfo.stream()
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .map(String::trim)
                    .toList();
                
                if (!validCfoValues.isEmpty()) {
                    // Делаем join к связанной сущности Cfo и фильтруем по name
                    jakarta.persistence.criteria.Join<PurchasePlanItem, com.uzproc.backend.entity.Cfo> cfoJoin = root.join("cfo", jakarta.persistence.criteria.JoinType.LEFT);
                    predicates.add(cb.lower(cfoJoin.get("name")).in(
                        validCfoValues.stream().map(String::toLowerCase).toList()
                    ));
                    predicateCount++;
                    logger.info("Added cfo filter: {}", validCfoValues);
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
                        // Проверяем, есть ли в списке статусов специальное значение для null (пустых значений)
                        boolean includeNull = validStatusValues.stream()
                            .anyMatch(s -> s.equalsIgnoreCase("Пусто") || s.equalsIgnoreCase("__NULL__") || s.trim().isEmpty());
                        
                        // Преобразуем строковые значения (displayName) в enum
                        // Исключаем специальные значения для null ("Пусто", "__NULL__", пустые строки)
                        List<com.uzproc.backend.entity.PurchasePlanItemStatus> statusEnums = validStatusValues.stream()
                            .filter(statusValue -> {
                                // Пропускаем специальные значения для null
                                return !statusValue.equalsIgnoreCase("Пусто") 
                                    && !statusValue.equalsIgnoreCase("__NULL__") 
                                    && !statusValue.trim().isEmpty();
                            })
                            .map(statusValue -> {
                                // Ищем по displayName (отображаемое имя)
                                String trimmedValue = statusValue.trim();
                                logger.debug("Processing status value: '{}' (length: {}, bytes: {})", 
                                    trimmedValue, trimmedValue.length(), 
                                    java.util.Arrays.toString(trimmedValue.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
                                
                                for (com.uzproc.backend.entity.PurchasePlanItemStatus statusEnum : com.uzproc.backend.entity.PurchasePlanItemStatus.values()) {
                                    String displayName = statusEnum.getDisplayName();
                                    logger.debug("Comparing '{}' with '{}' (equals: {}, equalsIgnoreCase: {})", 
                                        trimmedValue, displayName, 
                                        displayName.equals(trimmedValue),
                                        displayName.equalsIgnoreCase(trimmedValue));
                                    
                                    if (displayName.equalsIgnoreCase(trimmedValue) || displayName.equals(trimmedValue)) {
                                        logger.info("Found status enum '{}' (displayName: '{}') for value '{}'", statusEnum, displayName, trimmedValue);
                                        return statusEnum;
                                    }
                                }
                                logger.warn("Status value '{}' not found by displayName. Checking enum name...", trimmedValue);
                                // Если не найдено по displayName, пробуем по имени enum
                                try {
                                    String enumName = trimmedValue.toUpperCase().replace(" ", "_").replace("НЕ_", "NOT_").replace("ЗАЯВКА", "REQUEST");
                                    com.uzproc.backend.entity.PurchasePlanItemStatus foundEnum = com.uzproc.backend.entity.PurchasePlanItemStatus.valueOf(enumName);
                                    logger.info("Found status enum '{}' by name '{}' for value '{}'", foundEnum, enumName, trimmedValue);
                                    return foundEnum;
                                } catch (IllegalArgumentException e) {
                                    logger.warn("Status value '{}' not found in enum. Available statuses: {}", 
                                        trimmedValue,
                                        java.util.Arrays.stream(com.uzproc.backend.entity.PurchasePlanItemStatus.values())
                                            .map(com.uzproc.backend.entity.PurchasePlanItemStatus::getDisplayName)
                                            .collect(java.util.stream.Collectors.toList()));
                                    return null;
                                }
                            })
                            .filter(java.util.Objects::nonNull)
                            .toList();
                        
                        logger.info("Status filter processing - includeNull: {}, statusEnums size: {}, statusEnums: {}, validStatusValues: {}", 
                            includeNull, statusEnums.size(), statusEnums, validStatusValues);
                        
                        // Если выбраны только null значения
                        if (includeNull && statusEnums.isEmpty()) {
                            predicates.add(cb.isNull(root.get("status")));
                            predicateCount++;
                            logger.info("Added null status filter (only null values selected)");
                        } 
                        // Если выбраны только конкретные статусы (без null)
                        else if (!includeNull && !statusEnums.isEmpty()) {
                            if (statusEnums.size() == 1) {
                                predicates.add(cb.equal(root.get("status"), statusEnums.get(0)));
                                logger.info("Added single status filter: '{}' (enum: {})", statusEnums.get(0).getDisplayName(), statusEnums.get(0));
                            } else {
                                predicates.add(root.get("status").in(statusEnums));
                                logger.info("Added multiple status filter: {} (enums: {})", 
                                    statusEnums.stream().map(s -> s.getDisplayName()).collect(java.util.stream.Collectors.toList()),
                                    statusEnums);
                            }
                            predicateCount++;
                        }
                        // Если выбраны и конкретные статусы, и null
                        else if (includeNull && !statusEnums.isEmpty()) {
                            if (statusEnums.size() == 1) {
                                predicates.add(cb.or(
                                    cb.equal(root.get("status"), statusEnums.get(0)),
                                    cb.isNull(root.get("status"))
                                ));
                                logger.info("Added single status filter with null: '{}' (enum: {})", statusEnums.get(0).getDisplayName(), statusEnums.get(0));
                            } else {
                                predicates.add(cb.or(
                                    root.get("status").in(statusEnums),
                                    cb.isNull(root.get("status"))
                                ));
                                logger.info("Added multiple status filter with null: {} (enums: {})", 
                                    statusEnums.stream().map(s -> s.getDisplayName()).collect(java.util.stream.Collectors.toList()),
                                    statusEnums);
                            }
                            predicateCount++;
                        } else {
                            logger.warn("Status filter not applied - includeNull: {}, statusEnums size: {}", includeNull, statusEnums.size());
                        }
                    } catch (Exception e) {
                        logger.warn("Error processing status filter: {}", e.getMessage());
                    }
                }
            }
            
            // Фильтр по номеру заявки на закупку
            if (purchaseRequestId != null && !purchaseRequestId.trim().isEmpty()) {
                try {
                    Long purchaseRequestIdLong = Long.parseLong(purchaseRequestId.trim());
                    predicates.add(cb.equal(root.get("purchaseRequestId"), purchaseRequestIdLong));
                    predicateCount++;
                    logger.info("Added purchaseRequestId filter: {}", purchaseRequestIdLong);
                } catch (NumberFormatException e) {
                    logger.warn("Invalid purchaseRequestId filter value: '{}', error: {}", purchaseRequestId, e.getMessage());
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
    public List<Integer> findDistinctYears() {
        return purchasePlanItemRepository.findDistinctYears();
    }

    public Map<String, Object> getMonthlyStats(Integer year, List<String> company) {
        // Загружаем данные с годом планирования = year
        // requestDate может быть в декабре (year - 1) или в year
        Specification<PurchasePlanItem> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (year != null) {
                predicates.add(cb.equal(root.get("year"), year));
            }
            
            // Фильтр по компании (поддержка множественного выбора)
            if (company != null && !company.isEmpty()) {
                List<String> validCompanyValues = company.stream()
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .map(String::trim)
                    .toList();
                
                if (!validCompanyValues.isEmpty()) {
                    // Конвертируем строковые значения в enum
                    List<Company> companyEnums = new ArrayList<>();
                    for (String companyStr : validCompanyValues) {
                        String companyLower = companyStr.toLowerCase();
                        // Пробуем найти соответствующий enum по displayName
                        Company companyEnum = null;
                        for (Company c : Company.values()) {
                            if (c.getDisplayName().toLowerCase().equals(companyLower) || 
                                c.getDisplayName().toLowerCase().contains(companyLower) ||
                                companyLower.contains(c.getDisplayName().toLowerCase())) {
                                companyEnum = c;
                                break;
                            }
                        }
                        // Также пробуем найти по имени enum (UZUM_MARKET, UZUM_TECHNOLOGIES)
                        if (companyEnum == null) {
                            try {
                                companyEnum = Company.valueOf(companyStr.toUpperCase().replace(" ", "_"));
                            } catch (IllegalArgumentException e) {
                                // Игнорируем, если не найден
                            }
                        }
                        if (companyEnum != null) {
                            companyEnums.add(companyEnum);
                        }
                    }
                    
                    if (!companyEnums.isEmpty()) {
                        if (companyEnums.size() == 1) {
                            predicates.add(cb.equal(root.get("company"), companyEnums.get(0)));
                        } else {
                            predicates.add(root.get("company").in(companyEnums));
                        }
                    }
                }
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

