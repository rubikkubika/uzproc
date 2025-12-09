package com.uzproc.backend.config;

import com.uzproc.backend.service.EntityExcelLoadService;
import com.uzproc.backend.service.ReportExcelLoadService;
import com.uzproc.backend.service.PurchasePlanExcelLoadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;

@Configuration
public class ExcelFileAutoLoader {

    private static final Logger logger = LoggerFactory.getLogger(ExcelFileAutoLoader.class);

    @Bean
    public CommandLineRunner autoLoadExcelFile(EntityExcelLoadService excelLoadService) {
        return args -> {
            try {
                Path alldocumentsPath = null;
                
                // Сначала проверяем путь для Docker контейнера
                Path dockerPath = Paths.get("/app/alldocuments");
                if (Files.exists(dockerPath)) {
                    alldocumentsPath = dockerPath;
                    logger.info("Found alldocuments folder in Docker container: {}", dockerPath);
                } else {
                    // Ищем папку alldocuments относительно корня проекта
                    // Используем системное свойство user.dir, которое указывает на директорию запуска
                    String userDir = System.getProperty("user.dir");
                    Path currentDir = Paths.get(userDir).toAbsolutePath().normalize();
                    Path projectRoot = currentDir;
                    
                    // Если запускаем из backend/, поднимаемся на уровень выше
                    // Используем equalsIgnoreCase для кроссплатформенности (Windows может иметь разный регистр)
                    if (currentDir.getFileName() != null && 
                        "backend".equalsIgnoreCase(currentDir.getFileName().toString())) {
                        projectRoot = currentDir.getParent();
                        logger.info("Detected backend directory, using project root: {}", projectRoot);
                    }
                    
                    // Пробуем основной путь
                    alldocumentsPath = projectRoot.resolve("frontend").resolve("upload").resolve("alldocuments").normalize();
                    
                    // Если не нашли, пробуем альтернативные пути
                    if (!Files.exists(alldocumentsPath)) {
                        // Пробуем относительно текущей директории (если запускаем из backend/)
                        alldocumentsPath = currentDir.resolve("..").resolve("frontend").resolve("upload").resolve("alldocuments").normalize();
                        logger.info("Trying alternative path: {}", alldocumentsPath);
                    }
                    
                    // Если все еще не нашли, пробуем абсолютный путь от корня проекта
                    if (!Files.exists(alldocumentsPath)) {
                        Path altPath = Paths.get("frontend", "upload", "alldocuments").toAbsolutePath().normalize();
                        if (Files.exists(altPath)) {
                            alldocumentsPath = altPath;
                            logger.info("Found alldocuments using absolute path: {}", alldocumentsPath);
                        }
                    }
                }
                
                if (alldocumentsPath == null || !Files.exists(alldocumentsPath)) {
                    logger.info("Alldocuments folder not found. Tried paths: /app/alldocuments, {}, and relative paths. Skipping automatic Excel file processing.", 
                        Paths.get("").toAbsolutePath().resolve("frontend").resolve("upload").resolve("alldocuments"));
                    return;
                }
                
                File alldocumentsDir = alldocumentsPath.toFile();
                if (!alldocumentsDir.isDirectory()) {
                    logger.warn("Path is not a directory: {}", alldocumentsPath);
                    return;
                }
                
                // Ищем все Excel файлы в папке (исключаем временные файлы, начинающиеся с ~$)
                File[] excelFiles = alldocumentsDir.listFiles((dir, name) -> 
                    (name.endsWith(".xls") || name.endsWith(".xlsx")) && !name.startsWith("~$"));
                
                if (excelFiles == null || excelFiles.length == 0) {
                    logger.info("No Excel files found in alldocuments folder: {}", alldocumentsPath);
                    return;
                }
                
                logger.info("Found {} Excel file(s) in alldocuments folder: {}", excelFiles.length, alldocumentsPath);
                logger.info("Starting automatic Excel file processing...");
                
                int totalLoaded = 0;
                for (File excelFile : excelFiles) {
                    try {
                        logger.info("Processing file: {} (size: {} bytes)", excelFile.getName(), excelFile.length());
                        // Используем оптимизированный метод, который открывает файл один раз
                        Map<String, Integer> counts = excelLoadService.loadAllFromExcel(excelFile);
                        int purchaseRequestsCount = counts.getOrDefault("purchaseRequests", 0);
                        int purchasesCount = counts.getOrDefault("purchases", 0);
                        int contractsCount = counts.getOrDefault("contracts", 0);
                        int usersCount = counts.getOrDefault("users", 0);
                        int loadedCount = purchaseRequestsCount + purchasesCount + contractsCount + usersCount;
                        totalLoaded += loadedCount;
                        logger.info("Loaded {} records from {} ({} purchase requests, {} purchases, {} contracts, {} users)", 
                            loadedCount, excelFile.getName(), purchaseRequestsCount, purchasesCount, contractsCount, usersCount);
                    } catch (Exception e) {
                        logger.error("Error processing file {}: {}", excelFile.getName(), e.getMessage(), e);
                    }
                }
                
                logger.info("Automatic Excel file processing completed. Total loaded {} records", totalLoaded);
            } catch (Exception e) {
                logger.error("Error during automatic Excel file processing", e);
            }
        };
    }

