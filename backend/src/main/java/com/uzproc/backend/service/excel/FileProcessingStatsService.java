package com.uzproc.backend.service.excel;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.FileWriter;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
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
    private static final String STATS_FILE_NAME = "file-processing-stats.log";
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    
    private LocalDateTime startTime;
    private List<FileProcessingRecord> processedFiles;
    private List<MethodProcessingRecord> methodRecords;
    private Map<String, LocalDateTime> methodStartTimes;
    private Path statsFilePath;

    @PostConstruct
    public void init() {
        try {
            // Определяем путь к файлу статистики в папке logs
            String userDir = System.getProperty("user.dir");
            Path currentDir = Paths.get(userDir).toAbsolutePath().normalize();
            
            // Если запускаем из backend/, используем текущую директорию
            // Иначе ищем папку backend/logs
            if (currentDir.getFileName() != null && 
                "backend".equalsIgnoreCase(currentDir.getFileName().toString())) {
                statsFilePath = currentDir.resolve("logs").resolve(STATS_FILE_NAME);
            } else {
                statsFilePath = currentDir.resolve("backend").resolve("logs").resolve(STATS_FILE_NAME);
            }
            
            // Создаем папку logs, если её нет
            Files.createDirectories(statsFilePath.getParent());
            
            // Перезаписываем файл при запуске
            startTime = LocalDateTime.now();
            processedFiles = new ArrayList<>();
            methodRecords = new ArrayList<>();
            methodStartTimes = new ConcurrentHashMap<>();
            
            // Записываем заголовок
            writeHeader();
            
            logger.info("File processing stats service initialized. Stats file: {}", statsFilePath);
        } catch (Exception e) {
            logger.error("Error initializing file processing stats service", e);
        }
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
            writeSummary();
            logger.info("File processing stats written to: {}", statsFilePath);
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

    private void writeHeader() {
        try (FileWriter writer = new FileWriter(statsFilePath.toFile(), false)) {
            writer.write("=".repeat(80) + "\n");
            writer.write("СТАТИСТИКА ОБРАБОТКИ ФАЙЛОВ\n");
            writer.write("=".repeat(80) + "\n");
            writer.write("Дата начала запуска: " + startTime.format(DATE_TIME_FORMATTER) + "\n");
            writer.write("=".repeat(80) + "\n\n");
        } catch (IOException e) {
            logger.error("Error writing stats header", e);
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
        
        // Записываем информацию о файле сразу
        writeFileRecord(record);
    }

    private void writeFileRecord(FileProcessingRecord record) {
        try (FileWriter writer = new FileWriter(statsFilePath.toFile(), true)) {
            writer.write("-".repeat(80) + "\n");
            writer.write("Файл: " + record.fileName + "\n");
            writer.write("Время обработки: " + formatDuration(record.processingTimeMs) + "\n");
            writer.write("\n");
            
            writer.write("Заявки на закупку:\n");
            writer.write("  Создано: " + record.purchaseRequestsCreated + "\n");
            writer.write("  Обновлено: " + record.purchaseRequestsUpdated + "\n");
            writer.write("\n");
            
            writer.write("Закупки:\n");
            writer.write("  Создано: " + record.purchasesCreated + "\n");
            writer.write("  Обновлено: " + record.purchasesUpdated + "\n");
            writer.write("\n");
            
            writer.write("Договоры:\n");
            writer.write("  Создано: " + record.contractsCreated + "\n");
            writer.write("  Обновлено: " + record.contractsUpdated + "\n");
            writer.write("\n");
            
            writer.write("Пользователи:\n");
            writer.write("  Создано: " + record.usersCreated + "\n");
            writer.write("  Обновлено: " + record.usersUpdated + "\n");
            writer.write("\n");
            
            if (record.purchasePlanItemsCreated > 0 || record.purchasePlanItemsUpdated > 0) {
                writer.write("Позиции плана закупок:\n");
                writer.write("  Создано: " + record.purchasePlanItemsCreated + "\n");
                writer.write("  Обновлено: " + record.purchasePlanItemsUpdated + "\n");
                writer.write("\n");
            }
            
            writer.write("-".repeat(80) + "\n\n");
        } catch (IOException e) {
            logger.error("Error writing file record to stats", e);
        }
    }

    private void writeSummary() {
        try (FileWriter writer = new FileWriter(statsFilePath.toFile(), true)) {
            LocalDateTime endTime = LocalDateTime.now();
            long totalTimeMs = java.time.Duration.between(startTime, endTime).toMillis();
            
            writer.write("=".repeat(120) + "\n");
            writer.write("ИТОГОВАЯ СТАТИСТИКА\n");
            writer.write("=".repeat(120) + "\n");
            writer.write("Дата начала: " + startTime.format(DATE_TIME_FORMATTER) + "\n");
            writer.write("Дата окончания: " + endTime.format(DATE_TIME_FORMATTER) + "\n");
            writer.write("Общее время обработки: " + formatDuration(totalTimeMs) + "\n");
            writer.write("Обработано файлов: " + processedFiles.size() + "\n");
            writer.write("Выполнено методов: " + methodRecords.size() + "\n");
            writer.write("\n");
            
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
            
            writer.write("ИТОГО:\n");
            writer.write("Заявки на закупку: создано " + totalPurchaseRequestsCreated + 
                        ", обновлено " + totalPurchaseRequestsUpdated + "\n");
            writer.write("Закупки: создано " + totalPurchasesCreated + 
                        ", обновлено " + totalPurchasesUpdated + "\n");
            writer.write("Договоры: создано " + totalContractsCreated + 
                        ", обновлено " + totalContractsUpdated + "\n");
            writer.write("Пользователи: создано " + totalUsersCreated + 
                        ", обновлено " + totalUsersUpdated + "\n");
            if (totalPurchasePlanItemsCreated > 0 || totalPurchasePlanItemsUpdated > 0) {
                writer.write("Позиции плана закупок: создано " + totalPurchasePlanItemsCreated + 
                            ", обновлено " + totalPurchasePlanItemsUpdated + "\n");
            }
            writer.write("\n");
            
            // Выводим таблицу методов обработки
            writeMethodTable(writer);
            
            writer.write("\n");
            writer.write("Обработанные файлы:\n");
            for (FileProcessingRecord record : processedFiles) {
                writer.write("  - " + record.fileName + " (" + formatDuration(record.processingTimeMs) + ")\n");
            }
            writer.write("\n");
            
            writer.write("=".repeat(120) + "\n");
        } catch (IOException e) {
            logger.error("Error writing summary to stats", e);
        }
    }
    
    private void writeMethodTable(FileWriter writer) throws IOException {
        if (methodRecords.isEmpty()) {
            writer.write("Детальная статистика по методам отсутствует.\n");
            return;
        }
        
        writer.write("=".repeat(120) + "\n");
        writer.write("ДЕТАЛЬНАЯ СТАТИСТИКА ПО МЕТОДАМ ОБРАБОТКИ\n");
        writer.write("=".repeat(120) + "\n");
        
        // Заголовок таблицы
        writer.write(String.format("%-50s | %-30s | %-30s | %-15s\n", 
            "Метод обработки", "Дата старта", "Дата стоп", "Время (мин)"));
        writer.write("-".repeat(120) + "\n");
        
        // Сортируем по дате старта
        methodRecords.sort((a, b) -> a.startTime.compareTo(b.startTime));
        
        // Выводим строки таблицы
        for (MethodProcessingRecord record : methodRecords) {
            String methodName = record.methodName.length() > 48 ? 
                record.methodName.substring(0, 45) + "..." : record.methodName;
            String fileName = record.fileName.length() > 28 ? 
                record.fileName.substring(0, 25) + "..." : record.fileName;
            String fullMethodName = methodName + " (" + fileName + ")";
            
            if (fullMethodName.length() > 50) {
                fullMethodName = fullMethodName.substring(0, 47) + "...";
            }
            
            String startTimeStr = record.startTime.format(DATE_TIME_FORMATTER);
            String endTimeStr = record.endTime.format(DATE_TIME_FORMATTER);
            double minutes = record.durationMs / 60000.0;
            String durationStr = String.format("%.2f", minutes);
            
            writer.write(String.format("%-50s | %-30s | %-30s | %-15s\n", 
                fullMethodName, startTimeStr, endTimeStr, durationStr));
        }
        
        writer.write("-".repeat(120) + "\n");
        
        // Итоговая строка
        double totalMinutes = methodRecords.stream()
            .mapToLong(r -> r.durationMs)
            .sum() / 60000.0;
        writer.write(String.format("%-50s | %-30s | %-30s | %-15s\n", 
            "ИТОГО", "", "", String.format("%.2f", totalMinutes)));
        writer.write("=".repeat(120) + "\n");
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

