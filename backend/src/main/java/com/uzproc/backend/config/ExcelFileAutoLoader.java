package com.uzproc.backend.config;

import com.uzproc.backend.service.ExcelLoadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class ExcelFileAutoLoader {

    private static final Logger logger = LoggerFactory.getLogger(ExcelFileAutoLoader.class);

    @Bean
    public CommandLineRunner autoLoadExcelFile(ExcelLoadService excelLoadService) {
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
                    Path projectRoot = Paths.get("").toAbsolutePath();
                    alldocumentsPath = projectRoot.resolve("frontend").resolve("upload").resolve("alldocuments");
                    
                    // Если не нашли, пробуем альтернативные пути
                    if (!Files.exists(alldocumentsPath)) {
                        // Пробуем относительно текущей директории (если запускаем из backend/)
                        alldocumentsPath = projectRoot.resolve("..").resolve("frontend").resolve("upload").resolve("alldocuments").normalize();
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
                
                // Ищем все Excel файлы в папке
                File[] excelFiles = alldocumentsDir.listFiles((dir, name) -> 
                    name.endsWith(".xls") || name.endsWith(".xlsx"));
                
                if (excelFiles == null || excelFiles.length == 0) {
                    logger.info("No Excel files found in alldocuments folder: {}", alldocumentsPath);
                    return;
                }
                
                logger.info("Found {} Excel file(s) in alldocuments folder: {}", excelFiles.length, alldocumentsPath);
                logger.info("Starting automatic Excel file processing...");
                
                int totalLoaded = 0;
                for (File excelFile : excelFiles) {
                    try {
                        logger.info("Processing file: {}", excelFile.getName());
                        int loadedCount = excelLoadService.loadPurchaseRequestsFromExcel(excelFile);
                        totalLoaded += loadedCount;
                        logger.info("Loaded {} records from {}", loadedCount, excelFile.getName());
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
}

