package com.uzproc.backend.service.excel;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
public class FileProcessingStatsService {

    private static final Logger logger = LoggerFactory.getLogger(FileProcessingStatsService.class);
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    private LocalDateTime startTime;
    private List<FileProcessingRecord> processedFiles;
    private List<MethodProcessingRecord> methodRecords;
    private Map<String, LocalDateTime> methodStartTimes;

    @PostConstruct
    public void init() {
        startTime = LocalDateTime.now();
        processedFiles = new ArrayList<>();
        methodRecords = new ArrayList<>();
        methodStartTimes = new ConcurrentHashMap<>();
        logger.info("File processing stats service initialized");
    }

    @PreDestroy
    public void cleanup() {
        try {
            // Завершаем все незавершенные методы
            for (Map.Entry<String, LocalDateTime> entry : methodStartTimes.entrySet()) {
                String key = entry.getKey();
                // Формат ключа: "methodName:fileName"
                int colonIndex = key.indexOf(':');
                if (colonIndex > 0) {
                    String methodName = key.substring(0, colonIndex);
                    String fileName = key.substring(colonIndex + 1);
                    endMethod(methodName, fileName);
                }
            }
            logSummary();
        } catch (Exception e) {
            logger.error("Error writing final stats", e);
        }
    }
    
    /**
     * Начинает отслеживание выполнения метода обработки
     * @param methodName название метода (например, "loadPurchaseRequestsFromExcel")
     * @param fileName имя файла, который обрабатывается
     */
    public void startMethod(String methodName, String fileName) {
        String key = methodName + ":" + fileName;
        methodStartTimes.put(key, LocalDateTime.now());
        logger.debug("Started tracking method: {} for file: {}", methodName, fileName);
    }
    
    /**
     * Завершает отслеживание выполнения метода обработки
     * @param methodName название метода
     * @param fileName имя файла
     */
    public void endMethod(String methodName, String fileName) {
        String key = methodName + ":" + fileName;
        LocalDateTime startTime = methodStartTimes.remove(key);
        if (startTime != null) {
            LocalDateTime endTime = LocalDateTime.now();
            long durationMs = java.time.Duration.between(startTime, endTime).toMillis();
            MethodProcessingRecord record = new MethodProcessingRecord(
                methodName, fileName, startTime, endTime, durationMs
            );
            methodRecords.add(record);
            logger.debug("Ended tracking method: {} for file: {}, duration: {} ms", 
                methodName, fileName, durationMs);
        } else {
            logger.warn("Method {} for file {} was not started or already ended", methodName, fileName);
        }
    }


    public void recordFileProcessing(String fileName, long processingTimeMs, 
                                    int purchaseRequestsCreated, int purchaseRequestsUpdated,
                                    int purchasesCreated, int purchasesUpdated,
                                    int contractsCreated, int contractsUpdated,
                                    int usersCreated, int usersUpdated,
                                    int purchasePlanItemsCreated, int purchasePlanItemsUpdated) {
        FileProcessingRecord record = new FileProcessingRecord(
            fileName, processingTimeMs,
            purchaseRequestsCreated, purchaseRequestsUpdated,
            purchasesCreated, purchasesUpdated,
            contractsCreated, contractsUpdated,
            usersCreated, usersUpdated,
            purchasePlanItemsCreated, purchasePlanItemsUpdated
        );
        processedFiles.add(record);
        
        // Логируем информацию о файле
        logger.info("File processed: {} in {}", record.fileName, formatDuration(record.processingTimeMs));
        logger.debug("File stats - PurchaseRequests: created {}, updated {}; Purchases: created {}, updated {}; " +
                    "Contracts: created {}, updated {}; Users: created {}, updated {}; " +
                    "PurchasePlanItems: created {}, updated {}",
                record.purchaseRequestsCreated, record.purchaseRequestsUpdated,
                record.purchasesCreated, record.purchasesUpdated,
                record.contractsCreated, record.contractsUpdated,
                record.usersCreated, record.usersUpdated,
                record.purchasePlanItemsCreated, record.purchasePlanItemsUpdated);
    }