    @Bean
    public CommandLineRunner autoLoadReportFile(ReportExcelLoadService reportExcelLoadService) {
        return args -> {
            try {
                Path reportPath = null;
                
                // Сначала проверяем путь для Docker контейнера
                Path dockerPath = Paths.get("/app/report");
                if (Files.exists(dockerPath)) {
                    reportPath = dockerPath;
                    logger.info("Found report folder in Docker container: {}", dockerPath);
                } else {
                    // Ищем папку report относительно корня проекта
                    String userDir = System.getProperty("user.dir");
                    Path currentDir = Paths.get(userDir).toAbsolutePath().normalize();
                    Path projectRoot = currentDir;
                    
                    // Если запускаем из backend/, поднимаемся на уровень выше
                    // Используем equalsIgnoreCase для кроссплатформенности (Windows может иметь разный регистр)
                    if (currentDir.getFileName() != null && 
                        "backend".equalsIgnoreCase(currentDir.getFileName().toString())) {
                        projectRoot = currentDir.getParent();
                        logger.info("Detected backend directory, using project root: {}", projectRoot);
                    }
                    
                    // Пробуем основной путь
                    reportPath = projectRoot.resolve("frontend").resolve("upload").resolve("report").normalize();
                    
                    // Если не нашли, пробуем альтернативные пути
                    if (!Files.exists(reportPath)) {
                        reportPath = currentDir.resolve("..").resolve("frontend").resolve("upload").resolve("report").normalize();
                        logger.info("Trying alternative path: {}", reportPath);
                    }
                    
                    // Если все еще не нашли, пробуем абсолютный путь от корня проекта
                    if (!Files.exists(reportPath)) {
                        Path altPath = Paths.get("frontend", "upload", "report").toAbsolutePath().normalize();
                        if (Files.exists(altPath)) {
                            reportPath = altPath;
                            logger.info("Found report using absolute path: {}", reportPath);
                        }
                    }
                }
                
                if (reportPath == null || !Files.exists(reportPath)) {
                    logger.info("Report folder not found. Tried paths: /app/report, {}, and relative paths. Skipping automatic report file processing.", 
                        Paths.get("").toAbsolutePath().resolve("frontend").resolve("upload").resolve("report"));
                    return;
                }
                
                File reportDir = reportPath.toFile();
                if (!reportDir.isDirectory()) {
                    logger.warn("Path is not a directory: {}", reportPath);
                    return;
                }
                
                // Ищем все Excel файлы в папке (исключаем временные файлы, начинающиеся с ~$)
                File[] excelFiles = reportDir.listFiles((dir, name) -> 
                    (name.endsWith(".xls") || name.endsWith(".xlsx")) && !name.startsWith("~$"));
                
                if (excelFiles == null || excelFiles.length == 0) {
                    logger.info("No Excel files found in report folder: {}", reportPath);
                    return;
                }
                
                logger.info("Found {} Excel file(s) in report folder: {}", excelFiles.length, reportPath);
                logger.info("Starting automatic report file processing...");
                
                int totalLoaded = 0;
                for (File excelFile : excelFiles) {
                    try {
                        logger.info("Processing report file: {}", excelFile.getName());
                        int loadedCount = reportExcelLoadService.loadFromExcel(excelFile);
                        totalLoaded += loadedCount;
                        logger.info("Loaded {} records from report file {}", loadedCount, excelFile.getName());
                    } catch (Exception e) {
                        logger.error("Error processing report file {}: {}", excelFile.getName(), e.getMessage(), e);
                    }
                }
                
                logger.info("Automatic report file processing completed. Total loaded {} records", totalLoaded);
            } catch (Exception e) {
                logger.error("Error during automatic report file processing", e);
            }
        };
    }

