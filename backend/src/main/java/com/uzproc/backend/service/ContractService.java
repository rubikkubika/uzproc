package com.uzproc.backend.service;

import com.uzproc.backend.dto.ContractDto;
import com.uzproc.backend.entity.Contract;
import com.uzproc.backend.repository.ContractRepository;
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
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ContractService {

    private static final Logger logger = LoggerFactory.getLogger(ContractService.class);
    
    private final ContractRepository contractRepository;

    public ContractService(ContractRepository contractRepository) {
        this.contractRepository = contractRepository;
    }

    public Page<ContractDto> findAll(
            int page,
            int size,
            Integer year,
            String sortBy,
            String sortDir,
            String innerId,
            List<String> cfo,
            String name,
            String documentForm,
            String costType,
            String contractType) {
        
        logger.info("=== FILTER REQUEST ===");
        logger.info("Filter parameters - year: {}, innerId: '{}', cfo: {}, name: '{}', documentForm: '{}', costType: '{}', contractType: '{}'",
                year, innerId, cfo, name, documentForm, costType, contractType);
        
        Specification<Contract> spec = buildSpecification(
                year, innerId, cfo, name, documentForm, costType, contractType);
        
        Sort sort = buildSort(sortBy, sortDir);
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<Contract> contracts = contractRepository.findAll(spec, pageable);
        
        logger.info("Query result - Found {} contracts on page {} (size {}), total elements: {}",
                contracts.getContent().size(), page, size, contracts.getTotalElements());
        logger.info("=== END FILTER REQUEST ===\n");
        
        // Конвертируем entity в DTO
        Page<ContractDto> dtoPage = contracts.map(this::toDto);
        
        return dtoPage;
    }

    public ContractDto findById(Long id) {
        Contract contract = contractRepository.findById(id)
                .orElse(null);
        if (contract == null) {
            return null;
        }
        return toDto(contract);
    }

    public ContractDto findByInnerId(String innerId) {
        java.util.Optional<Contract> contract = contractRepository.findByInnerId(innerId);
        if (contract.isPresent()) {
            return toDto(contract.get());
        }
        return null;
    }

    public List<ContractDto> findByParentContractId(Long parentContractId) {
        List<Contract> contracts = contractRepository.findByParentContractId(parentContractId);
        return contracts.stream()
                .map(this::toDto)
                .collect(java.util.stream.Collectors.toList());
    }

    public List<ContractDto> findByPurchaseRequestId(Long purchaseRequestId) {
        List<Contract> contracts = contractRepository.findByPurchaseRequestId(purchaseRequestId);
        return contracts.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Конвертирует Contract entity в ContractDto
     */
    public ContractDto toDto(Contract entity) {
        ContractDto dto = new ContractDto();
        dto.setId(entity.getId());
        dto.setGuid(entity.getGuid());
        dto.setInnerId(entity.getInnerId());
        dto.setContractCreationDate(entity.getContractCreationDate());
        dto.setName(entity.getName());
        dto.setTitle(entity.getTitle());
        dto.setCfo(entity.getCfo() != null ? entity.getCfo().getName() : null);
        dto.setMcc(entity.getMcc());
        dto.setDocumentForm(entity.getDocumentForm());
        dto.setBudgetAmount(entity.getBudgetAmount());
        dto.setCurrency(entity.getCurrency());
        dto.setCostType(entity.getCostType());
        dto.setContractType(entity.getContractType());
        dto.setContractDurationMonths(entity.getContractDurationMonths());
        dto.setStatus(entity.getStatus());
        dto.setState(entity.getState());
        dto.setPurchaseRequestId(entity.getPurchaseRequestId());
        dto.setParentContractId(entity.getParentContractId());
        
        // Загружаем основной договор, если есть parentContractId
        if (entity.getParentContractId() != null) {
            // Пробуем получить из LAZY связи, если доступно
            if (entity.getParentContract() != null) {
                dto.setParentContract(toDto(entity.getParentContract()));
            } else {
                // Если LAZY не загружен, загружаем по ID
                contractRepository.findById(entity.getParentContractId())
                    .ifPresent(parentContract -> dto.setParentContract(toDto(parentContract)));
            }
        }
        
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    private Specification<Contract> buildSpecification(
            Integer year,
            String innerId,
            List<String> cfo,
            String name,
            String documentForm,
            String costType,
            String contractType) {
        
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            int predicateCount = 0;
            
            // Фильтр по году
            if (year != null) {
                java.time.LocalDateTime startOfYear = java.time.LocalDateTime.of(year, 1, 1, 0, 0);
                java.time.LocalDateTime endOfYear = java.time.LocalDateTime.of(year, 12, 31, 23, 59, 59);
                predicates.add(cb.between(root.get("contractCreationDate"), startOfYear, endOfYear));
                predicateCount++;
                logger.info("Added year filter: {}", year);
            }
            
            // Фильтр по внутреннему номеру (частичное совпадение, case-insensitive)
            if (innerId != null && !innerId.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("innerId")), "%" + innerId.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added innerId filter: '{}'", innerId);
            }
            
            // Фильтр по ЦФО (поддержка множественного выбора - точное совпадение)
            if (cfo != null && !cfo.isEmpty()) {
                List<String> validCfoValues = cfo.stream()
                    .filter(s -> s != null && !s.trim().isEmpty())
                    .map(String::trim)
                    .toList();
                
                if (!validCfoValues.isEmpty()) {
                    // Делаем join к связанной сущности Cfo и фильтруем по name
                    jakarta.persistence.criteria.Join<Contract, com.uzproc.backend.entity.Cfo> cfoJoin = root.join("cfo", jakarta.persistence.criteria.JoinType.LEFT);
                    predicates.add(cb.lower(cfoJoin.get("name")).in(
                        validCfoValues.stream().map(String::toLowerCase).toList()
                    ));
                    predicateCount++;
                    logger.info("Added cfo filter: {}", validCfoValues);
                }
            }
            
            // Фильтр по наименованию (частичное совпадение, case-insensitive)
            if (name != null && !name.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("name")), "%" + name.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added name filter: '{}'", name);
            }
            
            // Фильтр по форме документа (частичное совпадение, case-insensitive)
            if (documentForm != null && !documentForm.trim().isEmpty()) {
                predicates.add(cb.like(cb.lower(root.get("documentForm")), "%" + documentForm.toLowerCase() + "%"));
                predicateCount++;
                logger.info("Added documentForm filter: '{}'", documentForm);
            }
            
            // Фильтр по типу затрат
            if (costType != null && !costType.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("costType"), costType.trim()));
                predicateCount++;
                logger.info("Added costType filter: '{}'", costType);
            }
            
            // Фильтр по типу договора
            if (contractType != null && !contractType.trim().isEmpty()) {
                predicates.add(cb.equal(root.get("contractType"), contractType.trim()));
                predicateCount++;
                logger.info("Added contractType filter: '{}'", contractType);
            }
            
            logger.info("Total predicates: {}", predicateCount);
            return predicates.isEmpty() ? cb.conjunction() : cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private Sort buildSort(String sortBy, String sortDir) {
        if (sortBy == null || sortBy.trim().isEmpty()) {
            return Sort.by(Sort.Direction.DESC, "contractCreationDate");
        }
        
        Sort.Direction direction = "asc".equalsIgnoreCase(sortDir) 
            ? Sort.Direction.ASC 
            : Sort.Direction.DESC;
        
        return Sort.by(direction, sortBy);
    }
}

