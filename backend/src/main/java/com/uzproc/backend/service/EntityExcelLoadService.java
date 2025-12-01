package com.uzproc.backend.service;

import com.uzproc.backend.entity.Purchase;
import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.entity.User;
import com.uzproc.backend.repository.PurchaseRepository;
import com.uzproc.backend.repository.PurchaseRequestRepository;
import com.uzproc.backend.repository.UserRepository;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Optional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class EntityExcelLoadService {

    private static final Logger logger = LoggerFactory.getLogger(EntityExcelLoadService.class);
    private static final String DOCUMENT_TYPE_COLUMN = "Вид документа";
    private static final String PURCHASE_REQUEST_TYPE = "Заявка на ЗП";
    private static final String PURCHASE_TYPE = "Закупочная процедура";
    private static final String REQUEST_NUMBER_COLUMN = "Номер заявки на ЗП";
    private static final String PURCHASE_NUMBER_COLUMN = "Номер закупки";
    private static final String CREATION_DATE_COLUMN = "Дата создания";
    private static final String INNER_ID_COLUMN = "Внутренний номер";
    private static final String CFO_COLUMN = "ЦФО";
    private static final String NAME_COLUMN = "Наименование";
    private static final String TITLE_COLUMN = "Заголовок";
    private static final String REQUIRES_PURCHASE_COLUMN = "Требуется Закупка";
    private static final String PLAN_COLUMN = "План (Заявка на ЗП)";
    private static final String PREPARED_BY_COLUMN = "Подготовил";
    private static final String PURCHASER_COLUMN = "Ответственный за ЗП (Закупочная процедура)";
    private static final String LINK_COLUMN = "Ссылка";

    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PurchaseRepository purchaseRepository;
    private final UserRepository userRepository;
    private final DataFormatter dataFormatter = new DataFormatter();

    public EntityExcelLoadService(
            PurchaseRequestRepository purchaseRequestRepository,
            PurchaseRepository purchaseRepository,
            UserRepository userRepository) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.purchaseRepository = purchaseRepository;
        this.userRepository = userRepository;
    }

    /**
     * Загружает данные из Excel файла (заявки, закупки, пользователи)
     * Принимает MultipartFile, валидирует его и вызывает соответствующие методы парсинга
     */
    public Map<String, Object> uploadFromExcel(MultipartFile file) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            // Валидация файла
            validateFile(file);
            
            // Сохраняем файл во временную директорию
            Path tempFile = Files.createTempFile("upload_", file.getOriginalFilename());
            file.transferTo(tempFile.toFile());
            
            try {
                // Загружаем данные из Excel - вызываем отдельные методы для каждой сущности
                int purchaseRequestsCount = loadPurchaseRequestsFromExcel(tempFile.toFile());
                int purchasesCount = loadPurchasesFromExcel(tempFile.toFile());
                int usersCount = loadUsersFromExcel(tempFile.toFile());
                
                int totalCount = purchaseRequestsCount + purchasesCount + usersCount;
                
                response.put("success", true);
                response.put("message", String.format("Успешно загружено: %d заявок, %d закупок, %d пользователей (всего %d записей)", 
                    purchaseRequestsCount, purchasesCount, usersCount, totalCount));
                response.put("loadedCount", totalCount);
                response.put("purchaseRequestsCount", purchaseRequestsCount);
                response.put("purchasesCount", purchasesCount);
                response.put("usersCount", usersCount);
            } finally {
                // Удаляем временный файл
                Files.deleteIfExists(tempFile);
            }
            
            return response;
        } catch (IllegalArgumentException e) {
            logger.error("Validation error uploading Excel file", e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return response;
        } catch (Exception e) {
            logger.error("Error uploading Excel file", e);
            response.put("success", false);
            response.put("message", "Ошибка при загрузке файла: " + e.getMessage());
            return response;
        }
    }

    /**
     * Оптимизированная загрузка всех данных из Excel файла за один проход
     * Открывает файл один раз и обрабатывает все типы строк (заявки, закупки, пользователи)
     */
    public Map<String, Integer> loadAllFromExcel(File excelFile) throws IOException {
        Workbook workbook;
        try (FileInputStream fis = new FileInputStream(excelFile)) {
            if (excelFile.getName().endsWith(".xlsx")) {
                workbook = new XSSFWorkbook(fis);
            } else {
                workbook = new HSSFWorkbook(fis);
            }
        }

        try {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rowIterator = sheet.iterator();
            
            if (!rowIterator.hasNext()) {
                logger.warn("Sheet is empty in file {}", excelFile.getName());
                return Map.of("purchaseRequests", 0, "purchases", 0, "users", 0);
            }

            // Читаем заголовки один раз
            Row headerRow = rowIterator.next();
            Map<String, Integer> columnIndexMap = buildColumnIndexMap(headerRow);
            
            // Находим все нужные колонки один раз
            Integer documentTypeColumnIndex = findColumnIndex(columnIndexMap, DOCUMENT_TYPE_COLUMN);
            
            // Колонки для заявок
            Integer requestNumberColumnIndex = findColumnIndex(columnIndexMap, REQUEST_NUMBER_COLUMN);
            Integer creationDateColumnIndex = findColumnIndex(columnIndexMap, CREATION_DATE_COLUMN);
            Integer innerIdColumnIndex = findColumnIndex(columnIndexMap, INNER_ID_COLUMN);
            Integer cfoColumnIndex = findColumnIndex(columnIndexMap, CFO_COLUMN);
            Integer nameColumnIndex = findColumnIndex(columnIndexMap, NAME_COLUMN);
            Integer titleColumnIndex = findColumnIndex(columnIndexMap, TITLE_COLUMN);
            Integer requiresPurchaseColumnIndex = findColumnIndex(columnIndexMap, REQUIRES_PURCHASE_COLUMN);
            if (requiresPurchaseColumnIndex == null) {
                requiresPurchaseColumnIndex = findColumnIndex(columnIndexMap, "Требуется закупка");
            }
            if (requiresPurchaseColumnIndex == null) {
                requiresPurchaseColumnIndex = findColumnIndex(columnIndexMap, "Не требуется ЗП (Заявка на ЗП)");
            }
            Integer planColumnIndex = findColumnIndex(columnIndexMap, PLAN_COLUMN);
            Integer preparedByColumnIndex = findColumnIndex(columnIndexMap, PREPARED_BY_COLUMN);
            Integer purchaserColumnIndex = findColumnIndex(columnIndexMap, PURCHASER_COLUMN);
            
            // Если не нашли по имени, пробуем найти по известным позициям (из логов видно, что Column 4 = "Номер заявки на ЗП")
            if (requestNumberColumnIndex == null && headerRow.getCell(4) != null) {
                String cell4Value = getCellValueAsString(headerRow.getCell(4));
                logger.info("Checking column 4 (index 4) for request number: '{}'", cell4Value);
                // Проверяем, содержит ли колонка 4 ключевые слова "номер" и "заявки"
                if (cell4Value != null && (cell4Value.toLowerCase().contains("номер") || 
                    cell4Value.toLowerCase().contains("заявки") || 
                    cell4Value.toLowerCase().contains("зп"))) {
                    requestNumberColumnIndex = 4;
                    logger.info("Using column index 4 for request number based on content: '{}'", cell4Value);
                }
            }
            
            // Логирование найденных колонок для заявок
            logger.info("Purchase request columns - requestNumber: {}, creationDate: {}, innerId: {}, cfo: {}, name: {}, title: {}", 
                requestNumberColumnIndex, creationDateColumnIndex, innerIdColumnIndex, cfoColumnIndex, nameColumnIndex, titleColumnIndex);
            
            // Колонки для закупок
            Integer purchaseInnerIdColumnIndex = findColumnIndex(columnIndexMap, INNER_ID_COLUMN);
            Integer purchaseCreationDateColumnIndex = findColumnIndex(columnIndexMap, CREATION_DATE_COLUMN);
            Integer purchaseLinkColumnIndex = findColumnIndex(columnIndexMap, LINK_COLUMN);
            
            // Проверяем обязательные колонки
            if (documentTypeColumnIndex == null) {
                logger.warn("Column '{}' not found in file {}", DOCUMENT_TYPE_COLUMN, excelFile.getName());
                return Map.of("purchaseRequests", 0, "purchases", 0, "users", 0);
            }
            
            // Счетчики
            int purchaseRequestsCount = 0;
            int purchasesCount = 0;
            int usersCount = 0;
            int purchaseRequestsCreated = 0;
            int purchaseRequestsUpdated = 0;
            int purchasesCreated = 0;
            int purchasesUpdated = 0;
            int purchaseRequestTypeRowsFound = 0;
            int purchaseRequestSkippedMissingColumns = 0;
            int purchaseRequestParseErrors = 0;
            
            // Один проход по всем строкам
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                
                if (isRowEmpty(row)) {
                    continue;
                }

                // Получаем тип документа
                String documentType = getCellValueAsString(row.getCell(documentTypeColumnIndex));
                
                // Обрабатываем строку в зависимости от типа
                if (PURCHASE_REQUEST_TYPE.equals(documentType)) {
                    purchaseRequestTypeRowsFound++;
                    logger.debug("Found purchase request type row {}: documentType='{}'", row.getRowNum() + 1, documentType);
                    // Обработка заявки
                    if (requestNumberColumnIndex != null && creationDateColumnIndex != null) {
                        String requiresPurchaseColumnName = requiresPurchaseColumnIndex != null && headerRow.getCell(requiresPurchaseColumnIndex) != null ? 
                            getCellValueAsString(headerRow.getCell(requiresPurchaseColumnIndex)) : null;
                        String planColumnName = planColumnIndex != null && headerRow.getCell(planColumnIndex) != null ? 
                            getCellValueAsString(headerRow.getCell(planColumnIndex)) : null;
                        boolean processed = processPurchaseRequestRow(row, requestNumberColumnIndex, creationDateColumnIndex, 
                            innerIdColumnIndex, cfoColumnIndex, nameColumnIndex, titleColumnIndex, 
                            requiresPurchaseColumnIndex, requiresPurchaseColumnName, planColumnIndex, planColumnName, 
                            preparedByColumnIndex, purchaserColumnIndex);
                        if (processed) {
                            purchaseRequestsCount++;
                        } else {
                            purchaseRequestParseErrors++;
                        }
                    } else {
                        purchaseRequestSkippedMissingColumns++;
                        logger.warn("Skipping purchase request row {}: missing required columns (requestNumber: {}, creationDate: {})", 
                            row.getRowNum() + 1, requestNumberColumnIndex, creationDateColumnIndex);
                    }
                } else if (PURCHASE_TYPE.equals(documentType)) {
                    // Обработка закупки
                    if (purchaseInnerIdColumnIndex != null) {
                        boolean processed = processPurchaseRow(row, purchaseInnerIdColumnIndex, purchaseCreationDateColumnIndex, cfoColumnIndex, purchaseLinkColumnIndex);
                        if (processed) {
                            purchasesCount++;
                        }
                    }
                }
                
                // Обработка пользователя (из колонки "Подготовил" для всех строк)
                if (preparedByColumnIndex != null) {
                    try {
                        Cell preparedByCell = row.getCell(preparedByColumnIndex);
                        String preparedByValue = getCellValueAsString(preparedByCell);
                        if (preparedByValue != null && !preparedByValue.trim().isEmpty()) {
                            parseAndSaveUser(preparedByValue.trim());
                            usersCount++;
                        }
                    } catch (Exception e) {
                        logger.debug("Error parsing user from row {}: {}", row.getRowNum() + 1, e.getMessage());
                    }
                }
            }
            
            logger.info("Purchase request processing summary: found {} rows with type '{}', loaded {}, skipped (missing columns) {}, parse errors {}", 
                purchaseRequestTypeRowsFound, PURCHASE_REQUEST_TYPE, purchaseRequestsCount, purchaseRequestSkippedMissingColumns, purchaseRequestParseErrors);
            logger.info("Loaded {} purchase requests, {} purchases, {} users from file {}", 
                purchaseRequestsCount, purchasesCount, usersCount, excelFile.getName());
            
            return Map.of(
                "purchaseRequests", purchaseRequestsCount,
                "purchases", purchasesCount,
                "users", usersCount
            );
        } finally {
            workbook.close();
        }
    }
    
    /**
     * Обрабатывает одну строку заявки на закупку
     */
    private boolean processPurchaseRequestRow(Row row, int requestNumberColumnIndex, int creationDateColumnIndex,
            Integer innerIdColumnIndex, Integer cfoColumnIndex, Integer nameColumnIndex, Integer titleColumnIndex,
            Integer requiresPurchaseColumnIndex, String requiresPurchaseColumnName, Integer planColumnIndex, 
            String planColumnName, Integer preparedByColumnIndex, Integer purchaserColumnIndex) {
        try {
            PurchaseRequest pr = parsePurchaseRequestRow(row, requestNumberColumnIndex, creationDateColumnIndex, 
                innerIdColumnIndex, cfoColumnIndex, nameColumnIndex, titleColumnIndex, 
                requiresPurchaseColumnIndex, requiresPurchaseColumnName, planColumnIndex, planColumnName, 
                preparedByColumnIndex, purchaserColumnIndex);
            if (pr != null && pr.getIdPurchaseRequest() != null) {
                Optional<PurchaseRequest> existing = purchaseRequestRepository.findByIdPurchaseRequest(pr.getIdPurchaseRequest());
                if (existing.isPresent()) {
                    PurchaseRequest existingPr = existing.get();
                    boolean updated = updatePurchaseRequestFields(existingPr, pr);
                    if (updated) {
                        purchaseRequestRepository.save(existingPr);
                    }
                } else {
                    purchaseRequestRepository.save(pr);
                }
                return true;
            }
        } catch (Exception e) {
            logger.warn("Error processing purchase request row {}: {}", row.getRowNum() + 1, e.getMessage());
        }
        return false;
    }
    
    /**
     * Обрабатывает одну строку закупки
     */
    private boolean processPurchaseRow(Row row, Integer innerIdColumnIndex, Integer creationDateColumnIndex, Integer cfoColumnIndex, Integer linkColumnIndex) {
        try {
            Purchase purchase = parsePurchaseRow(row, innerIdColumnIndex, creationDateColumnIndex, cfoColumnIndex, linkColumnIndex);
            if (purchase == null) {
                return false;
            }
            if (purchase.getInnerId() == null || purchase.getInnerId().trim().isEmpty()) {
                return false;
            }
            Optional<Purchase> existing = purchaseRepository.findByInnerId(purchase.getInnerId().trim());
            if (existing.isPresent()) {
                Purchase existingPurchase = existing.get();
                boolean updated = updatePurchaseFields(existingPurchase, purchase);
                if (updated) {
                    purchaseRepository.save(existingPurchase);
                }
            } else {
                purchaseRepository.save(purchase);
            }
            return true;
        } catch (Exception e) {
            logger.warn("Error processing purchase row {}: {}", row.getRowNum() + 1, e.getMessage());
        }
        return false;
    }

    /**
     * Валидирует загружаемый файл
     */
    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Файл не предоставлен");
        }
        
        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xls") && !filename.endsWith(".xlsx"))) {
            throw new IllegalArgumentException("Файл должен быть в формате Excel (.xls или .xlsx)");
        }
    }

    /**
     * Загружает заявки на ЗП из Excel файла
     * Фильтрует по "Вид документа" = "Заявка на ЗП"
     * Загружает только "Номер заявки на ЗП" и "Дата создания"
     */
    public int loadPurchaseRequestsFromExcel(File excelFile) throws IOException {
        Workbook workbook;
        try (FileInputStream fis = new FileInputStream(excelFile)) {
            if (excelFile.getName().endsWith(".xlsx")) {
                workbook = new XSSFWorkbook(fis);
            } else {
                workbook = new HSSFWorkbook(fis);
            }
        }

        try {
            Sheet sheet = workbook.getSheetAt(0); // Берем первый лист
            Iterator<Row> rowIterator = sheet.iterator();
            
            if (!rowIterator.hasNext()) {
                logger.warn("Sheet is empty in file {}", excelFile.getName());
                return 0;
            }

            // Читаем заголовки (первая строка)
            Row headerRow = rowIterator.next();
            Map<String, Integer> columnIndexMap = buildColumnIndexMap(headerRow);
            
            // Проверяем наличие необходимых колонок (с поиском по частичному совпадению)
            Integer documentTypeColumnIndex = findColumnIndex(columnIndexMap, DOCUMENT_TYPE_COLUMN);
            Integer requestNumberColumnIndex = findColumnIndex(columnIndexMap, REQUEST_NUMBER_COLUMN);
            Integer creationDateColumnIndex = findColumnIndex(columnIndexMap, CREATION_DATE_COLUMN);
            Integer innerIdColumnIndex = findColumnIndex(columnIndexMap, INNER_ID_COLUMN);
            Integer cfoColumnIndex = findColumnIndex(columnIndexMap, CFO_COLUMN);
            Integer nameColumnIndex = findColumnIndex(columnIndexMap, NAME_COLUMN);
            Integer titleColumnIndex = findColumnIndex(columnIndexMap, TITLE_COLUMN);
            Integer requiresPurchaseColumnIndex = findColumnIndex(columnIndexMap, REQUIRES_PURCHASE_COLUMN);
            // Пробуем альтернативные названия колонки
            if (requiresPurchaseColumnIndex == null) {
                requiresPurchaseColumnIndex = findColumnIndex(columnIndexMap, "Требуется закупка");
            }
            if (requiresPurchaseColumnIndex == null) {
                requiresPurchaseColumnIndex = findColumnIndex(columnIndexMap, "Не требуется ЗП (Заявка на ЗП)");
            }
            Integer planColumnIndex = findColumnIndex(columnIndexMap, PLAN_COLUMN);
            Integer preparedByColumnIndex = findColumnIndex(columnIndexMap, PREPARED_BY_COLUMN);
            Integer purchaserColumnIndex = findColumnIndex(columnIndexMap, PURCHASER_COLUMN);
            
            // Если не нашли по имени, пробуем найти по известным позициям (из логов видно, что Column 4 = "Номер заявки на ЗП")
            if (requestNumberColumnIndex == null && headerRow.getCell(4) != null) {
                String cell4Value = getCellValueAsString(headerRow.getCell(4));
                logger.info("Checking column 4 (index 4) for request number: '{}'", cell4Value);
                // Проверяем, содержит ли колонка 4 ключевые слова "номер" и "заявки"
                if (cell4Value != null && (cell4Value.toLowerCase().contains("номер") || 
                    cell4Value.toLowerCase().contains("заявки") || 
                    cell4Value.toLowerCase().contains("зп"))) {
                    requestNumberColumnIndex = 4;
                    logger.info("Using column index 4 for request number based on content: '{}'", cell4Value);
                }
            }
            
            if (documentTypeColumnIndex == null) {
                logger.warn("Column '{}' not found in file {}. Available columns (first 20): {}", 
                    DOCUMENT_TYPE_COLUMN, excelFile.getName(), 
                    columnIndexMap.keySet().stream().limit(20).toList());
                return 0;
            }
            
            if (requestNumberColumnIndex == null) {
                logger.warn("Column '{}' not found in file {}. Available columns (first 20): {}", 
                    REQUEST_NUMBER_COLUMN, excelFile.getName(),
                    columnIndexMap.keySet().stream().limit(20).toList());
                return 0;
            }
            
            if (creationDateColumnIndex == null) {
                logger.warn("Column '{}' not found in file {}. Available columns (first 20): {}", 
                    CREATION_DATE_COLUMN, excelFile.getName(),
                    columnIndexMap.keySet().stream().limit(20).toList());
                return 0;
            }

            logger.info("Found required columns in file {}", excelFile.getName());
            if (innerIdColumnIndex != null) {
                logger.info("Found inner ID column at index {}", innerIdColumnIndex);
            } else {
                logger.info("Inner ID column not found, will skip this field");
            }
            if (cfoColumnIndex != null) {
                logger.info("Found CFO column at index {}", cfoColumnIndex);
            } else {
                logger.info("CFO column not found, will skip this field");
            }
            if (nameColumnIndex != null) {
                logger.info("Found name column at index {}", nameColumnIndex);
            } else {
                logger.info("Name column not found, will skip this field");
            }
            if (titleColumnIndex != null) {
                logger.info("Found title column at index {}", titleColumnIndex);
            } else {
                logger.info("Title column not found, will skip this field");
            }
            if (requiresPurchaseColumnIndex != null) {
                logger.info("Found requires purchase column at index {}", requiresPurchaseColumnIndex);
                String columnName = headerRow.getCell(requiresPurchaseColumnIndex) != null ? 
                    getCellValueAsString(headerRow.getCell(requiresPurchaseColumnIndex)) : "unknown";
                logger.info("Requires purchase column name in file: '{}'", columnName);
            } else {
                logger.warn("Requires purchase column not found, will skip this field");
                logger.info("Searched for: '{}', '{}', '{}', '{}'", 
                    REQUIRES_PURCHASE_COLUMN, "Требуется закупка", "Требуется Закупка", "Не требуется ЗП (Заявка на ЗП)");
                logger.info("Available columns (all): {}", columnIndexMap.keySet());
            }
            if (planColumnIndex != null) {
                logger.info("Found plan column at index {}", planColumnIndex);
            } else {
                logger.info("Plan column not found, will skip this field");
            }

            // Загружаем данные
            int loadedCount = 0;
            int updatedCount = 0;
            int createdCount = 0;
            
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                
                if (isRowEmpty(row)) {
                    continue;
                }

                // Получаем значение из колонки "Вид документа"
                String documentType = getCellValueAsString(row.getCell(documentTypeColumnIndex));
                
                // Фильтруем только "Заявка на ЗП"
                if (PURCHASE_REQUEST_TYPE.equals(documentType)) {
                    try {
                        String requiresPurchaseColumnName = requiresPurchaseColumnIndex != null && headerRow.getCell(requiresPurchaseColumnIndex) != null ? 
                            getCellValueAsString(headerRow.getCell(requiresPurchaseColumnIndex)) : null;
                        String planColumnName = planColumnIndex != null && headerRow.getCell(planColumnIndex) != null ? 
                            getCellValueAsString(headerRow.getCell(planColumnIndex)) : null;
                        PurchaseRequest pr = parsePurchaseRequestRow(row, requestNumberColumnIndex, creationDateColumnIndex, innerIdColumnIndex, cfoColumnIndex, nameColumnIndex, titleColumnIndex, requiresPurchaseColumnIndex, requiresPurchaseColumnName, planColumnIndex, planColumnName, preparedByColumnIndex, purchaserColumnIndex);
                        if (pr != null && pr.getIdPurchaseRequest() != null) {
                            // Проверяем, существует ли заявка с таким номером
                            Optional<PurchaseRequest> existing = purchaseRequestRepository.findByIdPurchaseRequest(pr.getIdPurchaseRequest());
                            
                            if (existing.isPresent()) {
                                // Обновляем существующую заявку только измененными полями
                                PurchaseRequest existingPr = existing.get();
                                boolean updated = updatePurchaseRequestFields(existingPr, pr);
                                if (updated) {
                                    purchaseRequestRepository.save(existingPr);
                                    updatedCount++;
                                }
                            } else {
                                // Создаем новую заявку
                                purchaseRequestRepository.save(pr);
                                createdCount++;
                            }
                            loadedCount++;
                        }
                    } catch (Exception e) {
                        logger.warn("Error parsing row {}: {}", row.getRowNum() + 1, e.getMessage());
                    }
                }
            }

            logger.info("Loaded {} records: {} created, {} updated", loadedCount, createdCount, updatedCount);
            return loadedCount;
        } finally {
            workbook.close();
        }
    }

    /**
     * Обновляет поля существующей заявки только если они отличаются
     */
    private boolean updatePurchaseRequestFields(PurchaseRequest existing, PurchaseRequest newData) {
        boolean updated = false;
        
        // Обновляем дату создания только если она отличается
        if (newData.getPurchaseRequestCreationDate() != null) {
            if (existing.getPurchaseRequestCreationDate() == null || 
                !existing.getPurchaseRequestCreationDate().equals(newData.getPurchaseRequestCreationDate())) {
                existing.setPurchaseRequestCreationDate(newData.getPurchaseRequestCreationDate());
                updated = true;
                logger.debug("Updated purchaseRequestCreationDate for request {}", existing.getIdPurchaseRequest());
            }
        }
        
        // Обновляем внутренний номер только если он отличается
        if (newData.getInnerId() != null && !newData.getInnerId().trim().isEmpty()) {
            if (existing.getInnerId() == null || !existing.getInnerId().equals(newData.getInnerId())) {
                existing.setInnerId(newData.getInnerId());
                updated = true;
                logger.debug("Updated innerId for request {}: {}", existing.getIdPurchaseRequest(), newData.getInnerId());
            }
        }
        
        // Обновляем ЦФО только если оно отличается
        if (newData.getCfo() != null && !newData.getCfo().trim().isEmpty()) {
            if (existing.getCfo() == null || !existing.getCfo().equals(newData.getCfo())) {
                existing.setCfo(newData.getCfo());
                updated = true;
                logger.debug("Updated cfo for request {}: {}", existing.getIdPurchaseRequest(), newData.getCfo());
            }
        }
        
        // Обновляем наименование только если оно отличается
        if (newData.getName() != null && !newData.getName().trim().isEmpty()) {
            if (existing.getName() == null || !existing.getName().equals(newData.getName())) {
                existing.setName(newData.getName());
                updated = true;
                logger.debug("Updated name for request {}: {}", existing.getIdPurchaseRequest(), newData.getName());
            }
        }
        
        // Обновляем заголовок только если он отличается
        if (newData.getTitle() != null && !newData.getTitle().trim().isEmpty()) {
            if (existing.getTitle() == null || !existing.getTitle().equals(newData.getTitle())) {
                existing.setTitle(newData.getTitle());
                updated = true;
                logger.debug("Updated title for request {}: {}", existing.getIdPurchaseRequest(), newData.getTitle());
            }
        }
        
        // Обновляем требуется закупка только если оно отличается
        if (newData.getRequiresPurchase() != null) {
            if (existing.getRequiresPurchase() == null || !existing.getRequiresPurchase().equals(newData.getRequiresPurchase())) {
                existing.setRequiresPurchase(newData.getRequiresPurchase());
                updated = true;
                logger.debug("Updated requiresPurchase for request {}: {}", existing.getIdPurchaseRequest(), newData.getRequiresPurchase());
            }
        }
        
        // Обновляем план только если оно отличается
        if (newData.getIsPlanned() != null) {
            if (existing.getIsPlanned() == null || !existing.getIsPlanned().equals(newData.getIsPlanned())) {
                existing.setIsPlanned(newData.getIsPlanned());
                updated = true;
                logger.debug("Updated isPlanned for request {}: {}", existing.getIdPurchaseRequest(), newData.getIsPlanned());
            }
        }
        
        // Обновляем инициатора только если он отличается
        if (newData.getPurchaseRequestInitiator() != null && !newData.getPurchaseRequestInitiator().trim().isEmpty()) {
            if (existing.getPurchaseRequestInitiator() == null || !existing.getPurchaseRequestInitiator().equals(newData.getPurchaseRequestInitiator())) {
                existing.setPurchaseRequestInitiator(newData.getPurchaseRequestInitiator());
                updated = true;
                logger.debug("Updated purchaseRequestInitiator for request {}: {}", existing.getIdPurchaseRequest(), newData.getPurchaseRequestInitiator());
            }
        }
        
        // Обновляем закупщика только если он отличается
        if (newData.getPurchaser() != null && !newData.getPurchaser().trim().isEmpty()) {
            if (existing.getPurchaser() == null || !existing.getPurchaser().equals(newData.getPurchaser())) {
                existing.setPurchaser(newData.getPurchaser());
                updated = true;
                logger.debug("Updated purchaser for request {}: {}", existing.getIdPurchaseRequest(), newData.getPurchaser());
            }
        }
        
        return updated;
    }

    /**
     * Парсит строку Excel в PurchaseRequest для типа "Заявка на ЗП"
     * Загружает "Номер заявки на ЗП", "Дата создания", "Внутренний номер", "ЦФО", "Наименование", "Заголовок", "Требуется Закупка", "План", "Подготовил" и "Ответственный за ЗП (Закупочная процедура)"
     */
    private PurchaseRequest parsePurchaseRequestRow(Row row, int requestNumberColumnIndex, int creationDateColumnIndex, Integer innerIdColumnIndex, Integer cfoColumnIndex, Integer nameColumnIndex, Integer titleColumnIndex, Integer requiresPurchaseColumnIndex, String requiresPurchaseColumnName, Integer planColumnIndex, String planColumnName, Integer preparedByColumnIndex, Integer purchaserColumnIndex) {
        PurchaseRequest pr = new PurchaseRequest();
        
        try {
            // Номер заявки на ЗП (как Long)
            Cell requestNumberCell = row.getCell(requestNumberColumnIndex);
            Long requestNumber = parseLongCell(requestNumberCell);
            if (requestNumber != null) {
                pr.setIdPurchaseRequest(requestNumber);
            } else {
                logger.warn("Empty or invalid request number in row {}", row.getRowNum() + 1);
                return null; // Пропускаем записи без номера заявки
            }
            
            // Дата создания
            Cell creationDateCell = row.getCell(creationDateColumnIndex);
            LocalDateTime creationDate = parseDateCell(creationDateCell);
            if (creationDate != null) {
                pr.setPurchaseRequestCreationDate(creationDate);
                logger.debug("Parsed creation date for row {}: {}", row.getRowNum() + 1, creationDate);
            } else {
                String cellValue = creationDateCell != null ? getCellValueAsString(creationDateCell) : "null";
                logger.warn("Could not parse creation date in row {}: cell value = '{}', cell type = {}", 
                    row.getRowNum() + 1, cellValue, 
                    creationDateCell != null ? creationDateCell.getCellType() : "null");
            }
            
            // Внутренний номер (опционально)
            if (innerIdColumnIndex != null) {
                Cell innerIdCell = row.getCell(innerIdColumnIndex);
                String innerId = getCellValueAsString(innerIdCell);
                if (innerId != null && !innerId.trim().isEmpty()) {
                    pr.setInnerId(innerId.trim());
                }
            }
            
            // ЦФО (опционально)
            if (cfoColumnIndex != null) {
                Cell cfoCell = row.getCell(cfoColumnIndex);
                String cfo = getCellValueAsString(cfoCell);
                if (cfo != null && !cfo.trim().isEmpty()) {
                    pr.setCfo(cfo.trim());
                }
            }
            
            // Наименование (опционально)
            if (nameColumnIndex != null) {
                Cell nameCell = row.getCell(nameColumnIndex);
                String name = getCellValueAsString(nameCell);
                if (name != null && !name.trim().isEmpty()) {
                    pr.setName(name.trim());
                }
            }
            
            // Заголовок (опционально)
            if (titleColumnIndex != null) {
                Cell titleCell = row.getCell(titleColumnIndex);
                String title = getCellValueAsString(titleCell);
                if (title != null && !title.trim().isEmpty()) {
                    pr.setTitle(title.trim());
                }
            }
            
            // Требуется Закупка (опционально, булево поле)
            // Если колонка называется "Не требуется ЗП (Заявка на ЗП)", то логика обратная:
            // если в ячейке что-то есть (да/1/true) - значит НЕ требуется, т.е. requiresPurchase = false
            // если пусто - значит требуется, т.е. requiresPurchase = true
            if (requiresPurchaseColumnIndex != null) {
                Cell requiresPurchaseCell = row.getCell(requiresPurchaseColumnIndex);
                String cellValueStr = getCellValueAsString(requiresPurchaseCell);
                
                // Проверяем, какое название у колонки
                boolean isInvertedLogic = requiresPurchaseColumnName != null && requiresPurchaseColumnName.contains("Не требуется");
                
                Boolean requiresPurchase = null;
                if (cellValueStr != null && !cellValueStr.trim().isEmpty()) {
                    // Если ячейка не пустая, парсим значение
                    Boolean parsedValue = parseBooleanCell(requiresPurchaseCell);
                    if (parsedValue != null) {
                        if (isInvertedLogic) {
                            // Если колонка "Не требуется", то true в ячейке = false для requiresPurchase
                            requiresPurchase = !parsedValue;
                        } else {
                            // Обычная логика
                            requiresPurchase = parsedValue;
                        }
                    }
                } else if (isInvertedLogic) {
                    // Если колонка "Не требуется" и ячейка пустая, значит требуется
                    requiresPurchase = true;
                }
                
                if (requiresPurchase != null) {
                    pr.setRequiresPurchase(requiresPurchase);
                    logger.debug("Row {}: parsed requiresPurchase as: {} (column: '{}', value: '{}', inverted: {})", 
                        row.getRowNum() + 1, requiresPurchase, requiresPurchaseColumnName, cellValueStr, isInvertedLogic);
                }
            }
            
            // План (опционально, булево поле)
            if (planColumnIndex != null) {
                Cell planCell = row.getCell(planColumnIndex);
                String cellValueStr = getCellValueAsString(planCell);
                logger.debug("Row {}: plan cell value: '{}'", row.getRowNum() + 1, cellValueStr);
                Boolean isPlanned = parseBooleanCell(planCell);
                if (isPlanned != null) {
                    pr.setIsPlanned(isPlanned);
                    logger.debug("Row {}: parsed isPlanned as: {} (column: '{}', value: '{}')", 
                        row.getRowNum() + 1, isPlanned, planColumnName, cellValueStr);
                } else {
                    logger.debug("Row {}: isPlanned is null after parsing (column: '{}', value: '{}')", 
                        row.getRowNum() + 1, planColumnName, cellValueStr);
                }
            } else {
                logger.debug("Row {}: planColumnIndex is null, skipping field", row.getRowNum() + 1);
            }
            
            // Подготовил (опционально) - парсим и создаем/обновляем User, а также устанавливаем в purchaseRequestInitiator
            if (preparedByColumnIndex != null) {
                Cell preparedByCell = row.getCell(preparedByColumnIndex);
                String preparedByValue = getCellValueAsString(preparedByCell);
                if (preparedByValue != null && !preparedByValue.trim().isEmpty()) {
                    String trimmedValue = preparedByValue.trim();
                    // Устанавливаем в purchaseRequestInitiator
                    pr.setPurchaseRequestInitiator(trimmedValue);
                }
            }
            
            // Закупщик (опционально) - парсим поле "Ответственный за ЗП (Закупочная процедура)"
            if (purchaserColumnIndex != null) {
                Cell purchaserCell = row.getCell(purchaserColumnIndex);
                String purchaser = getCellValueAsString(purchaserCell);
                if (purchaser != null && !purchaser.trim().isEmpty()) {
                    pr.setPurchaser(purchaser.trim());
                }
            }
            
            return pr;
        } catch (Exception e) {
            logger.error("Error parsing PurchaseRequest row {}: {}", row.getRowNum() + 1, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Парсит ячейку в Long
     */
    private Long parseLongCell(Cell cell) {
        if (cell == null) {
            return null;
        }
        
        try {
            switch (cell.getCellType()) {
                case NUMERIC:
                    double numValue = cell.getNumericCellValue();
                    return (long) numValue;
                case STRING:
                    String strValue = cell.getStringCellValue().trim();
                    if (strValue.isEmpty()) {
                        return null;
                    }
                    // Убираем пробелы и запятые (разделители тысяч)
                    strValue = strValue.replaceAll("[\\s,]", "");
                    return Long.parseLong(strValue);
                case FORMULA:
                    // Для формул пытаемся получить числовое значение
                    if (cell.getCachedFormulaResultType() == CellType.NUMERIC) {
                        return (long) cell.getNumericCellValue();
                    } else if (cell.getCachedFormulaResultType() == CellType.STRING) {
                        String formulaValue = cell.getStringCellValue().trim();
                        formulaValue = formulaValue.replaceAll("[\\s,]", "");
                        return Long.parseLong(formulaValue);
                    }
                    return null;
                default:
                    return null;
            }
        } catch (NumberFormatException e) {
            logger.warn("Cannot parse Long from cell: {}", getCellValueAsString(cell));
            return null;
        }
    }

    /**
     * Парсит ячейку в Boolean
     */
    private Boolean parseBooleanCell(Cell cell) {
        if (cell == null) {
            return null;
        }
        
        try {
            switch (cell.getCellType()) {
                case BOOLEAN:
                    return cell.getBooleanCellValue();
                case STRING:
                    String strValue = getCellValueAsString(cell);
                    if (strValue == null || strValue.trim().isEmpty()) {
                        return null;
                    }
                    strValue = strValue.trim().toLowerCase();
                    // Проверяем различные варианты "да"/"нет", "true"/"false", "1"/"0"
                    // Также проверяем варианты с "не требуется" - это означает false
                    if (strValue.contains("не требуется") || strValue.contains("нетребуется")) {
                        return false;
                    }
                    // Проверяем значения для поля "План": "Плановая" = true, "Внеплановая" = false
                    // ВАЖНО: сначала проверяем "внеплановая", так как она содержит "плановая"
                    if (strValue.equals("внеплановая") || strValue.startsWith("внеплановая")) {
                        return false;
                    } else if (strValue.equals("плановая") || strValue.startsWith("плановая")) {
                        return true;
                    }
                    if (strValue.equals("да") || strValue.equals("true") || strValue.equals("1") || 
                        strValue.equals("yes") || strValue.equals("y") || strValue.equals("требуется")) {
                        return true;
                    } else if (strValue.equals("нет") || strValue.equals("false") || strValue.equals("0") || 
                               strValue.equals("no") || strValue.equals("n")) {
                        return false;
                    }
                    logger.debug("Cannot parse boolean from string value: '{}'", strValue);
                    return null;
                case NUMERIC:
                    double numValue = cell.getNumericCellValue();
                    if (numValue == 1.0) {
                        return true;
                    } else if (numValue == 0.0) {
                        return false;
                    }
                    return null;
                case FORMULA:
                    if (cell.getCachedFormulaResultType() == CellType.BOOLEAN) {
                        return cell.getBooleanCellValue();
                    } else if (cell.getCachedFormulaResultType() == CellType.STRING) {
                        String formulaValue = getCellValueAsString(cell);
                        if (formulaValue != null && !formulaValue.trim().isEmpty()) {
                            formulaValue = formulaValue.trim().toLowerCase();
                            if (formulaValue.contains("не требуется") || formulaValue.contains("нетребуется")) {
                                return false;
                            }
                            // Проверяем значения для поля "План": "Плановая" = true, "Внеплановая" = false
                            // ВАЖНО: сначала проверяем "внеплановая", так как она содержит "плановая"
                            if (formulaValue.equals("внеплановая") || formulaValue.startsWith("внеплановая")) {
                                return false;
                            } else if (formulaValue.equals("плановая") || formulaValue.startsWith("плановая")) {
                                return true;
                            }
                            if (formulaValue.equals("да") || formulaValue.equals("true") || formulaValue.equals("1") || formulaValue.equals("требуется")) {
                                return true;
                            } else if (formulaValue.equals("нет") || formulaValue.equals("false") || formulaValue.equals("0")) {
                                return false;
                            }
                        }
                    } else if (cell.getCachedFormulaResultType() == CellType.NUMERIC) {
                        double formulaNumValue = cell.getNumericCellValue();
                        if (formulaNumValue == 1.0) {
                            return true;
                        } else if (formulaNumValue == 0.0) {
                            return false;
                        }
                    }
                    return null;
                default:
                    return null;
            }
        } catch (Exception e) {
            logger.warn("Cannot parse Boolean from cell: {}", getCellValueAsString(cell));
            return null;
        }
    }

    /**
     * Парсит ячейку с датой в LocalDateTime
     */
    private LocalDateTime parseDateCell(Cell cell) {
        if (cell == null) {
            return null;
        }
        
        try {
            // Если ячейка помечена как дата в Excel
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                Date dateValue = cell.getDateCellValue();
                if (dateValue != null) {
                    return dateValue.toInstant()
                        .atZone(ZoneId.systemDefault())
                        .toLocalDateTime();
                }
            }
            
            // Если ячейка имеет тип STRING, пытаемся распарсить строку
            if (cell.getCellType() == CellType.STRING) {
                String dateStr = getCellValueAsString(cell);
                if (dateStr != null && !dateStr.trim().isEmpty()) {
                    LocalDateTime parsedDate = parseStringDate(dateStr.trim());
                    if (parsedDate != null) {
                        return parsedDate;
                    }
                    logger.debug("Could not parse date string: {}", dateStr);
                }
            }
            
            // Если ячейка имеет тип NUMERIC, но не помечена как дата, 
            // проверяем, может это дата в числовом формате Excel
            if (cell.getCellType() == CellType.NUMERIC) {
                double numericValue = cell.getNumericCellValue();
                // Excel хранит даты как числа (дни с 1900-01-01)
                // Если число в разумных пределах для даты (например, от 1 до 100000)
                if (numericValue > 0 && numericValue < 1000000) {
                    try {
                        // Пробуем интерпретировать как дату Excel
                        Date dateValue = DateUtil.getJavaDate(numericValue);
                        if (dateValue != null) {
                            return dateValue.toInstant()
                                .atZone(ZoneId.systemDefault())
                                .toLocalDateTime();
                        }
                    } catch (Exception e) {
                        logger.debug("Could not convert numeric value {} to date: {}", numericValue, e.getMessage());
                    }
                }
            }
            
            // Для формул
            if (cell.getCellType() == CellType.FORMULA) {
                if (cell.getCachedFormulaResultType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                    Date dateValue = cell.getDateCellValue();
                    if (dateValue != null) {
                        return dateValue.toInstant()
                            .atZone(ZoneId.systemDefault())
                            .toLocalDateTime();
                    }
                } else if (cell.getCachedFormulaResultType() == CellType.STRING) {
                    String dateStr = cell.getStringCellValue().trim();
                    if (!dateStr.isEmpty()) {
                        LocalDateTime parsedDate = parseStringDate(dateStr);
                        if (parsedDate != null) {
                            return parsedDate;
                        }
                    }
                }
            }
        } catch (Exception e) {
            logger.warn("Error parsing date cell (row {}): {}", cell.getRowIndex() + 1, e.getMessage());
        }
        
        return null;
    }
    
    /**
     * Парсит строку с датой в различных форматах
     */
    private LocalDateTime parseStringDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }
        
        dateStr = dateStr.trim();
        
        // Список форматов для парсинга
        DateTimeFormatter[] formatters = {
            DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss"),
            DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"),
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"),
            DateTimeFormatter.ofPattern("dd/MM/yyyy"),
            DateTimeFormatter.ISO_LOCAL_DATE_TIME,
            DateTimeFormatter.ISO_LOCAL_DATE
        };
        
        // Пробуем распарсить каждым форматом
        for (DateTimeFormatter formatter : formatters) {
            try {
                if (formatter == DateTimeFormatter.ISO_LOCAL_DATE_TIME || 
                    formatter == DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss") ||
                    formatter == DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss") ||
                    formatter == DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")) {
                    return LocalDateTime.parse(dateStr, formatter);
                } else {
                    LocalDate date = LocalDate.parse(dateStr, formatter);
                    return date.atStartOfDay();
                }
            } catch (Exception e) {
                // Пробуем следующий формат
            }
        }
        
        return null;
    }

    /**
     * Создает карту индексов колонок по заголовкам
     */
    private Map<String, Integer> buildColumnIndexMap(Row headerRow) {
        Map<String, Integer> columnIndexMap = new HashMap<>();
        
        for (int i = 0; i < headerRow.getLastCellNum(); i++) {
            Cell cell = headerRow.getCell(i);
            if (cell != null) {
                String headerValue = getCellValueAsString(cell);
                if (headerValue != null && !headerValue.trim().isEmpty()) {
                    String trimmed = headerValue.trim();
                    columnIndexMap.put(trimmed, i);
                    // Логируем первые 20 колонок для отладки
                    if (i < 20) {
                        logger.debug("Column {}: [{}]", i, trimmed);
                    }
                }
            }
        }
        
        logger.info("Found {} columns in header", columnIndexMap.size());
        // Логируем все ключи для отладки проблем с кодировкой
        logger.debug("Column names (first 10): {}", 
            columnIndexMap.keySet().stream().limit(10).toList());
        return columnIndexMap;
    }

    /**
     * Находит индекс колонки по точному или частичному совпадению
     * Учитывает проблемы с кодировкой, используя байтовое сравнение
     */
    private Integer findColumnIndex(Map<String, Integer> columnIndexMap, String columnName) {
        // Сначала пробуем точное совпадение
        Integer exactMatch = columnIndexMap.get(columnName);
        if (exactMatch != null) {
            return exactMatch;
        }
        
        // Получаем байты исходной строки в разных кодировках для сравнения
        byte[] columnNameBytesUtf8 = columnName.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] columnNameBytesCp1251 = null;
        try {
            columnNameBytesCp1251 = columnName.getBytes("Windows-1251");
        } catch (java.io.UnsupportedEncodingException e) {
            // Игнорируем
        }
        
        // Пробуем найти по байтовому совпадению (для работы с проблемами кодировки)
        for (Map.Entry<String, Integer> entry : columnIndexMap.entrySet()) {
            String entryKey = entry.getKey();
            
            // Сравниваем байты в разных кодировках
            byte[] entryKeyBytesUtf8 = entryKey.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            if (java.util.Arrays.equals(columnNameBytesUtf8, entryKeyBytesUtf8)) {
                logger.info("Found column '{}' by byte match (UTF-8): '{}'", columnName, entryKey);
                return entry.getValue();
            }
            
            if (columnNameBytesCp1251 != null) {
                try {
                    byte[] entryKeyBytesCp1251 = entryKey.getBytes("Windows-1251");
                    if (java.util.Arrays.equals(columnNameBytesCp1251, entryKeyBytesCp1251)) {
                        logger.info("Found column '{}' by byte match (CP1251): '{}'", columnName, entryKey);
                        return entry.getValue();
                    }
                } catch (java.io.UnsupportedEncodingException e) {
                    // Игнорируем
                }
            }
        }
        
        // Пробуем найти по ключевым словам (для работы с проблемами кодировки)
        String[] keywords = extractKeywords(columnName);
        String normalizedColumnName = normalizeString(columnName);
        
        for (Map.Entry<String, Integer> entry : columnIndexMap.entrySet()) {
            String entryKey = entry.getKey();
            String normalizedEntryKey = normalizeString(entryKey);
            
            // Сначала пробуем нормализованное сравнение
            if (normalizedEntryKey.equals(normalizedColumnName)) {
                logger.info("Found column '{}' by normalized match: '{}'", columnName, entryKey);
                return entry.getValue();
            }
            
            // Пробуем по ключевым словам
            boolean matches = true;
            for (String keyword : keywords) {
                if (keyword.length() > 2 && !normalizedEntryKey.contains(normalizeString(keyword))) {
                    matches = false;
                    break;
                }
            }
            
            if (matches && keywords.length > 0) {
                logger.info("Found column '{}' by keyword match: '{}'", columnName, entryKey);
                return entry.getValue();
            }
        }
        
        // Пробуем найти по частичному совпадению (без учета регистра и пробелов)
        for (Map.Entry<String, Integer> entry : columnIndexMap.entrySet()) {
            String entryKey = entry.getKey().toLowerCase();
            String lowerColumnName = columnName.toLowerCase();
            if (entryKey.contains(lowerColumnName) || lowerColumnName.contains(entryKey) ||
                normalizeString(entryKey).contains(normalizedColumnName) || 
                normalizedColumnName.contains(normalizeString(entryKey))) {
                logger.info("Found column '{}' by partial match: '{}'", columnName, entryKey);
                return entry.getValue();
            }
        }
        
        return null;
    }
    
    /**
     * Извлекает ключевые слова из названия колонки для поиска
     */
    private String[] extractKeywords(String columnName) {
        // Для "Номер заявки на ЗП" -> ["номер", "заявки", "зп"]
        // Для "Вид документа" -> ["вид", "документа"]
        // Для "Дата создания" -> ["дата", "создания"]
        return columnName.toLowerCase()
            .replaceAll("[^а-яёa-z0-9\\s]", " ")
            .split("\\s+");
    }
    
    /**
     * Нормализует строку для сравнения (убирает пробелы, приводит к нижнему регистру)
     */
    private String normalizeString(String str) {
        if (str == null) {
            return "";
        }
        return str.toLowerCase().replaceAll("\\s+", "").trim();
    }

    /**
     * Получает значение ячейки как строку
     */
    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return null;
        }
        
        switch (cell.getCellType()) {
            case STRING:
                // Используем DataFormatter для правильной обработки кодировки и форматирования
                try {
                    String value = dataFormatter.formatCellValue(cell);
                    if (value != null && !value.trim().isEmpty()) {
                        return value.trim();
                    }
                } catch (Exception e) {
                    logger.debug("Error reading with DataFormatter: {}", e.getMessage());
                }
                // Fallback на RichTextString
                try {
                    org.apache.poi.ss.usermodel.RichTextString richText = cell.getRichStringCellValue();
                    if (richText != null) {
                        String value = richText.getString();
                        if (value != null && !value.trim().isEmpty()) {
                            return value.trim();
                        }
                    }
                } catch (Exception e) {
                    logger.debug("Error reading RichTextString: {}", e.getMessage());
                }
                // Последний fallback на обычное чтение
                return cell.getStringCellValue().trim();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    double numValue = cell.getNumericCellValue();
                    if (numValue == (long) numValue) {
                        return String.valueOf((long) numValue);
                    } else {
                        return String.valueOf(numValue);
                    }
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                return cell.getCellFormula();
            default:
                return "";
        }
    }

    /**
     * Парсит строку формата "Kupriianova Anastasiia (Административно-хозяйственный отдел, Офис менеджер)"
     * и создает/обновляет User
     * Формат: "Surname Name (Отдел, Должность)"
     */
    private void parseAndSaveUser(String preparedByValue) {
        try {
            // Парсим строку формата "Kupriianova Anastasiia (Административно-хозяйственный отдел, Офис менеджер)"
            String surname = null;
            String name = null;
            String department = null;
            String position = null;
            
            // Ищем скобки с отделом и должностью
            int openBracketIndex = preparedByValue.indexOf('(');
            int closeBracketIndex = preparedByValue.indexOf(')');
            
            if (openBracketIndex > 0 && closeBracketIndex > openBracketIndex) {
                // Есть скобки - извлекаем отдел и должность
                String namePart = preparedByValue.substring(0, openBracketIndex).trim();
                String departmentPart = preparedByValue.substring(openBracketIndex + 1, closeBracketIndex).trim();
                
                // Парсим имя и фамилию
                String[] nameParts = namePart.split("\\s+", 2);
                if (nameParts.length >= 1) {
                    surname = nameParts[0].trim();
                }
                if (nameParts.length >= 2) {
                    name = nameParts[1].trim();
                }
                
                // Парсим отдел и должность (разделены запятой)
                String[] deptParts = departmentPart.split(",", 2);
                if (deptParts.length >= 1) {
                    department = deptParts[0].trim();
                }
                if (deptParts.length >= 2) {
                    position = deptParts[1].trim();
                }
            } else {
                // Нет скобок - только имя и фамилия
                String[] nameParts = preparedByValue.split("\\s+", 2);
                if (nameParts.length >= 1) {
                    surname = nameParts[0].trim();
                }
                if (nameParts.length >= 2) {
                    name = nameParts[1].trim();
                }
            }
            
            // Создаем username из surname и name (для уникальности)
            String username = (surname != null ? surname : "") + 
                             (name != null ? "_" + name : "");
            if (username.isEmpty() || username.equals("_")) {
                username = "user_" + System.currentTimeMillis();
            }
            
            // Ищем существующего пользователя по surname и name
            User existingUser = null;
            if (surname != null && name != null) {
                // Сначала ищем по surname и name (более точный поиск)
                existingUser = userRepository.findBySurnameAndName(surname, name).orElse(null);
                // Если не нашли, пробуем по username
                if (existingUser == null) {
                    existingUser = userRepository.findByUsername(username).orElse(null);
                }
            }
            
            if (existingUser != null) {
                // Обновляем существующего пользователя
                boolean updated = false;
                if (surname != null && !surname.equals(existingUser.getSurname())) {
                    existingUser.setSurname(surname);
                    updated = true;
                }
                if (name != null && !name.equals(existingUser.getName())) {
                    existingUser.setName(name);
                    updated = true;
                }
                if (department != null && !department.equals(existingUser.getDepartment())) {
                    existingUser.setDepartment(department);
                    updated = true;
                }
                if (position != null && !position.equals(existingUser.getPosition())) {
                    existingUser.setPosition(position);
                    updated = true;
                }
                if (updated) {
                    userRepository.save(existingUser);
                    logger.debug("Updated user: {} {}", surname, name);
                }
            } else {
                // Создаем нового пользователя
                User newUser = new User();
                newUser.setUsername(username);
                newUser.setPassword(""); // Пароль будет установлен позже или через другой механизм
                newUser.setSurname(surname);
                newUser.setName(name);
                newUser.setDepartment(department);
                newUser.setPosition(position);
                userRepository.save(newUser);
                logger.debug("Created user: {} {}", surname, name);
            }
        } catch (Exception e) {
            logger.warn("Error parsing and saving user from '{}': {}", preparedByValue, e.getMessage());
        }
    }

    /**
     * Проверяет, пустая ли строка
     */
    private boolean isRowEmpty(Row row) {
        if (row == null) {
            return true;
        }
        
        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String value = getCellValueAsString(cell);
                if (value != null && !value.trim().isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Загружает пользователей из Excel файла
     * Парсит поле "Подготовил" и создает/обновляет пользователей
     */
    public int loadUsersFromExcel(File excelFile) throws IOException {
        Workbook workbook;
        try (FileInputStream fis = new FileInputStream(excelFile)) {
            if (excelFile.getName().endsWith(".xlsx")) {
                workbook = new XSSFWorkbook(fis);
            } else {
                workbook = new HSSFWorkbook(fis);
            }
        }

        try {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rowIterator = sheet.iterator();
            
            if (!rowIterator.hasNext()) {
                logger.warn("Sheet is empty in file {}", excelFile.getName());
                return 0;
            }

            // Читаем заголовки
            Row headerRow = rowIterator.next();
            Map<String, Integer> columnIndexMap = buildColumnIndexMap(headerRow);
            
            Integer preparedByColumnIndex = findColumnIndex(columnIndexMap, PREPARED_BY_COLUMN);
            
            if (preparedByColumnIndex == null) {
                logger.warn("Column '{}' not found in file {}", PREPARED_BY_COLUMN, excelFile.getName());
                return 0;
            }

            int loadedCount = 0;
            
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                
                if (isRowEmpty(row)) {
                    continue;
                }

                try {
                    Cell preparedByCell = row.getCell(preparedByColumnIndex);
                    String preparedByValue = getCellValueAsString(preparedByCell);
                    if (preparedByValue != null && !preparedByValue.trim().isEmpty()) {
                        parseAndSaveUser(preparedByValue.trim());
                        loadedCount++;
                    }
                } catch (Exception e) {
                    logger.warn("Error parsing user from row {}: {}", row.getRowNum() + 1, e.getMessage());
                }
            }

            logger.info("Loaded {} users from file {}", loadedCount, excelFile.getName());
            return loadedCount;
        } finally {
            workbook.close();
        }
    }

    /**
     * Загружает закупки из Excel файла
     * Фильтрует по "Вид документа" = "Закупочная процедура"
     */
    public int loadPurchasesFromExcel(File excelFile) throws IOException {
        Workbook workbook;
        try (FileInputStream fis = new FileInputStream(excelFile)) {
            if (excelFile.getName().endsWith(".xlsx")) {
                workbook = new XSSFWorkbook(fis);
            } else {
                workbook = new HSSFWorkbook(fis);
            }
        }

        try {
            Sheet sheet = workbook.getSheetAt(0);
            Iterator<Row> rowIterator = sheet.iterator();
            
            if (!rowIterator.hasNext()) {
                logger.warn("Sheet is empty in file {}", excelFile.getName());
                return 0;
            }

            // Читаем заголовки
            Row headerRow = rowIterator.next();
            Map<String, Integer> columnIndexMap = buildColumnIndexMap(headerRow);
            
            Integer documentTypeColumnIndex = findColumnIndex(columnIndexMap, DOCUMENT_TYPE_COLUMN);
            Integer innerIdColumnIndex = findColumnIndex(columnIndexMap, INNER_ID_COLUMN);
            Integer creationDateColumnIndex = findColumnIndex(columnIndexMap, CREATION_DATE_COLUMN);
            Integer cfoColumnIndex = findColumnIndex(columnIndexMap, CFO_COLUMN);
            Integer linkColumnIndex = findColumnIndex(columnIndexMap, LINK_COLUMN);
            
            if (innerIdColumnIndex == null) {
                logger.warn("Column '{}' not found in file {} for purchases", INNER_ID_COLUMN, excelFile.getName());
                return 0;
            } else {
                logger.info("Found column '{}' at index {} for purchases", INNER_ID_COLUMN, innerIdColumnIndex);
            }

            if (documentTypeColumnIndex == null) {
                logger.warn("Column '{}' not found in file {}", DOCUMENT_TYPE_COLUMN, excelFile.getName());
                return 0;
            }

            int loadedCount = 0;
            int createdCount = 0;
            int updatedCount = 0;
            int purchaseTypeRowsFound = 0;
            int parseErrors = 0;
            int emptyInnerId = 0;
            
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                
                if (isRowEmpty(row)) {
                    continue;
                }

                // Получаем значение из колонки "Вид документа"
                String documentType = getCellValueAsString(row.getCell(documentTypeColumnIndex));
                
                // Фильтруем только "Закупочная процедура"
                if (PURCHASE_TYPE.equals(documentType)) {
                    purchaseTypeRowsFound++;
                    logger.debug("Found purchase type row {}: documentType='{}'", row.getRowNum() + 1, documentType);
                    try {
                        Purchase purchase = parsePurchaseRow(row, innerIdColumnIndex, creationDateColumnIndex, cfoColumnIndex, linkColumnIndex);
                        if (purchase == null) {
                            logger.warn("parsePurchaseRow returned null for row {}", row.getRowNum() + 1);
                            parseErrors++;
                            continue;
                        }
                        if (purchase.getInnerId() == null || purchase.getInnerId().trim().isEmpty()) {
                            logger.warn("Inner ID is empty for row {}", row.getRowNum() + 1);
                            emptyInnerId++;
                            continue;
                        }
                        // Проверяем, существует ли закупка с таким innerId
                        Optional<Purchase> existing = purchaseRepository.findByInnerId(purchase.getInnerId().trim());
                        
                        if (existing.isPresent()) {
                            // Обновляем существующую закупку
                            Purchase existingPurchase = existing.get();
                            boolean updated = updatePurchaseFields(existingPurchase, purchase);
                            if (updated) {
                                purchaseRepository.save(existingPurchase);
                                updatedCount++;
                            }
                        } else {
                            // Создаем новую закупку
                            purchaseRepository.save(purchase);
                            createdCount++;
                        }
                        loadedCount++;
                    } catch (Exception e) {
                        logger.warn("Error parsing row {}: {}", row.getRowNum() + 1, e.getMessage(), e);
                        parseErrors++;
                    }
                }
            }
            
            logger.info("Purchase processing summary: found {} rows with type '{}', loaded {}, created {}, updated {}, parse errors {}, empty inner IDs {}", 
                purchaseTypeRowsFound, PURCHASE_TYPE, loadedCount, createdCount, updatedCount, parseErrors, emptyInnerId);

            logger.info("Loaded {} purchases: {} created, {} updated", loadedCount, createdCount, updatedCount);
            return loadedCount;
        } finally {
            workbook.close();
        }
    }

    /**
     * Парсит строку Excel в Purchase для типа "Закупочная процедура"
     * Заполняет innerId из колонки "Внутренний номер" и дату создания из колонки "Дата создания"
     */
    private Purchase parsePurchaseRow(Row row, Integer innerIdColumnIndex, Integer creationDateColumnIndex, Integer cfoColumnIndex, Integer linkColumnIndex) {
        Purchase purchase = new Purchase();
        
        try {
            // Внутренний номер (обязательное поле)
            if (innerIdColumnIndex != null) {
                Cell innerIdCell = row.getCell(innerIdColumnIndex);
                String innerId = getCellValueAsString(innerIdCell);
                if (innerId != null && !innerId.trim().isEmpty()) {
                    purchase.setInnerId(innerId.trim());
                    logger.debug("Parsed innerId for purchase row {}: {}", row.getRowNum() + 1, innerId.trim());
                } else {
                    logger.warn("Row {}: Empty inner ID", row.getRowNum() + 1);
                    return null;
                }
            } else {
                logger.warn("Column '{}' not found for purchase row {}", INNER_ID_COLUMN, row.getRowNum() + 1);
                return null;
            }
            
            // Дата создания (опциональное поле)
            if (creationDateColumnIndex != null) {
                Cell creationDateCell = row.getCell(creationDateColumnIndex);
                LocalDateTime creationDate = parseDateCell(creationDateCell);
                if (creationDate != null) {
                    purchase.setPurchaseCreationDate(creationDate);
                    logger.debug("Parsed creation date for purchase row {}: {}", row.getRowNum() + 1, creationDate);
                } else {
                    String cellValue = creationDateCell != null ? getCellValueAsString(creationDateCell) : "null";
                    logger.debug("Could not parse creation date in purchase row {}: cell value = '{}'", 
                        row.getRowNum() + 1, cellValue);
                }
            }
            
            // ЦФО (опциональное поле)
            if (cfoColumnIndex != null) {
                Cell cfoCell = row.getCell(cfoColumnIndex);
                String cfo = getCellValueAsString(cfoCell);
                if (cfo != null && !cfo.trim().isEmpty()) {
                    purchase.setCfo(cfo.trim());
                    logger.debug("Parsed cfo for purchase row {}: {}", row.getRowNum() + 1, cfo.trim());
                }
            }
            
            // Ссылка (опциональное поле) - парсим purchaseRequestId
            if (linkColumnIndex != null) {
                Cell linkCell = row.getCell(linkColumnIndex);
                String link = getCellValueAsString(linkCell);
                if (link != null && !link.trim().isEmpty()) {
                    Long purchaseRequestId = parsePurchaseRequestIdFromLink(link.trim());
                    if (purchaseRequestId != null) {
                        // Проверяем, существует ли заявка с таким idPurchaseRequest
                        Optional<PurchaseRequest> purchaseRequest = purchaseRequestRepository.findByIdPurchaseRequest(purchaseRequestId);
                        if (purchaseRequest.isPresent()) {
                            // Устанавливаем idPurchaseRequest, а не id (первичный ключ)
                            purchase.setPurchaseRequestId(purchaseRequest.get().getIdPurchaseRequest());
                            logger.debug("Parsed purchaseRequestId for purchase row {}: {} (from link: '{}')", 
                                row.getRowNum() + 1, purchaseRequest.get().getIdPurchaseRequest(), link);
                        } else {
                            logger.debug("Purchase request with idPurchaseRequest={} not found for purchase row {} (link: '{}')", 
                                purchaseRequestId, row.getRowNum() + 1, link);
                        }
                    } else {
                        logger.debug("Could not parse purchaseRequestId from link in purchase row {}: '{}'", 
                            row.getRowNum() + 1, link);
                    }
                }
            } else {
                logger.debug("Column '{}' not found for purchase row {}", LINK_COLUMN, row.getRowNum() + 1);
            }
            
            return purchase;
        } catch (Exception e) {
            logger.error("Error parsing Purchase row {}: {}", row.getRowNum() + 1, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Обновляет поля существующей закупки только если они отличаются
     * Обновляем внутренний номер, дату создания, ЦФО и purchaseRequestId
     */
    private boolean updatePurchaseFields(Purchase existing, Purchase newData) {
        boolean updated = false;
        
        // Обновляем внутренний номер
        if (newData.getInnerId() != null && !newData.getInnerId().trim().isEmpty()) {
            if (existing.getInnerId() == null || !existing.getInnerId().equals(newData.getInnerId())) {
                existing.setInnerId(newData.getInnerId());
                updated = true;
                logger.debug("Updated innerId for purchase {}: {}", existing.getId(), newData.getInnerId());
            }
        }
        
        // Обновляем дату создания
        if (newData.getPurchaseCreationDate() != null) {
            if (existing.getPurchaseCreationDate() == null || !existing.getPurchaseCreationDate().equals(newData.getPurchaseCreationDate())) {
                existing.setPurchaseCreationDate(newData.getPurchaseCreationDate());
                updated = true;
                logger.debug("Updated creation date for purchase {}: {}", existing.getId(), newData.getPurchaseCreationDate());
            }
        }
        
        // Обновляем ЦФО
        if (newData.getCfo() != null && !newData.getCfo().trim().isEmpty()) {
            if (existing.getCfo() == null || !existing.getCfo().equals(newData.getCfo())) {
                existing.setCfo(newData.getCfo());
                updated = true;
                logger.debug("Updated cfo for purchase {}: {}", existing.getId(), newData.getCfo());
            }
        }
        
        // Обновляем purchaseRequestId
        if (newData.getPurchaseRequestId() != null) {
            if (existing.getPurchaseRequestId() == null || !existing.getPurchaseRequestId().equals(newData.getPurchaseRequestId())) {
                existing.setPurchaseRequestId(newData.getPurchaseRequestId());
                updated = true;
                logger.debug("Updated purchaseRequestId for purchase {}: {}", existing.getId(), newData.getPurchaseRequestId());
            }
        }
        
        return updated;
    }
    
    /**
     * Парсит номер заявки на закупку из строки ссылки
     * Формат: "ЗП по заявке: M - Maintenance N 1412 - Курьерские пакеты на 12 месяцев"
     * Извлекает число после "N" (1412 в примере)
     */
    private Long parsePurchaseRequestIdFromLink(String link) {
        if (link == null || link.trim().isEmpty()) {
            return null;
        }
        
        try {
            // Ищем паттерн "N <число>" в строке
            // Используем регулярное выражение для поиска "N" или "N " за которым следует число
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("N\\s+(\\d+)");
            java.util.regex.Matcher matcher = pattern.matcher(link);
            
            if (matcher.find()) {
                String numberStr = matcher.group(1);
                Long id = Long.parseLong(numberStr);
                logger.debug("Extracted purchaseRequestId {} from link: '{}'", id, link);
                return id;
            } else {
                logger.debug("Could not find pattern 'N <number>' in link: '{}'", link);
                return null;
            }
        } catch (Exception e) {
            logger.warn("Error parsing purchaseRequestId from link '{}': {}", link, e.getMessage());
            return null;
        }
    }
}


