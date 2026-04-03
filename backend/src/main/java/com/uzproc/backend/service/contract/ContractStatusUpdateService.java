package com.uzproc.backend.service.contract;

import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.contract.ContractStatus;
import com.uzproc.backend.repository.contract.ContractRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.List;

/**
 * Сервис для обновления статусов договоров
 * Проверяет поле state для определения статуса
 */
@Service
public class ContractStatusUpdateService {

    private static final Logger logger = LoggerFactory.getLogger(ContractStatusUpdateService.class);
    private static final Set<String> SIGNED_EXACT_STATES = Set.of(
        "Согласование договора - Этап 1: Согласован, Синхронизация: Исполнен",
        "Согласование - Этап 1: Согласован, Синхронизация: Исполнен",
        "Согласование договора: Согласован, Синхронизация: Исполнен",
        "Согласование договора - Этап 1: Согласован, Синхронизация: Исполнен, Регистрация договора: Зарегистрирован",
        "Согласование договора - Этап 1: Согласован, Согласование договора - Этап 2: Согласован, Синхронизация: Исполнен",
        "Согласование договора - Этап 1: Согласован, Согласование договора - Этап 2: Согласован, Синхронизация: Исполнен, Регистрация договора: Зарегистрирован",
        "Регистрация договора: Зарегистрирован",
        "Регистрация: Зарегистрирован",
        "Принятие на хранение: Зарегистрирован",
        "Подписать или вернуть: Подписан",
        "Согласование договора: Согласован, Регистрация: Зарегистрирован, Принятие на хранение: Зарегистрирован",
        "Согласование договора: Согласован, Согласование договора - Этап 2: Согласован, Регистрация: Зарегистрирован, Принятие на хранение: Зарегистрирован"
    );
    private static final Set<String> ON_COORDINATION_EXACT_STATES = Set.of(
        "Согласование договора: На согласовании",
        "Согласование договора - Этап 1: На согласовании",
        "Согласование - Этап 1: На согласовании",
        "Согласование договора: Согласован, Согласование договора - Этап 2: На согласовании",
        "Синхронизация: Исполнен"
    );
    private static final Set<String> NOT_COORDINATED_EXACT_STATES = Set.of(
        "Не согласован",
        "не согласован"
    );
    
    private final ContractRepository contractRepository;

    public ContractStatusUpdateService(ContractRepository contractRepository) {
        this.contractRepository = contractRepository;
    }

    /**
     * Обновляет статус договора на основе поля state
     * Если state содержит:
     * - "Согласование договора - Этап 1: Согласован, Синхронизация: Исполнен"
     * - "Согласование - Этап 1: Согласован, Синхронизация: Исполнен"
     * - "Согласование договора: Согласован, Синхронизация: Исполнен"
     * - "Согласование договора - Этап 1: Согласован, Синхронизация: Исполнен, Регистрация договора: Зарегистрирован"
     * - "Согласование договора - Этап 1: Согласован, Согласование договора - Этап 2: Согласован, Синхронизация: Исполнен"
     * - "Согласование договора - Этап 1: Согласован, Согласование договора - Этап 2: Согласован, Синхронизация: Исполнен, Регистрация договора: Зарегистрирован"
     * - "Согласование договора - Этап 1: Согласован" (только этап 1 согласован)
     * - "Регистрация договора: Зарегистрирован"
     * - "Принятие на хранение: Зарегистрирован"
     * - "Согласование договора: Согласован, Регистрация: Зарегистрирован, Принятие на хранение: Зарегистрирован"
     * - "Согласование договора: Согласован, Согласование договора - Этап 2: Согласован, Регистрация: Зарегистрирован, Принятие на хранение: Зарегистрирован"
     * то статус устанавливается в "Подписан"
     * 
     * Если state содержит "Регистрация: На регистрации" и согласование пройдено
     * (эквивалент этапа 1: "Согласование договора: Согласован" или "Согласование договора - Этап 1: Согласован";
     * этап 2: "Согласование договора - Этап 2: Согласован"),
     * то статус устанавливается в "На регистрации".
     *
     * Если state содержит:
     * - "Согласование договора - Этап 1: На согласовании"
     * - "Согласование договора: Согласован, Согласование договора - Этап 2: На согласовании"
     * - "Синхронизация: Исполнен" (когда нет согласования)
     * то статус устанавливается в "На согласовании"
     * 
     * @param contractId ID договора
     */
    @Transactional
    public void updateStatus(Long contractId) {
        Contract contract = contractRepository.findById(contractId).orElse(null);
        
        if (contract == null) {
            logger.debug("Contract with id {} not found for status update", contractId);
            return;
        }
        
        // Сохраняем текущий статус для сравнения
        ContractStatus currentStatus = contract.getStatus();
        
        // Получаем значение поля state
        String state = contract.getState();
        
        logger.debug("Processing contract {} (innerId: {}): currentStatus={}, state='{}'", 
            contractId, contract.getInnerId(), 
            currentStatus != null ? currentStatus.getDisplayName() : "null", 
            state != null ? state : "null");
        
        // Определяем новый статус на основе state
        ContractStatus newStatus = null;
        
        if (state != null && !state.trim().isEmpty()) {
            String stateTrimmed = state.trim();
            
            // Проверяем условия для статуса "Подписан"
            // Точные совпадения (полные строки)
            if (SIGNED_EXACT_STATES.contains(stateTrimmed)) {
                newStatus = ContractStatus.SIGNED;
                logger.debug("Contract {} state matches signed condition (exact match): {}", contractId, stateTrimmed);
            }
            // Проверяем условия для статуса "На регистрации": согласование пройдено и регистрация в процессе (до проверки "Подписан" по подстрокам)
            // Этап 1: "Согласование договора: Согласован" или "Согласование договора - Этап 1: Согласован"; Этап 2: "Согласование договора - Этап 2: Согласован"
            else if (stateTrimmed.contains("Регистрация: На регистрации") &&
                     (stateTrimmed.contains("Согласование договора: Согласован") ||
                      stateTrimmed.contains("Согласование договора - Этап 1: Согласован") ||
                      stateTrimmed.contains("Согласование - Этап 1: Согласован")) &&
                     (stateTrimmed.contains("Согласование договора - Этап 2: Согласован") ||
                      stateTrimmed.contains("Согласование - Этап 2: Согласован"))) {
                newStatus = ContractStatus.ON_REGISTRATION;
                logger.debug("Contract {} state matches on registration condition: {}", contractId, stateTrimmed);
            }
            // Проверяем условия для статуса "На согласовании"
            // Приоритет: сначала проверяем "На согласовании", потом "Не согласован"
            else if (ON_COORDINATION_EXACT_STATES.contains(stateTrimmed)) {
                newStatus = ContractStatus.ON_COORDINATION;
                logger.debug("Contract {} state matches on coordination condition: {}", contractId, stateTrimmed);
            }
            // Проверяем условия для статуса "Не согласован"
            else if (NOT_COORDINATED_EXACT_STATES.contains(stateTrimmed)) {
                newStatus = ContractStatus.NOT_COORDINATED;
                logger.debug("Contract {} state matches not coordinated condition: {}", contractId, stateTrimmed);
            }
        }
        
        // Обновляем статус только если он изменился
        if (newStatus != null && currentStatus != newStatus) {
            contract.setStatus(newStatus);
            contractRepository.save(contract);
            // Явно синхронизируем изменения с БД
            contractRepository.flush();
            logger.info("Status updated for contract {}: {} -> {}", 
                contractId, 
                currentStatus != null ? currentStatus.getDisplayName() : "null",
                newStatus.getDisplayName());
        } else if (newStatus == null) {
            logger.debug("No status change needed for contract {} (innerId: {}): state='{}' does not match any status condition", 
                contractId, contract.getInnerId(), state != null ? state : "null");
        } else {
            logger.debug("Status for contract {} (innerId: {}) already set to: {} (currentStatus == newStatus)", 
                contractId, contract.getInnerId(), newStatus.getDisplayName());
        }
    }

