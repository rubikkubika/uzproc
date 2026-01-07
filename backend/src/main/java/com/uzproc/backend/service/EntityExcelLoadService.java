package com.uzproc.backend.service;

import com.uzproc.backend.entity.Cfo;
import com.uzproc.backend.entity.Contract;
import com.uzproc.backend.entity.ContractStatus;
import com.uzproc.backend.entity.Purchase;
import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.entity.PurchaseRequestStatus;
import com.uzproc.backend.entity.PurchaseStatus;
import com.uzproc.backend.entity.User;
import com.uzproc.backend.repository.CfoRepository;
import com.uzproc.backend.repository.ContractRepository;
import com.uzproc.backend.repository.PurchaseRepository;
import com.uzproc.backend.repository.PurchaseRequestRepository;
import com.uzproc.backend.repository.UserRepository;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.eventusermodel.ReadOnlySharedStringsTable;
import org.apache.poi.xssf.model.StylesTable;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler;
import org.xml.sax.InputSource;
import org.xml.sax.XMLReader;
import org.xml.sax.helpers.XMLReaderFactory;
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
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
import java.util.Calendar;
import org.springframework.web.multipart.MultipartFile;
import java.io.InputStream;

@Service
public class EntityExcelLoadService {

    private static final Logger logger = LoggerFactory.getLogger(EntityExcelLoadService.class);
    private static final String DOCUMENT_TYPE_COLUMN = "Вид документа";
    private static final String PURCHASE_REQUEST_TYPE = "Заявка на ЗП";
    private static final String PURCHASE_TYPE = "Закупочная процедура";
    private static final String CONTRACT_TYPE = "Договор";
    private static final String DOCUMENT_FORM_COLUMN = "Форма документа";
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
    private static final String STATUS_COLUMN = "Состояние";

    // Оптимизация: статические DateTimeFormatter для парсинга дат (создаются один раз)
    private static final DateTimeFormatter[] DATE_TIME_FORMATTERS = {
        DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss"),
        DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"),
        DateTimeFormatter.ofPattern("dd.MM.yyyy"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd"),
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"),
        DateTimeFormatter.ofPattern("dd/MM/yyyy")
    };
    
    // Оптимизация: предкомпилированные паттерны для парсинга чисел
    private static final java.util.regex.Pattern DIGITS_ONLY_PATTERN = java.util.regex.Pattern.compile("[^0-9]");

    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PurchaseRepository purchaseRepository;
    private final ContractRepository contractRepository;
    private final UserRepository userRepository;
    private final CfoRepository cfoRepository;
    private final DataFormatter dataFormatter = new DataFormatter();

    private final FileProcessingStatsService statsService;
    private final PurchaseRequestStatusUpdateService statusUpdateService;
    private final ContractStatusUpdateService contractStatusUpdateService;
    private final PurchaseStatusUpdateService purchaseStatusUpdateService;

    public EntityExcelLoadService(
            PurchaseRequestRepository purchaseRequestRepository,
            PurchaseRepository purchaseRepository,
            ContractRepository contractRepository,
            UserRepository userRepository,
            CfoRepository cfoRepository,
            FileProcessingStatsService statsService,
            PurchaseRequestStatusUpdateService statusUpdateService,
            ContractStatusUpdateService contractStatusUpdateService,
            PurchaseStatusUpdateService purchaseStatusUpdateService) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.purchaseRepository = purchaseRepository;
        this.contractRepository = contractRepository;
        this.userRepository = userRepository;
        this.cfoRepository = cfoRepository;
        this.statsService = statsService;
        this.statusUpdateService = statusUpdateService;
        this.contractStatusUpdateService = contractStatusUpdateService;
        this.purchaseStatusUpdateService = purchaseStatusUpdateService;
    }
    