    @Bean
    public CommandLineRunner autoLoadPurchasePlanFile(PurchasePlanExcelLoadService purchasePlanExcelLoadService) {
        return args -> {
            try {
                Path planPath = null;
                
                // Сначала проверяем путь для Docker контейнера
                Path dockerPath = Paths.get("/app/plan");
                if (Files.exists(dockerPath)) {
                    planPath = dockerPath;
                    logger.info("Found plan folder in Docker container: {}", dockerPath);
                } else {
                    // Ищем папку plan относительно корня проекта
                    String userDir = System.getProperty("user.dir");
                    Path currentDir = Paths.get(userDir).toAbsolutePath().normalize();
                    Path projectRoot = currentDir;
                    
                    // Если запускаем из backend/, поднимаемся на уровень выше
                    // Используем equalsIgnoreCase для кроссплатформенности (Windows может иметь разный регистр)
                    if (currentDir.getFileName() != null && 
                        "backend".equalsIgnoreCase(currentDir.getFileName().toString())) {
                        projectRoot = currentDir.getParent();
                        logger.info("Detected backend directory, using project root: {}", projectRoot);
                    }
                    
                    // Пробуем основной путь
                    planPath = projectRoot.resolve("frontend").resolve("upload").resolve("plan").normalize();
                    
                    // Если не нашли, пробуем альтернативные пути
                    if (!Files.exists(planPath)) {
                        planPath = currentDir.resolve("..").resolve("frontend").resolve("upload").resolve("plan").normalize();
                        logger.info("Trying alternative path: {}", planPath);
                    }
                    
                    // Если все еще не нашли, пробуем абсолютный путь от корня проекта
                    if (!Files.exists(planPath)) {
                        Path altPath = Paths.get("frontend", "upload", "plan").toAbsolutePath().normalize();
                        if (Files.exists(altPath)) {
                            planPath = altPath;
                            logger.info("Found plan using absolute path: {}", planPath);
                        }
                    }
                }
                
                if (planPath == null || !Files.exists(planPath)) {
                    logger.info("Plan folder not found. Tried paths: /app/plan, {}, and relative paths. Skipping automatic purchase plan file processing.", 
                        Paths.get("").toAbsolutePath().resolve("frontend").resolve("upload").resolve("plan"));
                    return;
                }
                
                File planDir = planPath.toFile();
                if (!planDir.isDirectory()) {
                    logger.warn("Path is not a directory: {}", planPath);
                    return;
                }
                
                // Ищем все Excel файлы в папке (исключаем временные файлы, начинающиеся с ~$)
                File[] excelFiles = planDir.listFiles((dir, name) -> 
                    (name.endsWith(".xls") || name.endsWith(".xlsx")) && !name.startsWith("~$"));
                
                if (excelFiles == null || excelFiles.length == 0) {
                    logger.info("No Excel files found in plan folder: {}", planPath);
                    return;
                }
                
                logger.info("Found {} Excel file(s) in plan folder: {}", excelFiles.length, planPath);
                logger.info("Starting automatic purchase plan file processing...");
                
                int totalLoaded = 0;
                for (File excelFile : excelFiles) {
                    try {
                        logger.info("Processing purchase plan file: {}", excelFile.getName());
                        int loadedCount = purchasePlanExcelLoadService.loadPurchasePlanItemsFromExcel(excelFile);
                        totalLoaded += loadedCount;
                        logger.info("Loaded {} records from purchase plan file {}", loadedCount, excelFile.getName());
                    } catch (Exception e) {
                        logger.error("Error processing purchase plan file {}: {}", excelFile.getName(), e.getMessage(), e);
                    }
                }
                
                logger.info("Automatic purchase plan file processing completed. Total loaded {} records", totalLoaded);
            } catch (Exception e) {
                logger.error("Error during automatic purchase plan file processing", e);
            }
        };
    }
}

