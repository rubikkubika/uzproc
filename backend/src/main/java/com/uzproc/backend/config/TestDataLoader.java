package com.uzproc.backend.config;

import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.entity.User;
import com.uzproc.backend.repository.PurchaseRequestRepository;
import com.uzproc.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.io.BufferedReader;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Configuration
public class TestDataLoader {

    private static final Logger logger = LoggerFactory.getLogger(TestDataLoader.class);
    private static final int TEST_DATA_COUNT = 10;

    @Bean
    public CommandLineRunner loadTestData(
            UserRepository userRepository,
            PurchaseRequestRepository purchaseRequestRepository) {
        return args -> {
            logger.info("Loading test data...");

            // Загрузка тестовых пользователей
            if (userRepository.count() == 0) {
                logger.info("Creating {} test users...", TEST_DATA_COUNT);
                for (int i = 1; i <= TEST_DATA_COUNT; i++) {
                    User user = new User();
                    user.setUsername("user" + i);
                    user.setPassword("password" + i);
                    user.setEmail("user" + i + "@example.com");
                    userRepository.save(user);
                }
                logger.info("Created {} test users", TEST_DATA_COUNT);
            } else {
                logger.info("Users already exist, skipping user creation");
            }

            // Загрузка плановых заявок из CSV
            long plannedCount = purchaseRequestRepository.findAll().stream()
                    .filter(pr -> pr.getIsPlanned() != null && pr.getIsPlanned())
                    .count();
            
            if (plannedCount == 0) {
                logger.info("Loading planned purchase requests from CSV...");
                try {
                    int loadedCount = loadPlannedPurchaseRequestsFromCsv(purchaseRequestRepository);
                    logger.info("Loaded {} planned purchase requests from CSV", loadedCount);
                } catch (Exception e) {
                    logger.error("Error loading CSV file: {}", e.getMessage(), e);
                }
            } else {
                logger.info("Planned purchase requests already exist ({} records), skipping CSV load", plannedCount);
            }

            logger.info("Test data loading completed");
        };
    }

    private int loadPlannedPurchaseRequestsFromCsv(PurchaseRequestRepository repository) throws IOException {
        // Пытаемся найти файл в разных местах
        Path csvPath = null;
        String projectRoot = System.getProperty("user.dir");
        
        // 0. Проверяем в Docker контейнере (приоритет для production через volume mount)
        Path dockerPath = Paths.get("/app/data/purchase-plan.csv");
        if (Files.exists(dockerPath)) {
            csvPath = dockerPath;
        } else {
            // 1. Проверяем в resources/data/ (относительно backend/)
            Path resourcesPath = Paths.get("src/main/resources/data/purchase-plan.csv");
            if (Files.exists(resourcesPath)) {
                csvPath = resourcesPath;
            } else {
                // 2. Проверяем относительно корня проекта (если запускаем из backend/)
                Path frontendPath1 = Paths.get("../frontend/images/Заявка на закупку_план закупок.csv");
                if (Files.exists(frontendPath1)) {
                    csvPath = frontendPath1;
                } else {
                    // 3. Проверяем относительно корня проекта (если запускаем из корня)
                    Path frontendPath2 = Paths.get("frontend/images/Заявка на закупку_план закупок.csv");
                    if (Files.exists(frontendPath2)) {
                        csvPath = frontendPath2;
                    } else {
                        // 4. Проверяем абсолютный путь от корня проекта
                        Path absolutePath = Paths.get(projectRoot, "frontend", "images", "Заявка на закупку_план закупок.csv");
                        if (Files.exists(absolutePath)) {
                            csvPath = absolutePath;
                        } else {
                            // 5. Пытаемся найти файл, поднимаясь на уровень выше (из backend/)
                            Path parentPath = Paths.get(projectRoot).getParent();
                            if (parentPath != null) {
                                Path parentAbsolutePath = Paths.get(parentPath.toString(), "frontend", "images", "Заявка на закупку_план закупок.csv");
                                if (Files.exists(parentAbsolutePath)) {
                                    csvPath = parentAbsolutePath;
                                }
                            }
                            
                            if (csvPath == null) {
                                logger.warn("CSV file not found in any expected location. Current dir: {}", projectRoot);
                                return 0;
                            }
                        }
                    }
                }
            }
        }

        logger.info("Loading CSV from: {}", csvPath.toAbsolutePath());
        logger.info("File exists: {}, size: {} bytes", Files.exists(csvPath), 
                    Files.exists(csvPath) ? Files.size(csvPath) : 0);
        
        List<PurchaseRequest> purchaseRequests = new ArrayList<>();
        
        // Пытаемся определить кодировку файла
        Charset charset = detectCharset(csvPath);
        logger.info("Detected charset: {}", charset.name());
        logger.info("Default charset: {}", Charset.defaultCharset().name());
        logger.info("System file encoding: {}", System.getProperty("file.encoding"));
        
        try (BufferedReader reader = Files.newBufferedReader(csvPath, charset)) {
            String line = reader.readLine(); // Пропускаем заголовок
            
            int lineNumber = 1;
            while ((line = reader.readLine()) != null) {
                lineNumber++;
                if (line.trim().isEmpty()) {
                    continue;
                }
                
                try {
                    String[] parts = parseCsvLine(line);
                    if (parts.length < 10) {
                        logger.warn("Skipping line {}: insufficient columns", lineNumber);
                        continue;
                    }
                    
                    PurchaseRequest pr = new PurchaseRequest();
                    pr.setGuid(UUID.randomUUID());
                    pr.setIsPlanned(true); // Все заявки из CSV - плановые
                    
                    // Год
                    try {
                        pr.setPurchasePlanYear(Integer.parseInt(parts[0].trim()));
                    } catch (NumberFormatException e) {
                        logger.warn("Invalid year on line {}: {}", lineNumber, parts[0]);
                    }
                    
                    // Компания
                    String company = parts[1].trim();
                    pr.setCompany(company);
                    if (lineNumber <= 5) {
                        logger.info("Line {} - Company: [{}] (length: {}, bytes: {})", 
                                  lineNumber, company, company.length(), 
                                  company.getBytes(charset).length);
                    }
                    
                    // ЦФО
                    String cfo = parts[2].trim();
                    pr.setCfo(cfo);
                    if (lineNumber <= 5) {
                        logger.info("Line {} - CFO: [{}] (length: {}, bytes: {})", 
                                  lineNumber, cfo, cfo.length(), 
                                  cfo.getBytes(charset).length);
                    }
                    
                    // MCC
                    pr.setMcc(parts[3].trim());
                    
                    // Инициатор закупки
                    String initiator = parts[4].trim();
                    pr.setPurchaseInitiator(initiator);
                    if (lineNumber <= 5) {
                        logger.info("Line {} - Initiator: [{}] (length: {}, bytes: {})", 
                                  lineNumber, initiator, initiator.length(), 
                                  initiator.getBytes(charset).length);
                    }
                    
                    // Предмет закупки
                    String subject = parts[5].trim();
                    pr.setPurchaseSubject(subject);
                    if (lineNumber <= 5) {
                        logger.info("Line {} - Subject: [{}] (length: {}, bytes: {})", 
                                  lineNumber, subject, subject.length(), 
                                  subject.getBytes(charset).length);
                    }
                    
                    // Бюджет (может содержать запятые как разделители тысяч)
                    try {
                        String budgetStr = parts[6].trim().replaceAll("[\\s,]", "");
                        if (!budgetStr.isEmpty() && !budgetStr.equals("-")) {
                            pr.setBudgetAmount(new BigDecimal(budgetStr));
                        }
                    } catch (NumberFormatException e) {
                        logger.warn("Invalid budget on line {}: {}", lineNumber, parts[6]);
                    }
                    
                    // Тип затрат
                    pr.setCostType(parts[7].trim());
                    
                    // Тип договора
                    pr.setContractType(parts[8].trim());
                    
                    // Срок действия договора (мес.)
                    try {
                        String durationStr = parts[9].trim();
                        if (!durationStr.isEmpty() && !durationStr.equals("-")) {
                            pr.setContractDurationMonths(Integer.parseInt(durationStr));
                        }
                    } catch (NumberFormatException e) {
                        // Игнорируем, если не число
                    }
                    
                    purchaseRequests.add(pr);
                } catch (Exception e) {
                    logger.warn("Error parsing line {}: {}", lineNumber, e.getMessage());
                }
            }
        }
        
        // Сохраняем все записи батчами
        if (!purchaseRequests.isEmpty()) {
            repository.saveAll(purchaseRequests);
        }
        
        return purchaseRequests.size();
    }
    
