package com.uzproc.backend.config;

import com.uzproc.backend.service.handreport.HandReportExcelLoadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Авто-загрузка ручного отчёта по договорам из папки upload/handreport при старте приложения.
 * Выполняется после загрузки alldocuments (@Order 0), чтобы договоры/спецификации уже были в БД.
 */
@Configuration
public class HandReportAutoLoader {

    private static final Logger logger = LoggerFactory.getLogger(HandReportAutoLoader.class);

    @Bean
    @Order(150)
    public CommandLineRunner autoLoadHandReport(HandReportExcelLoadService handReportService) {
        return args -> {
            try {
                Path folder = resolveHandReportFolder();
                if (folder == null) {
                    logger.info("HandReport folder not found — skipping handreport processing.");
                    return;
                }
                File[] excelFiles = folder.toFile().listFiles((dir, name) ->
                        (name.endsWith(".xls") || name.endsWith(".xlsx")) && !name.startsWith("~$"));
                if (excelFiles == null || excelFiles.length == 0) {
                    logger.info("No Excel files in handreport folder: {}", folder);
                    return;
                }
                for (File excelFile : excelFiles) {
                    try {
                        logger.info("=== START handreport file: {} ({} bytes) ===", excelFile.getName(), excelFile.length());
                        int processed = handReportService.loadHandReport(excelFile);
                        logger.info("=== END handreport file: {} — processed {} deliveries ===", excelFile.getName(), processed);
                    } catch (Exception e) {
                        logger.error("=== END handreport file: {} — ERROR: {} ===", excelFile.getName(), e.getMessage(), e);
                    }
                }
            } catch (Exception e) {
                logger.error("Error during handreport auto-processing", e);
            }
        };
    }

    /** Находит папку handreport: сначала Docker (/app/handreport), затем относительно корня проекта. */
    private Path resolveHandReportFolder() {
        Path dockerPath = Paths.get("/app/handreport");
        if (Files.exists(dockerPath)) return dockerPath;

        String userDir = System.getProperty("user.dir");
        Path currentDir = Paths.get(userDir).toAbsolutePath().normalize();
        Path projectRoot = currentDir;
        if (currentDir.getFileName() != null && "backend".equalsIgnoreCase(currentDir.getFileName().toString())) {
            projectRoot = currentDir.getParent();
        }
        Path path = projectRoot.resolve("frontend").resolve("upload").resolve("handreport").normalize();
        if (Files.exists(path)) return path;

        path = currentDir.resolve("..").resolve("frontend").resolve("upload").resolve("handreport").normalize();
        if (Files.exists(path)) return path;

        Path alt = Paths.get("frontend", "upload", "handreport").toAbsolutePath().normalize();
        return Files.exists(alt) ? alt : null;
    }
}