    /**
     * Массовое обновление статусов для всех договоров
     * Используется после парсинга данных для обновления всех статусов
     * Каждая обработка записи выполняется в отдельной транзакции с явным flush для освобождения соединения
     */
    public void updateAllStatuses() {
        logger.info("Starting mass status update for all contracts");
        long startTime = System.currentTimeMillis();
        
        // Получаем все договоры (read-only транзакция)
        List<Contract> allContracts = contractRepository.findAll();
        logger.info("Found {} contracts to update", allContracts.size());
        
        if (allContracts.isEmpty()) {
            logger.warn("No contracts found in database, skipping status update");
            return;
        }
        
        // Логируем первые несколько договоров для диагностики
        int sampleSize = Math.min(5, allContracts.size());
        logger.debug("Sample of {} contracts to process:", sampleSize);
        for (int i = 0; i < sampleSize; i++) {
            Contract c = allContracts.get(i);
            logger.debug("  Contract {} (id={}, innerId={}): status={}, state='{}'", 
                i + 1, c.getId(), c.getInnerId(), 
                c.getStatus() != null ? c.getStatus().getDisplayName() : "null",
                c.getState() != null ? c.getState() : "null");
        }
        
        int updatedCount = 0;
        int errorCount = 0;
        
        for (Contract contract : allContracts) {
            try {
                ContractStatus oldStatus = contract.getStatus();
                // Каждый вызов updateStatus выполняется в отдельной транзакции
                updateStatusInNewTransaction(contract.getId());
                
                // Проверяем, изменился ли статус
                contract = contractRepository.findById(contract.getId()).orElse(null);
                if (contract != null && contract.getStatus() != oldStatus) {
                    updatedCount++;
                }
            } catch (Exception e) {
                errorCount++;
                logger.error("Error updating status for contract {}: {}", 
                    contract.getId(), e.getMessage(), e);
            }
        }
        
        long processingTime = System.currentTimeMillis() - startTime;
        logger.info("Mass status update completed: {} contracts processed, {} updated, {} errors, time: {} ms", 
            allContracts.size(), updatedCount, errorCount, processingTime);
    }
    
    /**
     * Обновляет статус в новой транзакции (для массовых обновлений)
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    private void updateStatusInNewTransaction(Long contractId) {
        updateStatus(contractId);
    }

    /**
     * Обновление статусов для договоров с указанными ID
     * Каждая обработка записи выполняется в отдельной транзакции
     * 
     * @param contractIds список ID договоров для обновления
     */
    public void updateStatuses(List<Long> contractIds) {
        logger.info("Starting status update for {} contracts", contractIds.size());
        long startTime = System.currentTimeMillis();
        
        int updatedCount = 0;
        int errorCount = 0;
        
        for (Long contractId : contractIds) {
            try {
                updateStatus(contractId);
                updatedCount++;
            } catch (Exception e) {
                errorCount++;
                logger.error("Error updating status for contract {}: {}", 
                    contractId, e.getMessage(), e);
            }
        }
        
        long processingTime = System.currentTimeMillis() - startTime;
        logger.info("Status update completed: {} contracts processed, {} updated, {} errors, time: {} ms", 
            contractIds.size(), updatedCount, errorCount, processingTime);
    }
}