    private String[] parseCsvLine(String line) {
        List<String> parts = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder current = new StringBuilder();
        
        for (int i = 0; i < line.length(); i++) {
            char c = line.charAt(i);
            
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ';' && !inQuotes) {
                parts.add(current.toString());
                current = new StringBuilder();
            } else {
                current.append(c);
            }
        }
        parts.add(current.toString()); // Последняя часть
        
        return parts.toArray(new String[0]);
    }
    
    /**
     * Определяет кодировку файла, пробуя разные варианты
     */
    private Charset detectCharset(Path filePath) {
        // Список кодировок для проверки (в порядке приоритета)
        Charset[] charsets = {
            StandardCharsets.UTF_8,
            Charset.forName("Windows-1251"),
            Charset.forName("CP1251"),
            Charset.forName("UTF-8"),
            StandardCharsets.ISO_8859_1
        };
        
        // Пытаемся прочитать первые несколько строк с каждой кодировкой
        for (Charset charset : charsets) {
            try (BufferedReader reader = Files.newBufferedReader(filePath, charset)) {
                // Читаем первые 5 строк для проверки
                StringBuilder sample = new StringBuilder();
                for (int i = 0; i < 5; i++) {
                    String line = reader.readLine();
                    if (line == null) break;
                    sample.append(line);
                }
                
                String content = sample.toString();
                // Проверяем, что строка содержит разумные символы кириллицы
                // Если есть кириллица и она читается правильно, это наша кодировка
                if (content.contains("Заявка") || content.contains("закуп") || 
                    content.contains("план") || content.contains("ЦФО") ||
                    content.contains("закуп") || content.matches(".*[А-Яа-яЁё].*")) {
                    logger.info("Detected charset: {} (found Cyrillic text)", charset.name());
                    return charset;
                }
            } catch (IOException e) {
                logger.warn("Error testing charset {}: {}", charset.name(), e.getMessage());
            }
        }
        
        // По умолчанию используем UTF-8
        logger.warn("Could not detect charset, using UTF-8");
        return StandardCharsets.UTF_8;
    }
}