    private void logSummary() {
        LocalDateTime endTime = LocalDateTime.now();
        long totalTimeMs = java.time.Duration.between(startTime, endTime).toMillis();
        
        logger.info("=".repeat(80));
        logger.info("ИТОГОВАЯ СТАТИСТИКА ОБРАБОТКИ ФАЙЛОВ");
        logger.info("Дата начала: {}", startTime.format(DATE_TIME_FORMATTER));
        logger.info("Дата окончания: {}", endTime.format(DATE_TIME_FORMATTER));
        logger.info("Общее время обработки: {}", formatDuration(totalTimeMs));
        logger.info("Обработано файлов: {}", processedFiles.size());
        logger.info("Выполнено методов: {}", methodRecords.size());
        
        // Подсчитываем итоги
        int totalPurchaseRequestsCreated = processedFiles.stream()
            .mapToInt(r -> r.purchaseRequestsCreated).sum();
        int totalPurchaseRequestsUpdated = processedFiles.stream()
            .mapToInt(r -> r.purchaseRequestsUpdated).sum();
        int totalPurchasesCreated = processedFiles.stream()
            .mapToInt(r -> r.purchasesCreated).sum();
        int totalPurchasesUpdated = processedFiles.stream()
            .mapToInt(r -> r.purchasesUpdated).sum();
        int totalContractsCreated = processedFiles.stream()
            .mapToInt(r -> r.contractsCreated).sum();
        int totalContractsUpdated = processedFiles.stream()
            .mapToInt(r -> r.contractsUpdated).sum();
        int totalUsersCreated = processedFiles.stream()
            .mapToInt(r -> r.usersCreated).sum();
        int totalUsersUpdated = processedFiles.stream()
            .mapToInt(r -> r.usersUpdated).sum();
        int totalPurchasePlanItemsCreated = processedFiles.stream()
            .mapToInt(r -> r.purchasePlanItemsCreated).sum();
        int totalPurchasePlanItemsUpdated = processedFiles.stream()
            .mapToInt(r -> r.purchasePlanItemsUpdated).sum();
        
        logger.info("ИТОГО:");
        logger.info("Заявки на закупку: создано {}, обновлено {}", 
            totalPurchaseRequestsCreated, totalPurchaseRequestsUpdated);
        logger.info("Закупки: создано {}, обновлено {}", 
            totalPurchasesCreated, totalPurchasesUpdated);
        logger.info("Договоры: создано {}, обновлено {}", 
            totalContractsCreated, totalContractsUpdated);
        logger.info("Пользователи: создано {}, обновлено {}", 
            totalUsersCreated, totalUsersUpdated);
        if (totalPurchasePlanItemsCreated > 0 || totalPurchasePlanItemsUpdated > 0) {
            logger.info("Позиции плана закупок: создано {}, обновлено {}", 
                totalPurchasePlanItemsCreated, totalPurchasePlanItemsUpdated);
        }
        
        // Логируем детальную статистику по методам
        if (!methodRecords.isEmpty()) {
            logger.info("ДЕТАЛЬНАЯ СТАТИСТИКА ПО МЕТОДАМ ОБРАБОТКИ:");
            methodRecords.sort((a, b) -> a.startTime.compareTo(b.startTime));
            for (MethodProcessingRecord record : methodRecords) {
                double minutes = record.durationMs / 60000.0;
                logger.info("  {} ({}): {} - {}, время: {} мин", 
                    record.methodName, record.fileName,
                    record.startTime.format(DATE_TIME_FORMATTER),
                    record.endTime.format(DATE_TIME_FORMATTER),
                    String.format("%.2f", minutes));
            }
        }
        
        logger.info("Обработанные файлы:");
        for (FileProcessingRecord record : processedFiles) {
            logger.info("  - {} ({})", record.fileName, formatDuration(record.processingTimeMs));
        }
        logger.info("=".repeat(80));
    }

    private String formatDuration(long milliseconds) {
        long seconds = TimeUnit.MILLISECONDS.toSeconds(milliseconds);
        long minutes = TimeUnit.MILLISECONDS.toMinutes(milliseconds);
        long hours = TimeUnit.MILLISECONDS.toHours(milliseconds);
        
        if (hours > 0) {
            return String.format("%d ч %d мин %d сек", hours, 
                minutes % 60, seconds % 60);
        } else if (minutes > 0) {
            return String.format("%d мин %d сек", minutes, seconds % 60);
        } else if (seconds > 0) {
            return String.format("%d сек", seconds);
        } else {
            return String.format("%d мс", milliseconds);
        }
    }

    private static class FileProcessingRecord {
        final String fileName;
        final long processingTimeMs;
        final int purchaseRequestsCreated;
        final int purchaseRequestsUpdated;
        final int purchasesCreated;
        final int purchasesUpdated;
        final int contractsCreated;
        final int contractsUpdated;
        final int usersCreated;
        final int usersUpdated;
        final int purchasePlanItemsCreated;
        final int purchasePlanItemsUpdated;

        FileProcessingRecord(String fileName, long processingTimeMs,
                           int purchaseRequestsCreated, int purchaseRequestsUpdated,
                           int purchasesCreated, int purchasesUpdated,
                           int contractsCreated, int contractsUpdated,
                           int usersCreated, int usersUpdated,
                           int purchasePlanItemsCreated, int purchasePlanItemsUpdated) {
            this.fileName = fileName;
            this.processingTimeMs = processingTimeMs;
            this.purchaseRequestsCreated = purchaseRequestsCreated;
            this.purchaseRequestsUpdated = purchaseRequestsUpdated;
            this.purchasesCreated = purchasesCreated;
            this.purchasesUpdated = purchasesUpdated;
            this.contractsCreated = contractsCreated;
            this.contractsUpdated = contractsUpdated;
            this.usersCreated = usersCreated;
            this.usersUpdated = usersUpdated;
            this.purchasePlanItemsCreated = purchasePlanItemsCreated;
            this.purchasePlanItemsUpdated = purchasePlanItemsUpdated;
        }
    }
    
    private static class MethodProcessingRecord {
        final String methodName;
        final String fileName;
        final LocalDateTime startTime;
        final LocalDateTime endTime;
        final long durationMs;

        MethodProcessingRecord(String methodName, String fileName, 
                              LocalDateTime startTime, LocalDateTime endTime, 
                              long durationMs) {
            this.methodName = methodName;
            this.fileName = fileName;
            this.startTime = startTime;
            this.endTime = endTime;
            this.durationMs = durationMs;
        }
    }
}