    /**
     * Вспомогательный метод для установки Cfo на основе строкового значения
     * Если ЦФО не найдено, создает новое и сохраняет в БД
     */
    private void setCfoFromString(Object entity, String cfoStr) {
        if (cfoStr == null || cfoStr.trim().isEmpty()) {
            return;
        }
        String trimmedCfo = cfoStr.trim();
        
        // Ищем существующее ЦФО
        Cfo cfo = cfoRepository.findByNameIgnoreCase(trimmedCfo).orElse(null);
        
        // Если не найдено, создаем новое
        if (cfo == null) {
            cfo = new Cfo(trimmedCfo);
            cfo = cfoRepository.save(cfo);
            logger.debug("Created new Cfo: {}", trimmedCfo);
        }
        
        // Устанавливаем ЦФО в сущность
        if (entity instanceof PurchaseRequest) {
            ((PurchaseRequest) entity).setCfo(cfo);
        } else if (entity instanceof Purchase) {
            ((Purchase) entity).setCfo(cfo);
        } else if (entity instanceof Contract) {
            ((Contract) entity).setCfo(cfo);
        }
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
                // Загружаем данные из Excel за один проход с оптимизацией
                // Используем loadAllFromExcel вместо отдельных вызовов для избежания повторной обработки файла
                Map<String, Integer> counts = loadAllFromExcel(tempFile.toFile());
                int purchaseRequestsCount = counts.getOrDefault("purchaseRequests", 0);
                int purchasesCount = counts.getOrDefault("purchases", 0);
                int contractsCount = counts.getOrDefault("contracts", 0);
                int usersCount = counts.getOrDefault("users", 0);
                
                int totalCount = purchaseRequestsCount + purchasesCount + contractsCount + usersCount;
                
                response.put("success", true);
                response.put("message", String.format("Успешно загружено: %d заявок, %d закупок, %d договоров, %d пользователей (всего %d записей)", 
                    purchaseRequestsCount, purchasesCount, contractsCount, usersCount, totalCount));
                response.put("loadedCount", totalCount);
                response.put("purchaseRequestsCount", purchaseRequestsCount);
                response.put("purchasesCount", purchasesCount);
                response.put("contractsCount", contractsCount);
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
     * Всегда использует потоковое чтение для .xlsx файлов
     */
    public Map<String, Integer> loadAllFromExcel(File excelFile) throws IOException {
        // Всегда используем потоковое чтение
        if (!excelFile.getName().endsWith(".xlsx")) {
            throw new IllegalArgumentException("Only .xlsx files are supported. File: " + excelFile.getName());
        }

        try {
            logger.info("Using streaming mode for file: {}", excelFile.getName());
            return loadAllFromExcelStreaming(excelFile);
                        } catch (Exception e) {
            logger.error("Streaming mode failed for file {}: {}", excelFile.getName(), e.getMessage(), e);
            throw new IOException("Failed to load Excel file using streaming mode: " + e.getMessage(), e);
                    }
                }
                
    // Удален стандартный метод - используем только потоковое чтение
    @Deprecated
    private Map<String, Integer> loadAllFromExcelStandard(File excelFile) throws IOException {
        throw new UnsupportedOperationException("Standard mode is removed. Use streaming mode only.");
    }
    
    /**
     * Потоковое чтение больших Excel файлов через Event API
     * Не загружает весь файл в память, обрабатывает построчно
     */
    private Map<String, Integer> loadAllFromExcelStreaming(File excelFile) throws Exception {
        logger.info("Starting streaming read of file: {}", excelFile.getName());
        long startTime = System.currentTimeMillis();
        
        OPCPackage pkg = OPCPackage.open(excelFile);
        XSSFReader reader = new XSSFReader(pkg);
        
        try {
            // Получаем таблицу стилей и общие строки
            StylesTable stylesTable = reader.getStylesTable();
            ReadOnlySharedStringsTable sharedStringsTable = new ReadOnlySharedStringsTable(pkg);
            
            // Создаем обработчик строк
            ExcelStreamingRowHandler rowHandler = new ExcelStreamingRowHandler(
                this,
                purchaseRequestRepository,
                purchaseRepository,
                contractRepository,
                userRepository,
                cfoRepository,
                stylesTable,
                sharedStringsTable
            );
            
            // Создаем XML парсер
            XMLReader parser = XMLReaderFactory.createXMLReader();
            XSSFSheetXMLHandler handler = new XSSFSheetXMLHandler(
                stylesTable,
                sharedStringsTable,
                rowHandler,
                new DataFormatter(),
                false
            );
            parser.setContentHandler(handler);
            
            // Обрабатываем первый лист
            Iterator<InputStream> sheets = reader.getSheetsData();
            if (sheets.hasNext()) {
                InputStream sheetInputStream = sheets.next();
                try {
                    InputSource sheetSource = new InputSource(sheetInputStream);
                    parser.parse(sheetSource);
                } finally {
                    sheetInputStream.close();
                }
            }
            
            Map<String, Integer> results = rowHandler.getResults();
            long processingTime = System.currentTimeMillis() - startTime;
            
            logger.info("Streaming read completed: {} purchase requests, {} purchases, {} users", 
                results.get("purchaseRequests"), results.get("purchases"), results.get("users"));
            
            // Записываем статистику
            if (statsService != null) {
                statsService.recordFileProcessing(
                    excelFile.getName(),
                    processingTime,
                    results.getOrDefault("purchaseRequestsCreated", 0),
                    results.getOrDefault("purchaseRequestsUpdated", 0),
                    results.getOrDefault("purchasesCreated", 0),
                    results.getOrDefault("purchasesUpdated", 0),
                    results.getOrDefault("contractsCreated", 0),
                    results.getOrDefault("contractsUpdated", 0),
                    results.getOrDefault("usersCreated", 0),
                    results.getOrDefault("usersUpdated", 0),
                    0, // purchasePlanItemsCreated
                    0  // purchasePlanItemsUpdated
                );
            }
            
            // Обновляем статусы в правильном порядке:
            // 1. Сначала статусы закупок (так как статус заявки зависит от статуса закупки)
            // 2. Затем статусы договоров
            // 3. Затем статусы заявок (которые зависят от статусов закупок и договоров)
            
            if (purchaseStatusUpdateService != null) {
                logger.info("=== Starting status update for all purchases after parsing ===");
                try {
                    purchaseStatusUpdateService.updateAllStatuses();
                    logger.info("=== Purchase status update completed successfully ===");
                } catch (Exception e) {
                    logger.error("=== ERROR during purchase status update after parsing: {} ===", e.getMessage(), e);
                }
            } else {
                logger.warn("=== purchaseStatusUpdateService is NULL, skipping purchase status update ===");
            }
            
            if (contractStatusUpdateService != null) {
                logger.info("Starting status update for all contracts after parsing");
                try {
                    contractStatusUpdateService.updateAllStatuses();
                    logger.info("Contract status update completed successfully");
                } catch (Exception e) {
                    logger.error("Error during contract status update after parsing: {}", e.getMessage(), e);
                }
            }
            
            // Обновляем статусы всех заявок на закупку после парсинга (после обновления статусов закупок и договоров)
            if (statusUpdateService != null) {
                logger.info("Starting status update for all purchase requests after parsing");
                try {
                    statusUpdateService.updateAllStatuses();
                    logger.info("Status update completed successfully");
                } catch (Exception e) {
                    logger.error("Error during status update after parsing: {}", e.getMessage(), e);
                }
            }
            
            return results;
            
        } finally {
            pkg.close();
        }
    }
    
    /**
     * Обрабатывает одну строку заявки на закупку
     */
    private boolean processPurchaseRequestRow(Row row, int requestNumberColumnIndex, int creationDateColumnIndex,
            Integer innerIdColumnIndex, Integer cfoColumnIndex, Integer nameColumnIndex, Integer titleColumnIndex,
            Integer requiresPurchaseColumnIndex, String requiresPurchaseColumnName, Integer planColumnIndex, 
            String planColumnName, Integer preparedByColumnIndex, Integer purchaserColumnIndex, Integer statusColumnIndex) {
        try {
            PurchaseRequest pr = parsePurchaseRequestRow(row, requestNumberColumnIndex, creationDateColumnIndex, 
                innerIdColumnIndex, cfoColumnIndex, nameColumnIndex, titleColumnIndex, 
                requiresPurchaseColumnIndex, requiresPurchaseColumnName, planColumnIndex, planColumnName, 
                preparedByColumnIndex, purchaserColumnIndex, statusColumnIndex);
            if (pr != null && pr.getIdPurchaseRequest() != null) {
                Optional<PurchaseRequest> existing = purchaseRequestRepository.findByIdPurchaseRequest(pr.getIdPurchaseRequest());
                if (existing.isPresent()) {
                    PurchaseRequest existingPr = existing.get();
                    PurchaseRequestStatus oldStatus = existingPr.getStatus();
                    boolean updated = updatePurchaseRequestFields(existingPr, pr);
                    if (updated) {
                        purchaseRequestRepository.save(existingPr);
                        logger.info("Updated purchase request {}: status {} -> {}", existingPr.getIdPurchaseRequest(), oldStatus, existingPr.getStatus());
                    } else {
                        logger.debug("No changes for purchase request {}: status remains {}", existingPr.getIdPurchaseRequest(), existingPr.getStatus());
                    }
                } else {
                    logger.info("Creating new purchase request {} with status: {}", pr.getIdPurchaseRequest(), pr.getStatus());
                    purchaseRequestRepository.save(pr);
                    logger.info("Created purchase request {} with status: {}", pr.getIdPurchaseRequest(), pr.getStatus());
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
    private boolean processContractRow(Row row, Integer innerIdColumnIndex, Integer creationDateColumnIndex, 
            Integer cfoColumnIndex, Integer nameColumnIndex, Integer titleColumnIndex, Integer documentFormColumnIndex, Integer statusColumnIndex) {
        try {
            Contract contract = parseContractRow(row, innerIdColumnIndex, creationDateColumnIndex, cfoColumnIndex, 
                    nameColumnIndex, titleColumnIndex, documentFormColumnIndex, statusColumnIndex);
            if (contract == null) {
                logger.warn("parseContractRow returned null for row {}", row.getRowNum() + 1);
                return false;
            }
            if (contract.getInnerId() == null || contract.getInnerId().trim().isEmpty()) {
                logger.warn("Inner ID is empty for contract row {}", row.getRowNum() + 1);
                return false;
            }
            // Проверяем, существует ли договор с таким innerId
            Optional<Contract> existing = contractRepository.findByInnerId(contract.getInnerId().trim());
            
            if (existing.isPresent()) {
                // Обновляем существующий договор
                Contract existingContract = existing.get();
                boolean updated = updateContractFields(existingContract, contract);
                if (updated) {
                    contractRepository.save(existingContract);
                }
            } else {
                // Создаем новый договор
                contractRepository.save(contract);
            }
            return true;
        } catch (Exception e) {
            logger.warn("Error processing contract row {}: {}", row.getRowNum() + 1, e.getMessage(), e);
            return false;
        }
    }

    private boolean processPurchaseRow(Row row, Integer innerIdColumnIndex, Integer creationDateColumnIndex, Integer cfoColumnIndex, Integer linkColumnIndex, Integer statusColumnIndex) {
        try {
            Purchase purchase = parsePurchaseRow(row, innerIdColumnIndex, creationDateColumnIndex, cfoColumnIndex, linkColumnIndex, statusColumnIndex);
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
     * Использует потоковое чтение для .xlsx файлов
     */
    public int loadPurchaseRequestsFromExcel(File excelFile) throws IOException {
        // Всегда используем потоковое чтение
        if (!excelFile.getName().endsWith(".xlsx")) {
            throw new IllegalArgumentException("Only .xlsx files are supported. File: " + excelFile.getName());
        }
        
            try {
                Map<String, Integer> results = loadAllFromExcelStreaming(excelFile);
                return results.getOrDefault("purchaseRequests", 0);
            } catch (Exception e) {
            logger.error("Streaming mode failed for file {}: {}", excelFile.getName(), e.getMessage(), e);
            throw new IOException("Failed to load purchase requests using streaming mode: " + e.getMessage(), e);
            }
        }
        
    // Удален стандартный метод - используем только потоковое чтение
    @Deprecated
    private int loadPurchaseRequestsFromExcelStandard(File excelFile) throws IOException {
        throw new UnsupportedOperationException("Standard mode is removed. Use streaming mode only.");
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
        if (newData.getCfo() != null) {
            Cfo newCfo = newData.getCfo();
            if (existing.getCfo() == null || !newCfo.getId().equals(existing.getCfo().getId())) {
                existing.setCfo(newCfo);
                updated = true;
                logger.debug("Updated cfo for request {}: {}", existing.getIdPurchaseRequest(), newCfo.getName());
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
        
        // Обновляем статус только если он отличается
        if (newData.getStatus() != null) {
            if (existing.getStatus() == null || !existing.getStatus().equals(newData.getStatus())) {
                PurchaseRequestStatus oldStatus = existing.getStatus();
                existing.setStatus(newData.getStatus());
                updated = true;
                logger.info("Updated status for request {}: {} -> {}", existing.getIdPurchaseRequest(), oldStatus, newData.getStatus());
            } else {
                logger.debug("Status for request {} unchanged: {}", existing.getIdPurchaseRequest(), existing.getStatus());
            }
        } else {
            logger.debug("New data status is null, skipping status update for request {}", existing.getIdPurchaseRequest());
        }
        
        return updated;
    }

    /**
     * Парсит строку Excel в PurchaseRequest для типа "Заявка на ЗП"
     * Загружает "Номер заявки на ЗП", "Дата создания", "Внутренний номер", "ЦФО", "Наименование", "Заголовок", "Требуется Закупка", "План", "Подготовил", "Ответственный за ЗП (Закупочная процедура)" и "Состояние"
     */
    private PurchaseRequest parsePurchaseRequestRow(Row row, int requestNumberColumnIndex, int creationDateColumnIndex, Integer innerIdColumnIndex, Integer cfoColumnIndex, Integer nameColumnIndex, Integer titleColumnIndex, Integer requiresPurchaseColumnIndex, String requiresPurchaseColumnName, Integer planColumnIndex, String planColumnName, Integer preparedByColumnIndex, Integer purchaserColumnIndex, Integer statusColumnIndex) {
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
                String cfoStr = getCellValueAsString(cfoCell);
                if (cfoStr != null && !cfoStr.trim().isEmpty()) {
                    setCfoFromString(pr, cfoStr);
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
                    logger.debug("Row {}: parsed purchaser: '{}'", row.getRowNum() + 1, purchaser.trim());
                } else {
                    logger.debug("Row {}: purchaser cell is empty or null", row.getRowNum() + 1);
                }
            } else {
                logger.debug("Row {}: purchaserColumnIndex is null, skipping purchaser field", row.getRowNum() + 1);
            }
            
            // Состояние (опционально) - парсим поле "Состояние" в поле state
            if (statusColumnIndex != null) {
                Cell statusCell = row.getCell(statusColumnIndex);
                String statusValue = getCellValueAsString(statusCell);
                if (statusValue != null && !statusValue.trim().isEmpty()) {
                    String trimmedStatus = statusValue.trim();
                    // Сохраняем значение из колонки "Состояние" в поле state
                    pr.setState(trimmedStatus);
                    logger.info("Row {}: parsed state value: '{}' and saved to state field for request {}", row.getRowNum() + 1, trimmedStatus, pr.getIdPurchaseRequest());
                    // Если "Состояние" = "Проект" (case-insensitive), то устанавливаем статус = PROJECT
                    if ("Проект".equalsIgnoreCase(trimmedStatus)) {
                        pr.setStatus(PurchaseRequestStatus.PROJECT);
                        logger.info("Row {}: parsed state '{}', set status to PROJECT for request {}", row.getRowNum() + 1, trimmedStatus, pr.getIdPurchaseRequest());
                    } else {
                        logger.debug("Row {}: state value '{}' is not 'Проект' (case-insensitive), skipping status update", row.getRowNum() + 1, trimmedStatus);
                    }
                } else {
                    logger.debug("Row {}: status cell is empty or null", row.getRowNum() + 1);
                }
            } else {
                logger.debug("Row {}: statusColumnIndex is null, skipping state field", row.getRowNum() + 1);
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
    /**
     * Быстрая проверка, относится ли дата в ячейке к текущему году
     * Оптимизирован для проверки года без полного парсинга даты
     */
    /**
     * Оптимизированная проверка года из ячейки даты
     * Использует быстрые пути для наиболее частых форматов
     */
    private boolean isCurrentYear(Cell dateCell, int currentYear) {
        if (dateCell == null) {
            return false;
        }
        
        CellType cellType = dateCell.getCellType();
        
        // Быстрый путь для дат в формате Excel (NUMERIC + DateFormatted)
        if (cellType == CellType.NUMERIC) {
            try {
                if (DateUtil.isCellDateFormatted(dateCell)) {
                    Date date = dateCell.getDateCellValue();
                    Calendar cal = Calendar.getInstance();
                    cal.setTime(date);
                    return cal.get(Calendar.YEAR) == currentYear;
                }
            } catch (Exception e) {
                // Fallback на полный парсинг ниже
            }
        }
        
        // Для строк - быстрая проверка по содержимому года
        if (cellType == CellType.STRING) {
            String dateStr = getCellValueAsString(dateCell);
            if (dateStr != null && dateStr.length() >= 4) {
                // Быстрая проверка: строка содержит текущий год
                if (dateStr.contains(String.valueOf(currentYear))) {
                    return true;
                }
                // Строка не содержит текущий год - точно не текущий год
                return false;
            }
        }
        
        // Fallback на полный парсинг (для формул и других случаев)
        LocalDateTime creationDate = parseDateCell(dateCell);
        return creationDate != null && creationDate.getYear() == currentYear;
    }

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
     * Оптимизировано: использует статические DateTimeFormatter вместо создания новых
     */
    private LocalDateTime parseStringDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }
        
        dateStr = dateStr.trim();
        
        // Используем предварительно созданные статические форматтеры
        for (int i = 0; i < DATE_TIME_FORMATTERS.length; i++) {
            DateTimeFormatter formatter = DATE_TIME_FORMATTERS[i];
            try {
                // Форматтеры с индексами 0, 3, 6 содержат время (HH:mm:ss)
                if (i == 0 || i == 3 || i == 6) {
                    return LocalDateTime.parse(dateStr, formatter);
                } else {
                    LocalDate date = LocalDate.parse(dateStr, formatter);
                    return date.atStartOfDay();
                }
            } catch (Exception e) {
                // Пробуем следующий формат
            }
        }
        
        // Пробуем ISO форматы как fallback
        try {
            return LocalDateTime.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (Exception e) {
            // ignore
        }
        try {
            return LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE).atStartOfDay();
        } catch (Exception e) {
            // ignore
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
     * Ищет ПЕРВУЮ колонку с таким названием (не перезаписывает при дубликатах)
     */
    private Integer findColumnIndex(Map<String, Integer> columnIndexMap, String columnName) {
        // Используем старый метод для обратной совместимости
        return findColumnIndexInMap(columnIndexMap, columnName);
    }
    
    /**
     * Находит индекс колонки напрямую в заголовке, возвращая ПЕРВУЮ найденную колонку
     * Это гарантирует, что при наличии дубликатов названий будет использована первая колонка
     */
    private Integer findColumnIndexInHeader(Row headerRow, String columnName) {
        if (headerRow == null) {
            return null;
        }
        
        // Получаем байты исходной строки в разных кодировках для сравнения
        byte[] columnNameBytesUtf8 = columnName.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        byte[] columnNameBytesCp1251 = null;
        try {
            columnNameBytesCp1251 = columnName.getBytes("Windows-1251");
        } catch (java.io.UnsupportedEncodingException e) {
            // Игнорируем
        }
        
        String normalizedColumnName = normalizeString(columnName);
        String[] keywords = extractKeywords(columnName);
        
        // Проходим по всем колонкам в порядке их появления (слева направо)
        for (int i = 0; i < headerRow.getLastCellNum(); i++) {
            Cell cell = headerRow.getCell(i);
            if (cell == null) {
                continue;
            }
            
            String headerValue = getCellValueAsString(cell);
            if (headerValue == null || headerValue.trim().isEmpty()) {
                continue;
            }
            
            String trimmed = headerValue.trim();
            
            // 1. Точное совпадение
            if (trimmed.equals(columnName)) {
                logger.info("Found column '{}' by exact match at index {}: '{}'", columnName, i, trimmed);
                return i;
            }
            
            // 2. Байтовое совпадение (для работы с проблемами кодировки)
            byte[] trimmedBytesUtf8 = trimmed.getBytes(java.nio.charset.StandardCharsets.UTF_8);
            if (java.util.Arrays.equals(columnNameBytesUtf8, trimmedBytesUtf8)) {
                logger.info("Found column '{}' by byte match (UTF-8) at index {}: '{}'", columnName, i, trimmed);
                return i;
            }
            
            if (columnNameBytesCp1251 != null) {
                try {
                    byte[] trimmedBytesCp1251 = trimmed.getBytes("Windows-1251");
                    if (java.util.Arrays.equals(columnNameBytesCp1251, trimmedBytesCp1251)) {
                        logger.info("Found column '{}' by byte match (CP1251) at index {}: '{}'", columnName, i, trimmed);
                        return i;
                    }
                } catch (java.io.UnsupportedEncodingException e) {
                    // Игнорируем
                }
            }
            
            // 3. Нормализованное сравнение
            String normalizedTrimmed = normalizeString(trimmed);
            if (normalizedTrimmed.equals(normalizedColumnName)) {
                logger.info("Found column '{}' by normalized match at index {}: '{}'", columnName, i, trimmed);
                return i;
            }
            
            // 4. По ключевым словам
            boolean matches = true;
            for (String keyword : keywords) {
                if (keyword.length() > 2 && !normalizedTrimmed.contains(normalizeString(keyword))) {
                    matches = false;
                    break;
                }
            }
            if (matches && keywords.length > 0) {
                logger.info("Found column '{}' by keyword match at index {}: '{}'", columnName, i, trimmed);
                return i;
            }
            
            // 5. Частичное совпадение (без учета регистра и пробелов)
            String lowerTrimmed = trimmed.toLowerCase();
            String lowerColumnName = columnName.toLowerCase();
            if (lowerTrimmed.contains(lowerColumnName) || lowerColumnName.contains(lowerTrimmed) ||
                normalizedTrimmed.contains(normalizedColumnName) || 
                normalizedColumnName.contains(normalizedTrimmed)) {
                logger.info("Found column '{}' by partial match at index {}: '{}'", columnName, i, trimmed);
                return i;
            }
        }
        
        return null;
    }
    
    /**
     * Находит индекс колонки в Map (старый метод для обратной совместимости)
     */
    private Integer findColumnIndexInMap(Map<String, Integer> columnIndexMap, String columnName) {
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
    /**
     * Парсит и сохраняет пользователя из строки "Подготовил"
     * Доступен для использования в других классах (например, ExcelStreamingRowHandler)
     */
    public void parseAndSaveUser(String preparedByValue) {
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
    /**
     * Оптимизированная проверка на пустую строку
     * Использует быструю проверку типа ячейки без полного парсинга содержимого
     */
    private boolean isRowEmpty(Row row) {
        if (row == null) {
            return true;
        }
        
        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell == null) {
                continue;
            }
            
            CellType type = cell.getCellType();
            
            // Пропускаем пустые ячейки
            if (type == CellType.BLANK) {
                continue;
            }
            
            // Для числовых и булевых - строка точно не пустая
            if (type == CellType.NUMERIC || type == CellType.BOOLEAN) {
                return false;
            }
            
            // Для строк - быстрая проверка без полного форматирования
            if (type == CellType.STRING) {
                try {
                    String value = cell.getStringCellValue();
                    if (value != null && !value.trim().isEmpty()) {
                        return false;
                    }
                } catch (Exception e) {
                    // Fallback на полный парсинг
                    String value = getCellValueAsString(cell);
                    if (value != null && !value.trim().isEmpty()) {
                        return false;
                    }
                }
            }
            
            // Для формул - проверяем результат
            if (type == CellType.FORMULA) {
                try {
                    CellType cachedType = cell.getCachedFormulaResultType();
                    if (cachedType == CellType.NUMERIC || cachedType == CellType.BOOLEAN) {
                        return false;
                    }
                    if (cachedType == CellType.STRING) {
                        String value = cell.getStringCellValue();
                        if (value != null && !value.trim().isEmpty()) {
                            return false;
                        }
                    }
                } catch (Exception e) {
                    // ignore
                }
            }
        }
        return true;
    }

    /**
     * Загружает пользователей из Excel файла
     * Парсит поле "Подготовил" и создает/обновляет пользователей
     * Использует потоковое чтение для .xlsx файлов
     */
    public int loadUsersFromExcel(File excelFile) throws IOException {
        // Всегда используем потоковое чтение
        if (!excelFile.getName().endsWith(".xlsx")) {
            throw new IllegalArgumentException("Only .xlsx files are supported. File: " + excelFile.getName());
        }
        
            try {
                Map<String, Integer> results = loadAllFromExcelStreaming(excelFile);
                return results.getOrDefault("users", 0);
            } catch (Exception e) {
            logger.error("Streaming mode failed for file {}: {}", excelFile.getName(), e.getMessage(), e);
            throw new IOException("Failed to load users using streaming mode: " + e.getMessage(), e);
            }
                }
                
    // Удален стандартный метод - используем только потоковое чтение
    @Deprecated
    private int loadUsersFromExcelStandard(File excelFile) throws IOException {
        throw new UnsupportedOperationException("Standard mode is removed. Use streaming mode only.");
    }

    /**
     * Загружает закупки из Excel файла
     * Фильтрует по "Вид документа" = "Закупочная процедура"
     * Использует потоковое чтение для .xlsx файлов
     */
    public int loadPurchasesFromExcel(File excelFile) throws IOException {
        // Всегда используем потоковое чтение
        if (!excelFile.getName().endsWith(".xlsx")) {
            throw new IllegalArgumentException("Only .xlsx files are supported. File: " + excelFile.getName());
        }
        
            try {
                Map<String, Integer> results = loadAllFromExcelStreaming(excelFile);
                return results.getOrDefault("purchases", 0);
            } catch (Exception e) {
            logger.error("Streaming mode failed for file {}: {}", excelFile.getName(), e.getMessage(), e);
            throw new IOException("Failed to load purchases using streaming mode: " + e.getMessage(), e);
            }
        }
        
    // Удален стандартный метод - используем только потоковое чтение
    @Deprecated
    private int loadPurchasesFromExcelStandard(File excelFile) throws IOException {
        throw new UnsupportedOperationException("Standard mode is removed. Use streaming mode only.");
    }

    /**
     * Парсит строку Excel в Purchase для типа "Закупочная процедура"
     * Заполняет innerId из колонки "Внутренний номер" и дату создания из колонки "Дата создания"
     */
    private Purchase parsePurchaseRow(Row row, Integer innerIdColumnIndex, Integer creationDateColumnIndex, Integer cfoColumnIndex, Integer linkColumnIndex, Integer statusColumnIndex) {
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
                String cfoStr = getCellValueAsString(cfoCell);
                if (cfoStr != null && !cfoStr.trim().isEmpty()) {
                    setCfoFromString(purchase, cfoStr);
                    logger.debug("Parsed cfo for purchase row {}: {}", row.getRowNum() + 1, cfoStr.trim());
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
            
            // Состояние (опционально) - парсим поле "Состояние" в поле state
            if (statusColumnIndex != null) {
                Cell statusCell = row.getCell(statusColumnIndex);
                String statusValue = getCellValueAsString(statusCell);
                if (statusValue != null && !statusValue.trim().isEmpty()) {
                    String trimmedStatus = statusValue.trim();
                    // Сохраняем значение из колонки "Состояние" в поле state
                    purchase.setState(trimmedStatus);
                    logger.info("Row {}: parsed state value: '{}' and saved to state field for purchase {}", row.getRowNum() + 1, trimmedStatus, purchase.getInnerId());
                    // Если "Состояние" = "Проект" (case-insensitive), то устанавливаем статус = PROJECT
                    if ("Проект".equalsIgnoreCase(trimmedStatus)) {
                        purchase.setStatus(PurchaseStatus.PROJECT);
                        logger.info("Row {}: parsed state '{}', set status to PROJECT for purchase {}", row.getRowNum() + 1, trimmedStatus, purchase.getInnerId());
                    } else {
                        logger.debug("Row {}: state value '{}' is not 'Проект' (case-insensitive), skipping status update", row.getRowNum() + 1, trimmedStatus);
                    }
                } else {
                    logger.debug("Row {}: status cell is empty or null", row.getRowNum() + 1);
                }
            } else {
                logger.debug("Row {}: statusColumnIndex is null, skipping state field", row.getRowNum() + 1);
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
        if (newData.getCfo() != null) {
            Cfo newCfo = newData.getCfo();
            if (existing.getCfo() == null || !newCfo.getId().equals(existing.getCfo().getId())) {
                existing.setCfo(newCfo);
                updated = true;
                logger.debug("Updated cfo for purchase {}: {}", existing.getId(), newCfo.getName());
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
        
        // Обновляем state
        if (newData.getState() != null && !newData.getState().trim().isEmpty()) {
            if (existing.getState() == null || !existing.getState().equals(newData.getState())) {
                existing.setState(newData.getState());
                updated = true;
                logger.debug("Updated state for purchase {}: {}", existing.getId(), newData.getState());
            }
        }
        
        // Обновляем status (если state = "Проект")
        if (newData.getStatus() != null) {
            if (existing.getStatus() == null || !existing.getStatus().equals(newData.getStatus())) {
                existing.setStatus(newData.getStatus());
                updated = true;
                logger.debug("Updated status for purchase {}: {}", existing.getId(), newData.getStatus());
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

    /**
     * Загружает договоры из Excel файла
     * Фильтрует по "Вид документа" = "Договор"
     * Использует потоковое чтение для .xlsx файлов
     */
    public int loadContractsFromExcel(File excelFile) throws IOException {
        // Всегда используем потоковое чтение
        if (!excelFile.getName().endsWith(".xlsx")) {
            throw new IllegalArgumentException("Only .xlsx files are supported. File: " + excelFile.getName());
        }
        
            try {
                Map<String, Integer> results = loadAllFromExcelStreaming(excelFile);
                return results.getOrDefault("contracts", 0);
            } catch (Exception e) {
            logger.error("Streaming mode failed for file {}: {}", excelFile.getName(), e.getMessage(), e);
            throw new IOException("Failed to load contracts using streaming mode: " + e.getMessage(), e);
            }
                }

    // Удален стандартный метод - используем только потоковое чтение
    @Deprecated
    private int loadContractsFromExcelStandard(File excelFile) throws IOException {
        throw new UnsupportedOperationException("Standard mode is removed. Use streaming mode only.");
    }

    /**
     * Парсит строку Excel в Contract для типа "Договор"
     * Заполняет innerId из колонки "Внутренний номер", дату создания из колонки "Дата создания",
     * форму документа из колонки "Форма документа" и другие поля
     */
    private Contract parseContractRow(Row row, Integer innerIdColumnIndex, Integer creationDateColumnIndex, 
            Integer cfoColumnIndex, Integer nameColumnIndex, Integer titleColumnIndex, Integer documentFormColumnIndex, Integer statusColumnIndex) {
        Contract contract = new Contract();
        
        try {
            // Внутренний номер (обязательное поле)
            if (innerIdColumnIndex != null) {
                Cell innerIdCell = row.getCell(innerIdColumnIndex);
                String innerId = getCellValueAsString(innerIdCell);
                if (innerId != null && !innerId.trim().isEmpty()) {
                    contract.setInnerId(innerId.trim());
                    logger.debug("Parsed innerId for contract row {}: {}", row.getRowNum() + 1, innerId.trim());
                } else {
                    logger.warn("Row {}: Empty inner ID", row.getRowNum() + 1);
                    return null;
                }
            } else {
                logger.warn("Column '{}' not found for contract row {}", INNER_ID_COLUMN, row.getRowNum() + 1);
                return null;
            }
            
            // Дата создания (опциональное поле)
            if (creationDateColumnIndex != null) {
                Cell creationDateCell = row.getCell(creationDateColumnIndex);
                LocalDateTime creationDate = parseDateCell(creationDateCell);
                if (creationDate != null) {
                    contract.setContractCreationDate(creationDate);
                    logger.debug("Parsed creation date for contract row {}: {}", row.getRowNum() + 1, creationDate);
                } else {
                    String cellValue = creationDateCell != null ? getCellValueAsString(creationDateCell) : "null";
                    logger.debug("Could not parse creation date in contract row {}: cell value = '{}'", 
                        row.getRowNum() + 1, cellValue);
                }
            }
            
            // ЦФО (опциональное поле)
            if (cfoColumnIndex != null) {
                Cell cfoCell = row.getCell(cfoColumnIndex);
                String cfoStr = getCellValueAsString(cfoCell);
                if (cfoStr != null && !cfoStr.trim().isEmpty()) {
                    setCfoFromString(contract, cfoStr);
                    logger.debug("Parsed cfo for contract row {}: {}", row.getRowNum() + 1, cfoStr.trim());
                }
            }
            
            // Наименование (опциональное поле)
            if (nameColumnIndex != null) {
                Cell nameCell = row.getCell(nameColumnIndex);
                String name = getCellValueAsString(nameCell);
                if (name != null && !name.trim().isEmpty()) {
                    contract.setName(name.trim());
                    logger.debug("Parsed name for contract row {}: {}", row.getRowNum() + 1, name.trim());
                }
            }
            
            // Заголовок (опциональное поле)
            if (titleColumnIndex != null) {
                Cell titleCell = row.getCell(titleColumnIndex);
                String title = getCellValueAsString(titleCell);
                if (title != null && !title.trim().isEmpty()) {
                    contract.setTitle(title.trim());
                    logger.debug("Parsed title for contract row {}: {}", row.getRowNum() + 1, title.trim());
                }
            }
            
            // Форма документа (опциональное поле)
            if (documentFormColumnIndex != null) {
                Cell documentFormCell = row.getCell(documentFormColumnIndex);
                String documentForm = getCellValueAsString(documentFormCell);
                if (documentForm != null && !documentForm.trim().isEmpty()) {
                    contract.setDocumentForm(documentForm.trim());
                    logger.debug("Parsed documentForm for contract row {}: {}", row.getRowNum() + 1, documentForm.trim());
                }
            } else {
                logger.debug("Column '{}' not found for contract row {}", DOCUMENT_FORM_COLUMN, row.getRowNum() + 1);
            }
            
            // Состояние (опционально) - парсим поле "Состояние" в поле state
            if (statusColumnIndex != null) {
                Cell statusCell = row.getCell(statusColumnIndex);
                String statusValue = getCellValueAsString(statusCell);
                if (statusValue != null && !statusValue.trim().isEmpty()) {
                    String trimmedStatus = statusValue.trim();
                    // Сохраняем значение из колонки "Состояние" в поле state
                    contract.setState(trimmedStatus);
                    logger.info("Row {}: parsed state value: '{}' and saved to state field for contract {}", row.getRowNum() + 1, trimmedStatus, contract.getInnerId());
                    // Если "Состояние" = "Проект" (case-insensitive), то устанавливаем статус = PROJECT
                    if ("Проект".equalsIgnoreCase(trimmedStatus)) {
                        contract.setStatus(ContractStatus.PROJECT);
                        logger.info("Row {}: parsed state '{}', set status to PROJECT for contract {}", row.getRowNum() + 1, trimmedStatus, contract.getInnerId());
                    } else {
                        logger.debug("Row {}: state value '{}' is not 'Проект' (case-insensitive), skipping status update", row.getRowNum() + 1, trimmedStatus);
                    }
                } else {
                    logger.debug("Row {}: status cell is empty or null", row.getRowNum() + 1);
                }
            } else {
                logger.debug("Row {}: statusColumnIndex is null, skipping state field", row.getRowNum() + 1);
            }
            
            return contract;
        } catch (Exception e) {
            logger.error("Error parsing Contract row {}: {}", row.getRowNum() + 1, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Обновляет поля существующего договора только если они отличаются
     * Обновляет внутренний номер, дату создания, ЦФО, наименование, заголовок и форму документа
     */
    private boolean updateContractFields(Contract existing, Contract newData) {
        boolean updated = false;
        
        // Обновляем внутренний номер
        if (newData.getInnerId() != null && !newData.getInnerId().trim().isEmpty()) {
            if (existing.getInnerId() == null || !existing.getInnerId().equals(newData.getInnerId())) {
                existing.setInnerId(newData.getInnerId());
                updated = true;
                logger.debug("Updated innerId for contract {}: {}", existing.getId(), newData.getInnerId());
            }
        }
        
        // Обновляем дату создания
        if (newData.getContractCreationDate() != null) {
            if (existing.getContractCreationDate() == null || !existing.getContractCreationDate().equals(newData.getContractCreationDate())) {
                existing.setContractCreationDate(newData.getContractCreationDate());
                updated = true;
                logger.debug("Updated creation date for contract {}: {}", existing.getId(), newData.getContractCreationDate());
            }
        }
        
        // Обновляем ЦФО
        if (newData.getCfo() != null) {
            Cfo newCfo = newData.getCfo();
            if (existing.getCfo() == null || !newCfo.getId().equals(existing.getCfo().getId())) {
                existing.setCfo(newCfo);
                updated = true;
                logger.debug("Updated cfo for contract {}: {}", existing.getId(), newCfo.getName());
            }
        }
        
        // Обновляем наименование
        if (newData.getName() != null && !newData.getName().trim().isEmpty()) {
            if (existing.getName() == null || !existing.getName().equals(newData.getName())) {
                existing.setName(newData.getName());
                updated = true;
                logger.debug("Updated name for contract {}: {}", existing.getId(), newData.getName());
            }
        }
        
        // Обновляем заголовок
        if (newData.getTitle() != null && !newData.getTitle().trim().isEmpty()) {
            if (existing.getTitle() == null || !existing.getTitle().equals(newData.getTitle())) {
                existing.setTitle(newData.getTitle());
                updated = true;
                logger.debug("Updated title for contract {}: {}", existing.getId(), newData.getTitle());
            }
        }
        
        // Обновляем форму документа
        if (newData.getDocumentForm() != null && !newData.getDocumentForm().trim().isEmpty()) {
            if (existing.getDocumentForm() == null || !existing.getDocumentForm().equals(newData.getDocumentForm())) {
                existing.setDocumentForm(newData.getDocumentForm());
                updated = true;
                logger.debug("Updated documentForm for contract {}: {}", existing.getId(), newData.getDocumentForm());
            }
        }
        
        // Обновляем state - всегда обновляем, если есть новое значение из Excel
        if (newData.getState() != null && !newData.getState().trim().isEmpty()) {
            String newStateTrimmed = newData.getState().trim();
            String existingStateTrimmed = existing.getState() != null ? existing.getState().trim() : null;
            existing.setState(newStateTrimmed);
            updated = true;
            if (existingStateTrimmed == null || !existingStateTrimmed.equals(newStateTrimmed)) {
                logger.info("Updated state for contract {} (innerId: {}): '{}' -> '{}'", 
                    existing.getId(), existing.getInnerId(), existingStateTrimmed, newStateTrimmed);
            } else {
                logger.info("Updated state for contract {} (innerId: {}): '{}' (forced update)", 
                    existing.getId(), existing.getInnerId(), newStateTrimmed);
            }
        }
        
        // Обновляем status (если state = "Проект")
        if (newData.getStatus() != null) {
            if (existing.getStatus() == null || !existing.getStatus().equals(newData.getStatus())) {
                existing.setStatus(newData.getStatus());
                updated = true;
                logger.debug("Updated status for contract {}: {}", existing.getId(), newData.getStatus());
            }
        }
        
        return updated;
    }
}




