package com.uzproc.backend.config;

import com.uzproc.backend.service.ExcelLoadService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.File;

@Configuration
public class ExcelFileAutoLoader {

    private static final Logger logger = LoggerFactory.getLogger(ExcelFileAutoLoader.class);
    private static final String EXCEL_FILE_PATH = "/Users/a.retsko/Documents/uzproc/uzproc/frontend/upload/1.xlsx";

    @Bean
    public CommandLineRunner autoLoadExcelFile(ExcelLoadService excelLoadService) {
        return args -> {
            try {
                File excelFile = new File(EXCEL_FILE_PATH);
                
                if (excelFile.exists() && excelFile.isFile()) {
                    logger.info("Found Excel file at: {}", EXCEL_FILE_PATH);
                    logger.info("Starting automatic Excel file processing...");
                    
                    int loadedCount = excelLoadService.loadPurchaseRequestsFromExcel(excelFile);
                    
                    logger.info("Automatic Excel file processing completed. Loaded {} records", loadedCount);
                } else {
                    logger.info("Excel file not found at: {}. Skipping automatic processing.", EXCEL_FILE_PATH);
                }
            } catch (Exception e) {
                logger.error("Error during automatic Excel file processing", e);
            }
        };
    }
}

