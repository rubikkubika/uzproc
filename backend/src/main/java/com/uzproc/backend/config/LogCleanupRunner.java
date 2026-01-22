package com.uzproc.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.attribute.FileTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Компонент для очистки старых логов при старте приложения.
 * Хранит не более 2 папок с логами (последние два запуска).
 * Каждая папка содержит все файлы логов одного запуска (основной файл и ротированные версии).
 * Запускается после инициализации logback через @PostConstruct.
 */
@Component
@Order(-1) // Высокий приоритет для ранней инициализации
public class LogCleanupRunner {

    private static final Logger logger = LoggerFactory.getLogger(LogCleanupRunner.class);
    private static final String LOG_DIR = "logs";
    private static final String LOG_FOLDER_PREFIX = "backend-";
    private static final int MAX_LOG_FOLDERS = 2;

    @PostConstruct
    public void cleanupOldLogs() {
        try {
            Path logDir = Paths.get(LOG_DIR);
            
            // Создаем директорию, если её нет
            if (!Files.exists(logDir)) {
                Files.createDirectories(logDir);
                logger.info("Created logs directory: {}", logDir.toAbsolutePath());
                return;
            }

            // Получаем все папки с префиксом backend- (каждая папка = один запуск)
            File[] logFolders = logDir.toFile().listFiles((dir, name) -> {
                Path folderPath = dir.toPath().resolve(name);
                return Files.isDirectory(folderPath) && name.startsWith(LOG_FOLDER_PREFIX);
            });

            if (logFolders == null || logFolders.length == 0) {
                logger.debug("No log folders found in {}", logDir.toAbsolutePath());
                return;
            }

            // Сортируем папки по времени последней модификации (новые первыми)
            List<File> sortedFolders = Arrays.stream(logFolders)
                .sorted(Comparator.comparing((File f) -> {
                    try {
                        return Files.getLastModifiedTime(f.toPath());
                    } catch (Exception e) {
                        return FileTime.fromMillis(0);
                    }
                }).reversed())
                .collect(Collectors.toList());

            // Удаляем старые папки, оставляя только MAX_LOG_FOLDERS последних
            if (sortedFolders.size() > MAX_LOG_FOLDERS) {
                List<File> foldersToDelete = sortedFolders.subList(MAX_LOG_FOLDERS, sortedFolders.size());
                int deletedFoldersCount = 0;
                int deletedFilesCount = 0;
                long totalSizeDeleted = 0;
                
                for (File folder : foldersToDelete) {
                    try {
                        // Подсчитываем файлы и размер перед удалением
                        File[] filesInFolder = folder.listFiles();
                        if (filesInFolder != null) {
                            for (File file : filesInFolder) {
                                if (file.isFile()) {
                                    totalSizeDeleted += file.length();
                                    deletedFilesCount++;
                                }
                            }
                        }
                        
                        // Удаляем папку со всем содержимым
                        if (deleteDirectory(folder)) {
                            deletedFoldersCount++;
                            logger.debug("Deleted old log folder: {}", folder.getName());
                        } else {
                            logger.warn("Failed to delete log folder: {}", folder.getName());
                        }
                    } catch (Exception e) {
                        logger.error("Error deleting log folder {}: {}", folder.getName(), e.getMessage());
                    }
                }
                
                if (deletedFoldersCount > 0) {
                    String sizeStr = totalSizeDeleted > 1024 * 1024 
                        ? String.format("%.2f MB", totalSizeDeleted / (1024.0 * 1024.0))
                        : String.format("%.2f KB", totalSizeDeleted / 1024.0);
                    logger.info("Cleaned up {} old log folder(s) with {} file(s), freed {} space, keeping {} most recent folders", 
                        deletedFoldersCount, deletedFilesCount, sizeStr, MAX_LOG_FOLDERS);
                }
            } else {
                logger.debug("Log folders count ({}) is within limit ({}), no cleanup needed", 
                    sortedFolders.size(), MAX_LOG_FOLDERS);
            }

        } catch (Exception e) {
            logger.error("Error during log cleanup", e);
            // Не прерываем запуск приложения из-за ошибки очистки логов
        }
    }
    
    /**
     * Рекурсивно удаляет директорию со всем содержимым
     */
    private boolean deleteDirectory(File directory) {
        if (!directory.exists()) {
            return true;
        }
        
        if (directory.isDirectory()) {
            File[] files = directory.listFiles();
            if (files != null) {
                for (File file : files) {
                    if (file.isDirectory()) {
                        deleteDirectory(file);
                    } else {
                        file.delete();
                    }
                }
            }
        }
        
        return directory.delete();
    }
}
