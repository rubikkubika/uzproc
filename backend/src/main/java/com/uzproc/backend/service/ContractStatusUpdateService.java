package com.uzproc.backend.service;

import com.uzproc.backend.entity.Contract;
import com.uzproc.backend.entity.ContractStatus;
import com.uzproc.backend.repository.ContractRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Сервис для обновления статусов договоров
 * Проверяет поле state для определения статуса
 */
@Service
@Transactional(readOnly = false)
public class ContractStatusUpdateService {

    private static final Logger logger = LoggerFactory.getLogger(ContractStatusUpdateService.class);
    
    private final ContractRepository contractRepository;

    public ContractStatusUpdateService(ContractRepository contractRepository) {
        this.contractRepository = contractRepository;
    }

    /**
     * Обновляет статус договора на основе поля state
     * Если state содержит:
     * - "Согласование договора - Этап 1: Согласован, Синхронизация: Исполнен" 
     * - "Согласование - Этап 1: Согласован, Синхронизация: Исполнен"
     * - "Согласование договора - Этап 1: Согласован, Синхронизация: Исполнен, Регистрация договора: Зарегистрирован"
     * - "Согласование договора - Этап 1: Согласован, Согласование договора - Этап 2: Согласован, Синхронизация: Исполнен"
     * - "Согласование договора - Этап 1: Согласован, Согласование договора - Этап 2: Согласован, Синхронизация: Исполнен, Регистрация договора: Зарегистрирован"
     * - "Согласование договора - Этап 1: Согласован" (только этап 1 согласован)
     * - "Регистрация договора: Зарегистрирован"
     * - "Принятие на хранение: Зарегистрирован"
     * то статус устанавливается в "Подписан"
     * 
     * Если state содержит:
     * - "Согласование договора - Этап 1: На согласовании"
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
        
        // Определяем новый статус на основе state
        ContractStatus newStatus = null;
        
        if (state != null && !state.trim().isEmpty()) {
            String stateTrimmed = state.trim();
            
            // Проверяем условия для статуса "Подписан"
            // Точные совпадения (полные строки)
            if (stateTrimmed.equals("Согласование договора - Этап 1: Согласован, Синхронизация: Исполнен") ||
                stateTrimmed.equals("Согласование - Этап 1: Согласован, Синхронизация: Исполнен") ||
                stateTrimmed.equals("Согласование договора - Этап 1: Согласован, Синхронизация: Исполнен, Регистрация договора: Зарегистрирован") ||
                stateTrimmed.equals("Согласование договора - Этап 1: Согласован, Согласование договора - Этап 2: Согласован, Синхронизация: Исполнен") ||
                stateTrimmed.equals("Согласование договора - Этап 1: Согласован, Согласование договора - Этап 2: Согласован, Синхронизация: Исполнен, Регистрация договора: Зарегистрирован")) {
                newStatus = ContractStatus.SIGNED;
                logger.debug("Contract {} state matches signed condition (exact match): {}", contractId, stateTrimmed);
            }
            // Проверяем подстроки для статуса "Подписан"
            else if (stateTrimmed.contains("Согласование договора - Этап 1: Согласован") ||
                     stateTrimmed.contains("Регистрация договора: Зарегистрирован") ||
                     stateTrimmed.contains("Принятие на хранение: Зарегистрирован")) {
                newStatus = ContractStatus.SIGNED;
                logger.debug("Contract {} state matches signed condition (contains): {}", contractId, stateTrimmed);
            }
            // Проверяем условия для статуса "На согласовании"
            // Приоритет: сначала проверяем "На согласовании", потом "Не согласован"
            else if (stateTrimmed.contains("Согласование договора - Этап 1: На согласовании") ||
                     (stateTrimmed.contains("Синхронизация: Исполнен") && 
                      !stateTrimmed.contains("Согласование договора - Этап 1: Согласован") &&
                      !stateTrimmed.contains("Согласование - Этап 1: Согласован"))) {
                newStatus = ContractStatus.ON_COORDINATION;
                logger.debug("Contract {} state matches on coordination condition: {}", contractId, stateTrimmed);
            }
            // Проверяем условия для статуса "Не согласован"
            else if (stateTrimmed.contains("Не согласован") || stateTrimmed.contains("не согласован")) {
                newStatus = ContractStatus.NOT_COORDINATED;
                logger.debug("Contract {} state matches not coordinated condition: {}", contractId, stateTrimmed);
            }
        }
        
        // Обновляем статус только если он изменился
        if (newStatus != null && currentStatus != newStatus) {
            contract.setStatus(newStatus);
            contractRepository.save(contract);
            logger.info("Status updated for contract {}: {} -> {}", 
                contractId, 
                currentStatus != null ? currentStatus.getDisplayName() : "null",
                newStatus.getDisplayName());
        } else if (newStatus == null) {
            logger.debug("No status change needed for contract {} (state: {})", contractId, state);
        } else {
            logger.debug("Status for contract {} already set to: {}", contractId, newStatus.getDisplayName());
        }
    }

    /**
     * Массовое обновление статусов для всех договоров
     * Используется после парсинга данных для обновления всех статусов
     */
    @Transactional
    public void updateAllStatuses() {
        logger.info("Starting mass status update for all contracts");
        long startTime = System.currentTimeMillis();
        
        // Получаем все договоры
        List<Contract> allContracts = contractRepository.findAll();
        logger.info("Found {} contracts to update", allContracts.size());
        
        int updatedCount = 0;
        int errorCount = 0;
        
        for (Contract contract : allContracts) {
            try {
                ContractStatus oldStatus = contract.getStatus();
                updateStatus(contract.getId());
                
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
     * Обновление статусов для договоров с указанными ID
     * 
     * @param contractIds список ID договоров для обновления
     */
    @Transactional
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

