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
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.xssf.eventusermodel.ReadOnlySharedStringsTable;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler;
import org.apache.poi.xssf.model.StylesTable;
import org.apache.poi.xssf.usermodel.XSSFComment;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.xml.sax.SAXException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Обработчик строк для потокового чтения больших Excel файлов через Event API
 */
public class ExcelStreamingRowHandler implements XSSFSheetXMLHandler.SheetContentsHandler {
    
    private static final Logger logger = LoggerFactory.getLogger(ExcelStreamingRowHandler.class);
    
    private final EntityExcelLoadService excelLoadService;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PurchaseRepository purchaseRepository;
    private final ContractRepository contractRepository;
    private final UserRepository userRepository;
    private final CfoRepository cfoRepository;
    private final DataFormatter dataFormatter;
    
    // Кеш ЦФО для оптимизации (загружается один раз в начале)
    private final Map<String, Cfo> cfoCache = new HashMap<>();
    
    // Batch-списки для накопления сущностей перед сохранением
    private final List<PurchaseRequest> purchaseRequestBatch = new ArrayList<>();
    private final List<Purchase> purchaseBatch = new ArrayList<>();
    private final List<Contract> contractBatch = new ArrayList<>();
    private final List<Cfo> newCfoBatch = new ArrayList<>();
    private static final int BATCH_SIZE = 100; // Размер пакета для batch-операций
    
    // Индексы колонок (определяются из заголовка)
    private Map<String, Integer> columnIndices = new HashMap<>();
    private boolean headerProcessed = false;
    private int currentRowNum = -1;
    private Map<Integer, String> currentRowData = new HashMap<>();
    
    // Счетчики
    private int purchaseRequestsCount = 0;
    private int purchasesCount = 0;
    private int contractsCount = 0;
    private int usersCount = 0;
    private int purchaseRequestsCreated = 0;
    private int purchaseRequestsUpdated = 0;
    private int purchasesCreated = 0;
    private int purchasesUpdated = 0;
    private int contractsCreated = 0;
    private int contractsUpdated = 0;
    private int usersCreated = 0;
    private int usersUpdated = 0;
    
    // Константы
    private static final String DOCUMENT_TYPE_COLUMN = "Вид документа";
    private static final String PURCHASE_REQUEST_TYPE = "Заявка на ЗП";
    private static final String PURCHASE_TYPE = "Закупочная процедура";
    private static final String CONTRACT_TYPE = "Договор";
    private static final String REQUEST_NUMBER_COLUMN = "Номер заявки на ЗП";
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
    private static final String DOCUMENT_FORM_COLUMN = "Форма документа";
    private static final String STATUS_COLUMN = "Состояние";
    private static final String AMOUNT_COLUMN = "Сумма";
    private static final String CURRENCY_COLUMN = "Валюта";
    private static final String MAIN_CONTRACT_COLUMN = "Основной договор";
    private static final String SPECIFICATION_FORM = "Спецификация";
    private static final String EXPENSE_ITEM_COLUMN = "Статья бюджета (PL) (Заявка на ЗП)";
    private static final String CONTRACT_INNER_ID_COLUMN = "Договор.Внутренний номер";
    private static final String MCC_COLUMN = "Способ закупки (Заявка на ЗП)";
    private static final String PLANNED_DELIVERY_START_DATE_COLUMN = "Плановая дата начала поставки (Заявка на ЗП)";
    private static final String PLANNED_DELIVERY_END_DATE_COLUMN = "Плановая дата окончания поставки (Заявка на ЗП)";
    
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
    
    // Названия колонок для проверки инвертированной логики
    private String requiresPurchaseColumnName = null;
    private String planColumnName = null;
    
    public ExcelStreamingRowHandler(
            EntityExcelLoadService excelLoadService,
            PurchaseRequestRepository purchaseRequestRepository,
            PurchaseRepository purchaseRepository,
            ContractRepository contractRepository,
            UserRepository userRepository,
            CfoRepository cfoRepository,
            StylesTable stylesTable,
            ReadOnlySharedStringsTable sharedStringsTable) {
        this.excelLoadService = excelLoadService;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.purchaseRepository = purchaseRepository;
        this.contractRepository = contractRepository;
        this.userRepository = userRepository;
        this.cfoRepository = cfoRepository;
        this.dataFormatter = new DataFormatter();
        
        // Загружаем все ЦФО в кеш один раз при создании обработчика
        loadCfoCache();
    }
    
    /**
     * Загружает все ЦФО в кеш для быстрого доступа
     */
    private void loadCfoCache() {
        try {
            List<Cfo> allCfos = cfoRepository.findAll();
            for (Cfo cfo : allCfos) {
                cfoCache.put(cfo.getName().toLowerCase().trim(), cfo);
            }
            logger.info("Loaded {} CFOs into cache", cfoCache.size());
        } catch (Exception e) {
            logger.warn("Error loading CFO cache: {}", e.getMessage());
        }
    }
    
    /**
     * Вспомогательный метод для установки Cfo на основе строкового значения
     * Использует кеш для быстрого поиска. Если ЦФО не найдено, добавляет в batch для создания
     */
    private void setCfoFromString(Object entity, String cfoStr) {
        if (cfoStr == null || cfoStr.trim().isEmpty()) {
            return;
        }
        String trimmedCfo = cfoStr.trim();
        String cacheKey = trimmedCfo.toLowerCase();
        
        // Ищем в кеше
        Cfo cfo = cfoCache.get(cacheKey);
        
        // Если не найдено в кеше, создаем новое и добавляем в batch
        if (cfo == null) {
            cfo = new Cfo(trimmedCfo);
            cfoCache.put(cacheKey, cfo); // Добавляем в кеш сразу
            newCfoBatch.add(cfo); // Добавляем в batch для сохранения
            logger.debug("Queued new Cfo for batch save: {}", trimmedCfo);
            
            // Сохраняем batch если он заполнен
            if (newCfoBatch.size() >= BATCH_SIZE) {
                flushCfoBatch();
            }
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
     * Сохраняет накопленные ЦФО пакетом
     */
    private void flushCfoBatch() {
        if (!newCfoBatch.isEmpty()) {
            try {
                List<Cfo> saved = cfoRepository.saveAll(newCfoBatch);
                // Обновляем кеш с сохраненными ЦФО (на случай если были изменения ID)
                for (Cfo savedCfo : saved) {
                    cfoCache.put(savedCfo.getName().toLowerCase().trim(), savedCfo);
                }
                logger.debug("Flushed {} CFOs to database", saved.size());
                newCfoBatch.clear();
            } catch (Exception e) {
                logger.error("Error flushing CFO batch: {}", e.getMessage(), e);
            }
        }
    }
    
    @Override
    public void startRow(int rowNum) {
        currentRowNum = rowNum;
        currentRowData.clear();
    }
    
    @Override
    public void cell(String cellReference, String formattedValue, XSSFComment comment) {
        // Извлекаем номер колонки из ссылки (например, "A1" -> 0, "B1" -> 1)
        int columnIndex = getColumnIndex(cellReference);
        currentRowData.put(columnIndex, formattedValue);
    }
    
    @Override
    public void endRow(int rowNum) {
        if (rowNum == 0) {
            // Первая строка - заголовки
            processHeaderRow();
        } else if (headerProcessed) {
            // Обрабатываем строку данных
            processDataRow();
        }
        currentRowData.clear();
    }
    
    private void processHeaderRow() {
        // Строим карту индексов колонок из заголовков
        for (Map.Entry<Integer, String> entry : currentRowData.entrySet()) {
            if (entry.getValue() != null && !entry.getValue().trim().isEmpty()) {
                String headerName = entry.getValue().trim();
                columnIndices.put(headerName, entry.getKey());
                
                // Сохраняем названия колонок для проверки инвертированной логики
                if (headerName.contains("Требуется") || headerName.contains("Не требуется")) {
                    requiresPurchaseColumnName = headerName;
                }
                if (headerName.contains("План")) {
                    planColumnName = headerName;
                }
            }
        }
        headerProcessed = true;
        logger.info("Processed header row with {} columns", columnIndices.size());
        
        // Проверяем наличие колонки "Договор.Внутренний номер"
        Integer contractInnerIdCol = columnIndices.get(CONTRACT_INNER_ID_COLUMN);
        if (contractInnerIdCol != null) {
            logger.info("Found contractInnerId column '{}' at index {} in streaming mode", CONTRACT_INNER_ID_COLUMN, contractInnerIdCol);
        } else {
            logger.warn("ContractInnerId column '{}' not found in Excel file (streaming mode). Searching for similar columns...", CONTRACT_INNER_ID_COLUMN);
            // Ищем похожие колонки
            for (String colName : columnIndices.keySet()) {
                if (colName != null && (colName.contains("Договор") && colName.contains("Внутренний"))) {
                    logger.info("Found similar column: '{}' at index {}", colName, columnIndices.get(colName));
                }
            }
        }
        
        // Проверяем наличие колонки "Состояние"
        Integer statusCol = columnIndices.get(STATUS_COLUMN);
        if (statusCol != null) {
            logger.info("Found status column '{}' at index {} in streaming mode", STATUS_COLUMN, statusCol);
        } else {
            logger.warn("Status column '{}' not found in Excel file (streaming mode). Available columns: {}", STATUS_COLUMN, columnIndices.keySet());
        }
        
        // Проверяем наличие колонки "Сумма"
        Integer amountCol = columnIndices.get(AMOUNT_COLUMN);
        if (amountCol != null) {
            logger.info("Found amount column '{}' at index {} in streaming mode", AMOUNT_COLUMN, amountCol);
        } else {
            logger.warn("Amount column '{}' not found in Excel file (streaming mode). Available columns: {}", AMOUNT_COLUMN, columnIndices.keySet());
        }
    }
    
    private void processDataRow() {
        try {
            // Получаем тип документа (без ограничения по году)
            Integer docTypeCol = columnIndices.get(DOCUMENT_TYPE_COLUMN);
            if (docTypeCol == null) {
                // Пробуем найти колонку по частичному совпадению
                docTypeCol = findColumnIndex(DOCUMENT_TYPE_COLUMN);
                if (docTypeCol == null) {
                    return; // Пропускаем строки без колонки "Вид документа"
                }
            }
            
            String documentType = currentRowData.get(docTypeCol);
            if (documentType == null || documentType.trim().isEmpty()) {
                return;
            }
            
            String trimmedDocType = documentType.trim();
            
            // Обрабатываем в зависимости от типа документа
            boolean isProcessedType = false;
            if (PURCHASE_REQUEST_TYPE.equals(trimmedDocType)) {
                processPurchaseRequestRow();
                isProcessedType = true;
            } else if (PURCHASE_TYPE.equals(trimmedDocType)) {
                processPurchaseRow();
                isProcessedType = true;
            } else if (CONTRACT_TYPE.equals(trimmedDocType)) {
                processContractRow();
                isProcessedType = true;
            }
            
            // Обрабатываем пользователей из колонки "Подготовил" только для обработанных типов документов
            if (isProcessedType) {
                processUserRow();
            }
            
        } catch (Exception e) {
            logger.warn("Error processing row {}: {}", currentRowNum + 1, e.getMessage());
        }
    }
    
    private void processPurchaseRequestRow() {
        try {
            // Ищем колонку "Номер заявки на ЗП" с различными вариантами названий
            Integer requestNumberCol = columnIndices.get(REQUEST_NUMBER_COLUMN);
            if (requestNumberCol == null) {
                requestNumberCol = findColumnIndex(REQUEST_NUMBER_COLUMN);
            }
            // Пробуем альтернативные названия (включая опечатки)
            if (requestNumberCol == null) {
                requestNumberCol = columnIndices.get("Номер заяки на ЗП"); // Опечатка в файле
            }
            if (requestNumberCol == null) {
                requestNumberCol = findColumnIndex("Номер заяки на ЗП");
            }
            if (requestNumberCol == null) {
                requestNumberCol = findColumnIndex("Номер заявки");
            }
            
            Integer creationDateCol = columnIndices.get(CREATION_DATE_COLUMN);
            if (creationDateCol == null) {
                creationDateCol = findColumnIndex(CREATION_DATE_COLUMN);
            }
            
            if (requestNumberCol == null || creationDateCol == null) {
                logger.debug("Row {}: Missing required columns for purchase request (requestNumberCol={}, creationDateCol={})", 
                    currentRowNum + 1, requestNumberCol, creationDateCol);
                return;
            }
            
            String requestNumberStr = currentRowData.get(requestNumberCol);
            if (requestNumberStr == null || requestNumberStr.trim().isEmpty()) {
                return;
            }
            
            Long requestNumber = parseLong(requestNumberStr);
            if (requestNumber == null) {
                logger.warn("Row {}: Empty or invalid request number", currentRowNum + 1);
                return;
            }
            
            // Создаем или получаем существующую заявку
            Optional<PurchaseRequest> existingOpt = purchaseRequestRepository.findByIdPurchaseRequest(requestNumber);
            PurchaseRequest pr = existingOpt.orElse(new PurchaseRequest());
            pr.setIdPurchaseRequest(requestNumber);
            
            // Парсим дату создания
            String dateStr = currentRowData.get(creationDateCol);
            if (dateStr != null && !dateStr.trim().isEmpty()) {
                LocalDateTime creationDate = parseStringDate(dateStr);
                if (creationDate != null) {
                    pr.setPurchaseRequestCreationDate(creationDate);
                }
            }
            
            // Внутренний номер (опционально)
            Integer innerIdCol = columnIndices.get(INNER_ID_COLUMN);
            if (innerIdCol != null) {
                String innerId = currentRowData.get(innerIdCol);
                if (innerId != null && !innerId.trim().isEmpty()) {
                    pr.setInnerId(innerId.trim());
                }
            }
            
            // ЦФО (опционально)
            Integer cfoCol = columnIndices.get(CFO_COLUMN);
            if (cfoCol != null) {
                String cfo = currentRowData.get(cfoCol);
                if (cfo != null && !cfo.trim().isEmpty()) {
                    setCfoFromString(pr, cfo);
                }
            }
            
            // Наименование (опционально)
            Integer nameCol = columnIndices.get(NAME_COLUMN);
            if (nameCol != null) {
                String name = currentRowData.get(nameCol);
                if (name != null && !name.trim().isEmpty()) {
                    pr.setName(name.trim());
                }
            }
            
            // Заголовок (опционально)
            Integer titleCol = columnIndices.get(TITLE_COLUMN);
            if (titleCol != null) {
                String title = currentRowData.get(titleCol);
                if (title != null && !title.trim().isEmpty()) {
                    pr.setTitle(title.trim());
                }
            }
            
            // Требуется Закупка (опционально, булево поле)
            Integer requiresPurchaseCol = findColumnIndex(REQUIRES_PURCHASE_COLUMN);
            String foundColumnName = null;
            if (requiresPurchaseCol == null) {
                requiresPurchaseCol = findColumnIndex("Требуется закупка");
            }
            if (requiresPurchaseCol == null) {
                requiresPurchaseCol = findColumnIndex("Не требуется ЗП (Заявка на ЗП)");
            }
            
            // Находим реальное название колонки по индексу
            if (requiresPurchaseCol != null) {
                for (Map.Entry<String, Integer> entry : columnIndices.entrySet()) {
                    if (entry.getValue().equals(requiresPurchaseCol)) {
                        foundColumnName = entry.getKey();
                        break;
                    }
                }
                // Если не нашли точное совпадение, используем сохраненное название
                if (foundColumnName == null) {
                    foundColumnName = requiresPurchaseColumnName;
                }
            }
            
            if (requiresPurchaseCol != null) {
                String cellValueStr = currentRowData.get(requiresPurchaseCol);
                // Проверяем, является ли это колонкой "Не требуется" - для неё логика инвертированная
                boolean isInvertedLogic = (foundColumnName != null && foundColumnName.contains("Не требуется")) ||
                                         (requiresPurchaseColumnName != null && requiresPurchaseColumnName.contains("Не требуется"));
                
                logger.debug("Row {}: Found requiresPurchase column at index {}, name: '{}', value: '{}', inverted: {}", 
                    currentRowNum + 1, requiresPurchaseCol, foundColumnName != null ? foundColumnName : requiresPurchaseColumnName, cellValueStr, isInvertedLogic);
                
                Boolean requiresPurchase = null;
                if (cellValueStr != null && !cellValueStr.trim().isEmpty()) {
                    Boolean parsedValue = parseBooleanString(cellValueStr);
                    if (parsedValue != null) {
                        if (isInvertedLogic) {
                            // Для колонки "Не требуется ЗП": "Да" = не требуется (false), "Нет" = требуется (true)
                            requiresPurchase = !parsedValue;
                        } else {
                            // Обычная логика: "Да" = требуется (true), "Нет" = не требуется (false)
                            requiresPurchase = parsedValue;
                        }
                    } else {
                        logger.warn("Row {}: Cannot parse requiresPurchase value '{}'", 
                            currentRowNum + 1, cellValueStr);
                    }
                } else if (isInvertedLogic) {
                    // Если колонка "Не требуется" и ячейка пустая, значит требуется
                    requiresPurchase = true;
                }
                
                if (requiresPurchase != null) {
                    pr.setRequiresPurchase(requiresPurchase);
                    logger.info("Row {}: SET requiresPurchase to {} (value: '{}', inverted: {})", 
                        currentRowNum + 1, requiresPurchase, cellValueStr, isInvertedLogic);
                } else {
                    logger.debug("Row {}: requiresPurchase is null (value: '{}')", 
                        currentRowNum + 1, cellValueStr);
                }
            } else {
                logger.debug("Row {}: requiresPurchase column not found. Available columns: {}", 
                    currentRowNum + 1, columnIndices.keySet());
            }
            
            // План (опционально, булево поле)
            Integer planCol = findColumnIndex(PLAN_COLUMN);
            if (planCol != null) {
                String cellValueStr = currentRowData.get(planCol);
                Boolean isPlanned = parseBooleanString(cellValueStr);
                if (isPlanned != null) {
                    pr.setIsPlanned(isPlanned);
                }
            }
            
            // Подготовил (опционально) - устанавливаем в purchaseRequestInitiator
            Integer preparedByCol = columnIndices.get(PREPARED_BY_COLUMN);
            if (preparedByCol != null) {
                String preparedBy = currentRowData.get(preparedByCol);
                if (preparedBy != null && !preparedBy.trim().isEmpty()) {
                    pr.setPurchaseRequestInitiator(preparedBy.trim());
                }
            }
            
            // Закупщик (опционально)
            Integer purchaserCol = columnIndices.get(PURCHASER_COLUMN);
            if (purchaserCol != null) {
                String purchaser = currentRowData.get(purchaserCol);
                if (purchaser != null && !purchaser.trim().isEmpty()) {
                    pr.setPurchaser(purchaser.trim());
                }
            }
            
            // Состояние (опционально) - парсим поле "Состояние" в поле state
            Integer statusCol = columnIndices.get(STATUS_COLUMN);
            if (statusCol == null) {
                statusCol = findColumnIndex(STATUS_COLUMN);
            }
            if (statusCol != null) {
                String statusValue = currentRowData.get(statusCol);
                if (statusValue != null && !statusValue.trim().isEmpty()) {
                    String trimmedStatus = statusValue.trim();
                    // Сохраняем значение из колонки "Состояние" в поле state
                    pr.setState(trimmedStatus);
                    logger.info("Row {}: parsed state value: '{}' and saved to state field for request {}", currentRowNum + 1, trimmedStatus, pr.getIdPurchaseRequest());
                    // Если "Состояние" = "Проект" (case-insensitive), то устанавливаем статус = PROJECT
                    if ("Проект".equalsIgnoreCase(trimmedStatus)) {
                        pr.setStatus(PurchaseRequestStatus.PROJECT);
                        logger.info("Row {}: parsed state '{}', set status to PROJECT for request {}", currentRowNum + 1, trimmedStatus, pr.getIdPurchaseRequest());
                    } else {
                        logger.debug("Row {}: state value '{}' is not 'Проект' (case-insensitive), skipping status update", currentRowNum + 1, trimmedStatus);
                    }
                } else {
                    logger.debug("Row {}: status cell is empty or null", currentRowNum + 1);
                }
            } else {
                logger.debug("Row {}: statusColumnIndex is null, skipping state field. Available columns: {}", currentRowNum + 1, columnIndices.keySet());
            }
            
            // Сумма (опционально) - парсим поле "Сумма" в поле budgetAmount
            Integer amountCol = columnIndices.get(AMOUNT_COLUMN);
            if (amountCol == null) {
                amountCol = findColumnIndex(AMOUNT_COLUMN);
            }
            if (amountCol != null) {
                String amountStr = currentRowData.get(amountCol);
                if (amountStr != null && !amountStr.trim().isEmpty()) {
                    java.math.BigDecimal amount = parseBigDecimalString(amountStr);
                    if (amount != null) {
                        pr.setBudgetAmount(amount);
                        logger.info("Row {}: parsed amount value: '{}' and saved to budgetAmount field for request {}", currentRowNum + 1, amount, pr.getIdPurchaseRequest());
                    } else {
                        logger.debug("Row {}: cannot parse amount value '{}' for request {}", currentRowNum + 1, amountStr, pr.getIdPurchaseRequest());
                    }
                } else {
                    logger.debug("Row {}: amount cell is empty or null", currentRowNum + 1);
                }
            } else {
                logger.debug("Row {}: amountColumnIndex is null, skipping budgetAmount field. Available columns: {}", currentRowNum + 1, columnIndices.keySet());
            }
            
            // Валюта (опционально)
            Integer currencyCol = columnIndices.get(CURRENCY_COLUMN);
            if (currencyCol == null) {
                currencyCol = findColumnIndex(CURRENCY_COLUMN);
            }
            if (currencyCol != null) {
                String currency = currentRowData.get(currencyCol);
                if (currency != null && !currency.trim().isEmpty()) {
                    pr.setCurrency(currency.trim());
                    logger.debug("Row {}: parsed currency: '{}' for request {}", currentRowNum + 1, currency.trim(), pr.getIdPurchaseRequest());
                }
            } else {
                logger.debug("Row {}: currencyColumnIndex is null, skipping currency field. Available columns: {}", currentRowNum + 1, columnIndices.keySet());
            }
            
            // Статья расходов (опционально)
            Integer expenseItemCol = columnIndices.get(EXPENSE_ITEM_COLUMN);
            if (expenseItemCol == null) {
                expenseItemCol = findColumnIndex(EXPENSE_ITEM_COLUMN);
            }
            if (expenseItemCol != null) {
                String expenseItem = currentRowData.get(expenseItemCol);
                if (expenseItem != null && !expenseItem.trim().isEmpty()) {
                    pr.setExpenseItem(expenseItem.trim());
                    logger.debug("Row {}: parsed expenseItem: '{}' for request {}", currentRowNum + 1, expenseItem.trim(), pr.getIdPurchaseRequest());
                }
            } else {
                logger.debug("Row {}: expenseItemColumnIndex is null, skipping expenseItem field. Available columns: {}", currentRowNum + 1, columnIndices.keySet());
            }
            
            // Сохраняем или обновляем (добавляем в batch)
            if (existingOpt.isPresent()) {
                PurchaseRequest existing = existingOpt.get();
                Boolean oldRequiresPurchase = existing.getRequiresPurchase();
                Boolean newRequiresPurchase = pr.getRequiresPurchase();
                logger.debug("Row {}: Existing request {} from DB: requiresPurchase={}, new value={}", 
                    currentRowNum + 1, existing.getIdPurchaseRequest(), oldRequiresPurchase, newRequiresPurchase);
                boolean updated = updatePurchaseRequestFields(existing, pr);
                if (updated) {
                    purchaseRequestBatch.add(existing);
                    purchaseRequestsUpdated++;
                    logger.debug("Row {}: Queued updated purchase request {} for batch save", 
                        currentRowNum + 1, existing.getIdPurchaseRequest());
                    
                    // Сохраняем batch если он заполнен
                    if (purchaseRequestBatch.size() >= BATCH_SIZE) {
                        flushPurchaseRequestBatch();
                    }
                } else {
                    logger.debug("Row {}: No changes for purchase request {} (requiresPurchase: {})", 
                        currentRowNum + 1, existing.getIdPurchaseRequest(), existing.getRequiresPurchase());
                }
            } else {
                logger.debug("Row {}: Queuing new purchase request {} for batch save", 
                    currentRowNum + 1, pr.getIdPurchaseRequest());
                purchaseRequestBatch.add(pr);
                purchaseRequestsCreated++;
                
                // Сохраняем batch если он заполнен
                if (purchaseRequestBatch.size() >= BATCH_SIZE) {
                    flushPurchaseRequestBatch();
                }
            }
            purchaseRequestsCount++;
            
        } catch (Exception e) {
            logger.warn("Error processing purchase request row {}: {}", currentRowNum + 1, e.getMessage(), e);
        }
    }
    
    private void processPurchaseRow() {
        try {
            Integer innerIdCol = columnIndices.get(INNER_ID_COLUMN);
            if (innerIdCol == null) {
                innerIdCol = findColumnIndex(INNER_ID_COLUMN);
            }
            if (innerIdCol == null) {
                return;
            }
            
            String innerIdStr = currentRowData.get(innerIdCol);
            if (innerIdStr == null || innerIdStr.trim().isEmpty()) {
                logger.warn("Row {}: Empty inner ID for purchase", currentRowNum + 1);
                return;
            }
            
            String innerId = innerIdStr.trim();
            
            // Создаем или получаем существующую закупку
            Optional<Purchase> existingOpt = purchaseRepository.findByInnerId(innerId);
            Purchase purchase = existingOpt.orElse(new Purchase());
            purchase.setInnerId(innerId);
            
            // Дата создания (опционально)
            Integer creationDateCol = columnIndices.get(CREATION_DATE_COLUMN);
            if (creationDateCol != null) {
                String dateStr = currentRowData.get(creationDateCol);
                if (dateStr != null && !dateStr.trim().isEmpty()) {
                    LocalDateTime creationDate = parseStringDate(dateStr);
                    if (creationDate != null) {
                        purchase.setPurchaseCreationDate(creationDate);
                    }
                }
            }
            
            // ЦФО (опционально)
            Integer cfoCol = columnIndices.get(CFO_COLUMN);
            if (cfoCol != null) {
                String cfo = currentRowData.get(cfoCol);
                if (cfo != null && !cfo.trim().isEmpty()) {
                    setCfoFromString(purchase, cfo);
                }
            }
            
            // Ссылка (опционально) - парсим purchaseRequestId
            Integer linkCol = columnIndices.get(LINK_COLUMN);
            if (linkCol != null) {
                String link = currentRowData.get(linkCol);
                if (link != null && !link.trim().isEmpty()) {
                    Long purchaseRequestId = parsePurchaseRequestIdFromLink(link.trim());
                    if (purchaseRequestId != null) {
                        Optional<PurchaseRequest> purchaseRequest = purchaseRequestRepository.findByIdPurchaseRequest(purchaseRequestId);
                        if (purchaseRequest.isPresent()) {
                            purchase.setPurchaseRequestId(purchaseRequest.get().getIdPurchaseRequest());
                            logger.info("Row {}: Set purchaseRequestId {} for purchase {} from link '{}'", 
                                currentRowNum + 1, purchaseRequest.get().getIdPurchaseRequest(), purchase.getInnerId(), link.trim());
                        } else {
                            logger.warn("Row {}: PurchaseRequest with idPurchaseRequest {} not found for purchase {} with link '{}'", 
                                currentRowNum + 1, purchaseRequestId, purchase.getInnerId(), link.trim());
                        }
                    } else {
                        logger.debug("Row {}: Could not parse purchaseRequestId from link '{}' for purchase {}", 
                            currentRowNum + 1, link.trim(), purchase.getInnerId());
                    }
                }
            }
            
            // Состояние (опционально) - парсим поле "Состояние" в поле state
            Integer statusCol = columnIndices.get(STATUS_COLUMN);
            if (statusCol == null) {
                statusCol = findColumnIndex(STATUS_COLUMN);
            }
            if (statusCol != null) {
                String statusValue = currentRowData.get(statusCol);
                if (statusValue != null && !statusValue.trim().isEmpty()) {
                    String trimmedStatus = statusValue.trim();
                    // Сохраняем значение из колонки "Состояние" в поле state
                    purchase.setState(trimmedStatus);
                    logger.info("Row {}: parsed state value: '{}' and saved to state field for purchase {}", currentRowNum + 1, trimmedStatus, purchase.getInnerId());
                    // Если "Состояние" = "Проект" (case-insensitive), то устанавливаем статус = PROJECT
                    if ("Проект".equalsIgnoreCase(trimmedStatus)) {
                        purchase.setStatus(PurchaseStatus.PROJECT);
                        logger.info("Row {}: parsed state '{}', set status to PROJECT for purchase {}", currentRowNum + 1, trimmedStatus, purchase.getInnerId());
                    } else {
                        logger.debug("Row {}: state value '{}' is not 'Проект' (case-insensitive), skipping status update", currentRowNum + 1, trimmedStatus);
                    }
                } else {
                    logger.debug("Row {}: status cell is empty or null", currentRowNum + 1);
                }
            } else {
                logger.debug("Row {}: statusColumnIndex is null, skipping state field", currentRowNum + 1);
            }
            
            // Сумма (опционально) - парсим поле "Сумма" в поле budgetAmount
            Integer amountCol = columnIndices.get(AMOUNT_COLUMN);
            if (amountCol == null) {
                amountCol = findColumnIndex(AMOUNT_COLUMN);
            }
            if (amountCol != null) {
                String amountStr = currentRowData.get(amountCol);
                if (amountStr != null && !amountStr.trim().isEmpty()) {
                    java.math.BigDecimal amount = parseBigDecimalString(amountStr);
                    if (amount != null) {
                        purchase.setBudgetAmount(amount);
                        logger.info("Row {}: parsed amount value: '{}' and saved to budgetAmount field for purchase {}", currentRowNum + 1, amount, purchase.getInnerId());
                    } else {
                        logger.debug("Row {}: cannot parse amount value '{}' for purchase {}", currentRowNum + 1, amountStr, purchase.getInnerId());
                    }
                } else {
                    logger.debug("Row {}: amount cell is empty or null", currentRowNum + 1);
                }
            } else {
                logger.debug("Row {}: amountColumnIndex is null, skipping budgetAmount field. Available columns: {}", currentRowNum + 1, columnIndices.keySet());
            }
            
            // Валюта (опционально)
            Integer currencyCol = columnIndices.get(CURRENCY_COLUMN);
            if (currencyCol == null) {
                currencyCol = findColumnIndex(CURRENCY_COLUMN);
            }
            if (currencyCol != null) {
                String currency = currentRowData.get(currencyCol);
                if (currency != null && !currency.trim().isEmpty()) {
                    purchase.setCurrency(currency.trim());
                    logger.debug("Row {}: parsed currency: '{}' for purchase {}", currentRowNum + 1, currency.trim(), purchase.getInnerId());
                }
            } else {
                logger.debug("Row {}: currencyColumnIndex is null, skipping currency field. Available columns: {}", currentRowNum + 1, columnIndices.keySet());
            }
            
            // Статья расходов (опционально)
            Integer expenseItemCol = columnIndices.get(EXPENSE_ITEM_COLUMN);
            if (expenseItemCol == null) {
                expenseItemCol = findColumnIndex(EXPENSE_ITEM_COLUMN);
            }
            if (expenseItemCol != null) {
                String expenseItem = currentRowData.get(expenseItemCol);
                if (expenseItem != null && !expenseItem.trim().isEmpty()) {
                    purchase.setExpenseItem(expenseItem.trim());
                    logger.debug("Row {}: parsed expenseItem: '{}' for purchase {}", currentRowNum + 1, expenseItem.trim(), purchase.getInnerId());
                }
            } else {
                logger.debug("Row {}: expenseItemColumnIndex is null, skipping expenseItem field. Available columns: {}", currentRowNum + 1, columnIndices.keySet());
            }
            
            // Внутренний номер договора (опционально) - парсим из колонки "Договор.Внутренний номер"
            // Используем findColumnIndex для поиска колонки (как для других колонок)
            Integer contractInnerIdCol = columnIndices.get(CONTRACT_INNER_ID_COLUMN);
            if (contractInnerIdCol == null) {
                contractInnerIdCol = findColumnIndex(CONTRACT_INNER_ID_COLUMN);
            }
            // Если не нашли через findColumnIndex, ищем вручную по частичному совпадению
            if (contractInnerIdCol == null) {
                for (Map.Entry<String, Integer> entry : columnIndices.entrySet()) {
                    String colName = entry.getKey();
                    if (colName == null) continue;
                    String normalizedColName = colName.trim();
                    // Проверяем, что колонка содержит "Договор" и "Внутренний" (не обязательно "Внутренний номер")
                    // но не является просто "Внутренний номер" или INNER_ID_COLUMN
                    boolean hasContract = normalizedColName.contains("Договор");
                    boolean hasInner = normalizedColName.contains("Внутренний");
                    boolean isNotSimpleInner = !normalizedColName.equals("Внутренний номер") && 
                                             !normalizedColName.equals(INNER_ID_COLUMN);
                    // Также проверяем варианты с точкой и пробелом: "Договор.Внутренний", "Договор. Внутренний"
                    boolean hasContractDotInner = normalizedColName.contains("Договор.") && normalizedColName.contains("Внутренний");
                    
                    if ((hasContract && hasInner && isNotSimpleInner) || hasContractDotInner) {
                        contractInnerIdCol = entry.getValue();
                        logger.info("Row {}: Found contractInnerId column by partial match: '{}' for purchase {}", 
                            currentRowNum + 1, colName, purchase.getInnerId());
                        break;
                    }
                }
            }
            if (contractInnerIdCol != null) {
                logger.debug("Row {}: Found contractInnerId column '{}' at index {} for purchase {}", 
                    currentRowNum + 1, CONTRACT_INNER_ID_COLUMN, contractInnerIdCol, purchase.getInnerId());
            }
            if (contractInnerIdCol != null) {
                String contractInnerId = currentRowData.get(contractInnerIdCol);
                if (contractInnerId != null && !contractInnerId.trim().isEmpty()) {
                    String trimmedContractInnerId = contractInnerId.trim();
                    // Валидация: contractInnerId не должен совпадать с innerId закупки
                    if (trimmedContractInnerId.equals(purchase.getInnerId())) {
                        logger.warn("Row {}: contractInnerId '{}' equals purchase innerId '{}', skipping contractInnerId for purchase {}", 
                            currentRowNum + 1, trimmedContractInnerId, purchase.getInnerId(), purchase.getInnerId());
                    } else {
                        // Добавляем внутренний номер договора (может быть несколько)
                        purchase.addContractInnerId(trimmedContractInnerId);
                        logger.info("Row {}: parsed contractInnerId: '{}' for purchase {}", currentRowNum + 1, trimmedContractInnerId, purchase.getInnerId());
                    }
                } else {
                    logger.debug("Row {}: contractInnerId column found but value is empty for purchase {}", currentRowNum + 1, purchase.getInnerId());
                }
            } else {
                logger.warn("Row {}: contractInnerIdColumnIndex is null for purchase {}. Looking for column '{}'. Available columns: {}", 
                    currentRowNum + 1, purchase.getInnerId(), CONTRACT_INNER_ID_COLUMN, columnIndices.keySet());
            }
            
            // Способ закупки (опционально) - парсим из колонки "Способ закупки (Заявка на ЗП)"
            Integer mccCol = columnIndices.get(MCC_COLUMN);
            if (mccCol == null) {
                mccCol = findColumnIndex(MCC_COLUMN);
            }
            if (mccCol != null) {
                String mcc = currentRowData.get(mccCol);
                if (mcc != null && !mcc.trim().isEmpty()) {
                    purchase.setMcc(mcc.trim());
                    logger.debug("Row {}: parsed mcc: '{}' for purchase {}", currentRowNum + 1, mcc.trim(), purchase.getInnerId());
                }
            } else {
                logger.debug("Row {}: mccColumnIndex is null, skipping mcc field. Available columns: {}", currentRowNum + 1, columnIndices.keySet());
            }
            
            // Сохраняем или обновляем (добавляем в batch)
            if (existingOpt.isPresent()) {
                Purchase existing = existingOpt.get();
                boolean updated = updatePurchaseFields(existing, purchase);
                if (updated) {
                    purchaseBatch.add(existing);
                    purchasesUpdated++;
                    
                    // Сохраняем batch если он заполнен
                    if (purchaseBatch.size() >= BATCH_SIZE) {
                        flushPurchaseBatch();
                    }
                }
            } else {
                purchaseBatch.add(purchase);
                purchasesCreated++;
                
                // Сохраняем batch если он заполнен
                if (purchaseBatch.size() >= BATCH_SIZE) {
                    flushPurchaseBatch();
                }
            }
            purchasesCount++;
            
        } catch (Exception e) {
            logger.warn("Error processing purchase row {}: {}", currentRowNum + 1, e.getMessage(), e);
        }
    }
    
    private void processContractRow() {
        try {
            Integer innerIdCol = columnIndices.get(INNER_ID_COLUMN);
            if (innerIdCol == null) {
                innerIdCol = findColumnIndex(INNER_ID_COLUMN);
            }
            if (innerIdCol == null) {
                return;
            }
            
            String innerIdStr = currentRowData.get(innerIdCol);
            if (innerIdStr == null || innerIdStr.trim().isEmpty()) {
                logger.warn("Row {}: Empty inner ID for contract", currentRowNum + 1);
                return;
            }
            
            String innerId = innerIdStr.trim();
            
            // Создаем или получаем существующий договор
            Optional<Contract> existingOpt = contractRepository.findByInnerId(innerId);
            Contract contract = existingOpt.orElse(new Contract());
            contract.setInnerId(innerId);
            
            // Дата создания (опционально)
            Integer creationDateCol = columnIndices.get(CREATION_DATE_COLUMN);
            if (creationDateCol != null) {
                String dateStr = currentRowData.get(creationDateCol);
                if (dateStr != null && !dateStr.trim().isEmpty()) {
                    LocalDateTime creationDate = parseStringDate(dateStr);
                    if (creationDate != null) {
                        contract.setContractCreationDate(creationDate);
                    }
                }
            }
            
            // ЦФО (опционально)
            Integer cfoCol = columnIndices.get(CFO_COLUMN);
            if (cfoCol != null) {
                String cfo = currentRowData.get(cfoCol);
                if (cfo != null && !cfo.trim().isEmpty()) {
                    setCfoFromString(contract, cfo);
                }
            }
            
            // Наименование (опционально)
            Integer nameCol = columnIndices.get(NAME_COLUMN);
            if (nameCol != null) {
                String name = currentRowData.get(nameCol);
                if (name != null && !name.trim().isEmpty()) {
                    contract.setName(name.trim());
                }
            }
            
            // Заголовок (опционально)
            Integer titleCol = columnIndices.get(TITLE_COLUMN);
            if (titleCol != null) {
                String title = currentRowData.get(titleCol);
                if (title != null && !title.trim().isEmpty()) {
                    contract.setTitle(title.trim());
                }
            }
            
            // Форма документа (опционально)
            Integer documentFormCol = findColumnIndex(DOCUMENT_FORM_COLUMN);
            if (documentFormCol != null) {
                String documentForm = currentRowData.get(documentFormCol);
                if (documentForm != null && !documentForm.trim().isEmpty()) {
                    contract.setDocumentForm(documentForm.trim());
                }
            }
            
            // Ссылка (опционально) - парсим purchaseRequestId
            Integer linkCol = columnIndices.get(LINK_COLUMN);
            if (linkCol != null) {
                String link = currentRowData.get(linkCol);
                if (link != null && !link.trim().isEmpty()) {
                    Long purchaseRequestId = parsePurchaseRequestIdFromLink(link.trim());
                    if (purchaseRequestId != null) {
                        Optional<PurchaseRequest> purchaseRequest = purchaseRequestRepository.findByIdPurchaseRequest(purchaseRequestId);
                        if (purchaseRequest.isPresent()) {
                            contract.setPurchaseRequestId(purchaseRequest.get().getIdPurchaseRequest());
                            logger.info("Row {}: Set purchaseRequestId {} for contract {} from link '{}'", 
                                currentRowNum + 1, purchaseRequest.get().getIdPurchaseRequest(), contract.getInnerId(), link.trim());
                        } else {
                            logger.warn("Row {}: PurchaseRequest with idPurchaseRequest {} not found for contract {} with link '{}'", 
                                currentRowNum + 1, purchaseRequestId, contract.getInnerId(), link.trim());
                        }
                    } else {
                        logger.debug("Row {}: Could not parse purchaseRequestId from link '{}' for contract {}", 
                            currentRowNum + 1, link.trim(), contract.getInnerId());
                    }
                }
            }
            
            // Основной договор (опционально) - парсим только если Вид Документа = "Договор" и Форма Документа = "Спецификация"
            Integer documentTypeCol = columnIndices.get(DOCUMENT_TYPE_COLUMN);
            if (documentTypeCol == null) {
                documentTypeCol = findColumnIndex(DOCUMENT_TYPE_COLUMN);
            }
            Integer documentFormColForCheck = columnIndices.get(DOCUMENT_FORM_COLUMN);
            if (documentFormColForCheck == null) {
                documentFormColForCheck = findColumnIndex(DOCUMENT_FORM_COLUMN);
            }
            
            String documentType = null;
            if (documentTypeCol != null) {
                documentType = currentRowData.get(documentTypeCol);
            }
            String documentForm = null;
            if (documentFormColForCheck != null) {
                documentForm = currentRowData.get(documentFormColForCheck);
            }
            
            // Проверяем условия: Вид Документа = "Договор" и Форма Документа = "Спецификация"
            if (CONTRACT_TYPE.equals(documentType) && SPECIFICATION_FORM.equals(documentForm)) {
                Integer mainContractCol = columnIndices.get(MAIN_CONTRACT_COLUMN);
                if (mainContractCol == null) {
                    mainContractCol = findColumnIndex(MAIN_CONTRACT_COLUMN);
                }
                if (mainContractCol != null) {
                    String mainContractName = currentRowData.get(mainContractCol);
                    if (mainContractName != null && !mainContractName.trim().isEmpty()) {
                        String trimmedMainContractName = mainContractName.trim();
                        Optional<Contract> mainContract = contractRepository.findByName(trimmedMainContractName);
                        if (mainContract.isPresent()) {
                            contract.setParentContractId(mainContract.get().getId());
                            logger.info("Row {}: Set parentContractId {} for contract {} (specification) from main contract name '{}'", 
                                currentRowNum + 1, mainContract.get().getId(), contract.getInnerId(), trimmedMainContractName);
                        } else {
                            logger.warn("Row {}: Main contract with name '{}' not found for contract {} (specification)", 
                                currentRowNum + 1, trimmedMainContractName, contract.getInnerId());
                        }
                    } else {
                        logger.debug("Row {}: Main contract cell is empty or null for contract {} (specification)", 
                            currentRowNum + 1, contract.getInnerId());
                    }
                } else {
                    logger.debug("Row {}: Main contract column not found for contract {} (specification)", 
                        currentRowNum + 1, contract.getInnerId());
                }
            }
            
            // Состояние (опционально) - парсим поле "Состояние" в поле state
            Integer statusCol = columnIndices.get(STATUS_COLUMN);
            if (statusCol == null) {
                statusCol = findColumnIndex(STATUS_COLUMN);
            }
            if (statusCol != null) {
                String statusValue = currentRowData.get(statusCol);
                if (statusValue != null && !statusValue.trim().isEmpty()) {
                    String trimmedStatus = statusValue.trim();
                    // Сохраняем значение из колонки "Состояние" в поле state
                    contract.setState(trimmedStatus);
                    logger.info("Row {}: parsed state value: '{}' and saved to state field for contract {}", currentRowNum + 1, trimmedStatus, contract.getInnerId());
                    // Если "Состояние" = "Проект" (case-insensitive), то устанавливаем статус = PROJECT
                    if ("Проект".equalsIgnoreCase(trimmedStatus)) {
                        contract.setStatus(ContractStatus.PROJECT);
                        logger.info("Row {}: parsed state '{}', set status to PROJECT for contract {}", currentRowNum + 1, trimmedStatus, contract.getInnerId());
                    } else {
                        logger.debug("Row {}: state value '{}' is not 'Проект' (case-insensitive), skipping status update", currentRowNum + 1, trimmedStatus);
                    }
                } else {
                    logger.debug("Row {}: status cell is empty or null", currentRowNum + 1);
                }
            } else {
                logger.debug("Row {}: statusColumnIndex is null, skipping state field", currentRowNum + 1);
            }
            
            // Сумма (опционально) - парсим поле "Сумма" в поле budgetAmount
            Integer amountCol = columnIndices.get(AMOUNT_COLUMN);
            if (amountCol == null) {
                amountCol = findColumnIndex(AMOUNT_COLUMN);
            }
            if (amountCol != null) {
                String amountStr = currentRowData.get(amountCol);
                if (amountStr != null && !amountStr.trim().isEmpty()) {
                    java.math.BigDecimal amount = parseBigDecimalString(amountStr);
                    if (amount != null) {
                        contract.setBudgetAmount(amount);
                        logger.info("Row {}: parsed amount value: '{}' and saved to budgetAmount field for contract {}", currentRowNum + 1, amount, contract.getInnerId());
                    } else {
                        logger.debug("Row {}: cannot parse amount value '{}' for contract {}", currentRowNum + 1, amountStr, contract.getInnerId());
                    }
                } else {
                    logger.debug("Row {}: amount cell is empty or null", currentRowNum + 1);
                }
            } else {
                logger.debug("Row {}: amountColumnIndex is null, skipping budgetAmount field. Available columns: {}", currentRowNum + 1, columnIndices.keySet());
            }
            
            // Валюта (опционально)
            Integer currencyCol = columnIndices.get(CURRENCY_COLUMN);
            if (currencyCol == null) {
                currencyCol = findColumnIndex(CURRENCY_COLUMN);
            }
            if (currencyCol != null) {
                String currency = currentRowData.get(currencyCol);
                if (currency != null && !currency.trim().isEmpty()) {
                    contract.setCurrency(currency.trim());
                    logger.debug("Row {}: parsed currency: '{}' for contract {}", currentRowNum + 1, currency.trim(), contract.getInnerId());
                }
            } else {
                logger.debug("Row {}: currencyColumnIndex is null, skipping currency field. Available columns: {}", currentRowNum + 1, columnIndices.keySet());
            }
            
            // Сохраняем или обновляем (добавляем в batch)
            if (existingOpt.isPresent()) {
                Contract existing = existingOpt.get();
                boolean updated = updateContractFields(existing, contract);
                if (updated) {
                    contractBatch.add(existing);
                    contractsUpdated++;
                    
                    // Сохраняем batch если он заполнен
                    if (contractBatch.size() >= BATCH_SIZE) {
                        flushContractBatch();
                    }
                }
            } else {
                contractBatch.add(contract);
                contractsCreated++;
                
                // Сохраняем batch если он заполнен
                if (contractBatch.size() >= BATCH_SIZE) {
                    flushContractBatch();
                }
            }
            contractsCount++;
            
        } catch (Exception e) {
            logger.warn("Error processing contract row {}: {}", currentRowNum + 1, e.getMessage(), e);
        }
    }
    
    private void processUserRow() {
        try {
            // Обрабатываем пользователей из колонки "Подготовил"
            Integer preparedByCol = columnIndices.get(PREPARED_BY_COLUMN);
            if (preparedByCol != null) {
                String preparedBy = currentRowData.get(preparedByCol);
                if (preparedBy != null && !preparedBy.trim().isEmpty()) {
                    excelLoadService.parseAndSaveUser(preparedBy.trim());
                    usersCount++;
                }
            }
            
            // Обрабатываем пользователей из колонки "Закупщик" (Ответственный за ЗП)
            Integer purchaserCol = columnIndices.get(PURCHASER_COLUMN);
            if (purchaserCol != null) {
                String purchaser = currentRowData.get(purchaserCol);
                if (purchaser != null && !purchaser.trim().isEmpty()) {
                    excelLoadService.parseAndSaveUser(purchaser.trim());
                    usersCount++;
                }
            }
        } catch (Exception e) {
            logger.warn("Error processing user row {}: {}", currentRowNum + 1, e.getMessage());
        }
    }
    
    private int getColumnIndex(String cellReference) {
        // Извлекаем букву колонки (например, "A1" -> "A" -> 0)
        String columnPart = cellReference.replaceAll("[0-9]", "");
        int index = 0;
        for (int i = 0; i < columnPart.length(); i++) {
            index = index * 26 + (columnPart.charAt(i) - 'A' + 1);
        }
        return index - 1;
    }
    
    private Long parseLong(String value) {
        try {
            if (value == null || value.trim().isEmpty()) {
                return null;
            }
            // Убираем пробелы и форматирование
            String cleaned = value.trim().replaceAll("[^0-9]", "");
            return cleaned.isEmpty() ? null : Long.parseLong(cleaned);
        } catch (NumberFormatException e) {
            return null;
        }
    }
    
    /**
     * Парсит строку с датой в различных форматах
     */
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
            } catch (DateTimeParseException e) {
                // Пробуем следующий формат
            }
        }
        
        // Пробуем ISO форматы как fallback
        try {
            return LocalDateTime.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE_TIME);
        } catch (DateTimeParseException e) {
            // ignore
        }
        try {
            return LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE).atStartOfDay();
        } catch (DateTimeParseException e) {
            // ignore
        }
        
        return null;
    }
    
    /**
     * Парсит строку в Boolean
     * Логика аналогична parseBooleanCell в EntityExcelLoadService
     */
    private Boolean parseBooleanString(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        
        String strValue = value.trim().toLowerCase();
        
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
    }
    
    /**
     * Парсит строку в BigDecimal, обрабатывая различные форматы
     * Логика аналогична parseStringToBigDecimal в PurchasePlanExcelLoadService
     */
    private java.math.BigDecimal parseBigDecimalString(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return null;
        }
        
        try {
            // Оставляем только цифры: убираем пробелы, неразрывные пробелы, "UZS" и любые другие символы
            // Также сохраняем точку или запятую для десятичных чисел
            String cleaned = raw.replaceAll("[^0-9.,]", "");
            
            // Заменяем запятую на точку для десятичных чисел
            cleaned = cleaned.replace(",", ".");
            
            // Если есть несколько точек, оставляем только первую (для корректного парсинга)
            int firstDotIndex = cleaned.indexOf('.');
            if (firstDotIndex >= 0) {
                String beforeDot = cleaned.substring(0, firstDotIndex);
                String afterDot = cleaned.substring(firstDotIndex + 1).replace(".", "");
                cleaned = beforeDot + "." + afterDot;
            }
            
            logger.debug("parseBigDecimalString: cleaned value: '{}'", cleaned);

            if (cleaned.isEmpty()) {
                logger.warn("Cannot parse BigDecimal from string (no digits after cleanup): '{}'", raw);
                return null;
            }

            java.math.BigDecimal result = new java.math.BigDecimal(cleaned);
            logger.debug("parseBigDecimalString: parsed BigDecimal: {}", result);
            return result;
        } catch (NumberFormatException e) {
            logger.warn("Cannot parse BigDecimal from string: '{}', error: {}", raw, e.getMessage());
            return null;
        }
    }
    
    /**
     * Находит индекс колонки по точному или частичному совпадению
     */
    private Integer findColumnIndex(String columnName) {
        // Сначала ищем точное совпадение
        Integer exactMatch = columnIndices.get(columnName);
        if (exactMatch != null) {
            return exactMatch;
        }
        
        // Ищем частичное совпадение
        for (Map.Entry<String, Integer> entry : columnIndices.entrySet()) {
            if (entry.getKey().contains(columnName) || columnName.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        
        return null;
    }
    
    /**
     * Обновляет поля существующей заявки только если они отличаются
     */
    private boolean updatePurchaseRequestFields(PurchaseRequest existing, PurchaseRequest newData) {
        boolean updated = false;
        
        // Обновляем дату создания
        if (newData.getPurchaseRequestCreationDate() != null) {
            if (existing.getPurchaseRequestCreationDate() == null || 
                !existing.getPurchaseRequestCreationDate().equals(newData.getPurchaseRequestCreationDate())) {
                existing.setPurchaseRequestCreationDate(newData.getPurchaseRequestCreationDate());
                updated = true;
            }
        }
        
        // Обновляем внутренний номер
        if (newData.getInnerId() != null && !newData.getInnerId().trim().isEmpty()) {
            if (existing.getInnerId() == null || !existing.getInnerId().equals(newData.getInnerId())) {
                existing.setInnerId(newData.getInnerId());
                updated = true;
            }
        }
        
        // Обновляем ЦФО
        if (newData.getCfo() != null) {
            Cfo newCfo = newData.getCfo();
            if (existing.getCfo() == null || !newCfo.getId().equals(existing.getCfo().getId())) {
                existing.setCfo(newCfo);
                updated = true;
            }
        }
        
        // Обновляем наименование
        if (newData.getName() != null && !newData.getName().trim().isEmpty()) {
            if (existing.getName() == null || !existing.getName().equals(newData.getName())) {
                existing.setName(newData.getName());
                updated = true;
            }
        }
        
        // Обновляем заголовок
        if (newData.getTitle() != null && !newData.getTitle().trim().isEmpty()) {
            if (existing.getTitle() == null || !existing.getTitle().equals(newData.getTitle())) {
                existing.setTitle(newData.getTitle());
                updated = true;
            }
        }
        
        // Обновляем requiresPurchase
        // ВАЖНО: Всегда обновляем поле, если оно установлено в Excel, так как в БД могут быть NULL значения,
        // которые Hibernate может возвращать как false
        if (newData.getRequiresPurchase() != null) {
            Boolean existingValue = existing.getRequiresPurchase();
            Boolean newValue = newData.getRequiresPurchase();
            boolean shouldUpdate = !java.util.Objects.equals(existingValue, newValue);
            
            // Принудительно обновляем, если значение отличается или если существующее значение может быть NULL в БД
            // (Hibernate может возвращать false для NULL, поэтому всегда обновляем, если новое значение установлено)
            if (!shouldUpdate) {
                // Если значения равны, но в БД может быть NULL, принудительно обновляем
                logger.debug("Force updating requiresPurchase for request {} (ensuring value is set in DB): {} -> {}", 
                    existing.getIdPurchaseRequest(), existingValue, newValue);
                shouldUpdate = true;
            }
            
            logger.debug("Checking requiresPurchase for request {}: existing={}, new={}, shouldUpdate={}", 
                existing.getIdPurchaseRequest(), existingValue, newValue, shouldUpdate);
            
            if (shouldUpdate) {
                logger.info("Updating requiresPurchase for request {}: {} -> {}", 
                    existing.getIdPurchaseRequest(), existingValue, newValue);
                existing.setRequiresPurchase(newValue);
                updated = true;
            } else {
                logger.debug("requiresPurchase unchanged for request {}: {}", 
                    existing.getIdPurchaseRequest(), existingValue);
            }
        } else {
            logger.debug("newData.getRequiresPurchase() is null for request {}", existing.getIdPurchaseRequest());
        }
        
        // Обновляем isPlanned
        if (newData.getIsPlanned() != null) {
            if (existing.getIsPlanned() == null || !existing.getIsPlanned().equals(newData.getIsPlanned())) {
                existing.setIsPlanned(newData.getIsPlanned());
                updated = true;
            }
        }
        
        // Обновляем инициатора
        if (newData.getPurchaseRequestInitiator() != null && !newData.getPurchaseRequestInitiator().trim().isEmpty()) {
            if (existing.getPurchaseRequestInitiator() == null || !existing.getPurchaseRequestInitiator().equals(newData.getPurchaseRequestInitiator())) {
                existing.setPurchaseRequestInitiator(newData.getPurchaseRequestInitiator());
                updated = true;
            }
        }
        
        // Обновляем закупщика только если он еще не установлен
        // Если закупщик уже установлен, не перезаписываем его при парсинге Excel
        if (newData.getPurchaser() != null && !newData.getPurchaser().trim().isEmpty()) {
            if (existing.getPurchaser() == null || existing.getPurchaser().trim().isEmpty()) {
                // Закупщик еще не установлен, устанавливаем его
                existing.setPurchaser(newData.getPurchaser());
                updated = true;
                logger.debug("Set purchaser for request {}: {}", existing.getIdPurchaseRequest(), newData.getPurchaser());
            } else {
                // Закупщик уже установлен, не перезаписываем
                logger.debug("Purchaser already set for request {}: '{}', skipping update from Excel: '{}'", 
                    existing.getIdPurchaseRequest(), existing.getPurchaser(), newData.getPurchaser());
            }
        }
        
        // Обновляем сумму (budgetAmount)
        if (newData.getBudgetAmount() != null) {
            if (existing.getBudgetAmount() == null || !existing.getBudgetAmount().equals(newData.getBudgetAmount())) {
                existing.setBudgetAmount(newData.getBudgetAmount());
                updated = true;
                logger.debug("Updated budgetAmount for request {}: {}", existing.getIdPurchaseRequest(), newData.getBudgetAmount());
            }
        }
        
        // Обновляем валюту
        if (newData.getCurrency() != null && !newData.getCurrency().trim().isEmpty()) {
            if (existing.getCurrency() == null || !existing.getCurrency().equals(newData.getCurrency())) {
                existing.setCurrency(newData.getCurrency());
                updated = true;
                logger.debug("Updated currency for request {}: {}", existing.getIdPurchaseRequest(), newData.getCurrency());
            }
        }
        
        // Обновляем state
        if (newData.getState() != null && !newData.getState().trim().isEmpty()) {
            if (existing.getState() == null || !existing.getState().equals(newData.getState())) {
                existing.setState(newData.getState());
                updated = true;
                logger.debug("Updated state for request {}: {}", existing.getIdPurchaseRequest(), newData.getState());
            }
        }
        
        // Обновляем expenseItem
        if (newData.getExpenseItem() != null && !newData.getExpenseItem().trim().isEmpty()) {
            if (existing.getExpenseItem() == null || !existing.getExpenseItem().equals(newData.getExpenseItem())) {
                existing.setExpenseItem(newData.getExpenseItem());
                updated = true;
                logger.debug("Updated expenseItem for request {}: {}", existing.getIdPurchaseRequest(), newData.getExpenseItem());
            }
        }
        
        // Обновляем status
        if (newData.getStatus() != null) {
            if (existing.getStatus() == null || !existing.getStatus().equals(newData.getStatus())) {
                existing.setStatus(newData.getStatus());
                updated = true;
                logger.debug("Updated status for request {}: {}", existing.getIdPurchaseRequest(), newData.getStatus());
            }
        }
        
        return updated;
    }
    
    /**
     * Обновляет поля существующей закупки только если они отличаются
     */
    private boolean updatePurchaseFields(Purchase existing, Purchase newData) {
        boolean updated = false;
        logger.debug("updatePurchaseFields: existing purchaseRequestId={}, newData purchaseRequestId={} for purchase {}", 
            existing.getPurchaseRequestId(), newData.getPurchaseRequestId(), existing.getInnerId());
        
        // Обновляем внутренний номер
        if (newData.getInnerId() != null && !newData.getInnerId().trim().isEmpty()) {
            if (existing.getInnerId() == null || !existing.getInnerId().equals(newData.getInnerId())) {
                existing.setInnerId(newData.getInnerId());
                updated = true;
            }
        }
        
        // Обновляем дату создания
        if (newData.getPurchaseCreationDate() != null) {
            if (existing.getPurchaseCreationDate() == null || 
                !existing.getPurchaseCreationDate().equals(newData.getPurchaseCreationDate())) {
                existing.setPurchaseCreationDate(newData.getPurchaseCreationDate());
                updated = true;
            }
        }
        
        // Обновляем ЦФО
        if (newData.getCfo() != null) {
            Cfo newCfo = newData.getCfo();
            if (existing.getCfo() == null || !newCfo.getId().equals(existing.getCfo().getId())) {
                existing.setCfo(newCfo);
                updated = true;
            }
        }
        
        // Обновляем purchaseRequestId
        // ВАЖНО: Всегда обновляем purchaseRequestId, если в новых данных он есть, даже если значения совпадают
        // Это нужно для случаев, когда purchaseRequestId был установлен в кеше Hibernate, но не сохранен в БД
        if (newData.getPurchaseRequestId() != null) {
            Long existingPrId = existing.getPurchaseRequestId();
            Long newPrId = newData.getPurchaseRequestId();
            if (existingPrId == null || !existingPrId.equals(newPrId)) {
                existing.setPurchaseRequestId(newPrId);
                updated = true;
                logger.info("Updated purchaseRequestId for purchase {}: {} -> {}", 
                    existing.getInnerId(), existingPrId, newPrId);
            } else {
                // Значения совпадают, но принудительно обновляем для гарантии сохранения в БД
                // Это нужно, если purchaseRequestId был установлен в кеше, но не сохранен в БД
                existing.setPurchaseRequestId(newPrId);
                updated = true;
                logger.info("Force updated purchaseRequestId for purchase {}: {} (values match, ensuring DB save)", 
                    existing.getInnerId(), newPrId);
            }
        }
        
        // Обновляем сумму (budgetAmount)
        if (newData.getBudgetAmount() != null) {
            if (existing.getBudgetAmount() == null || !existing.getBudgetAmount().equals(newData.getBudgetAmount())) {
                existing.setBudgetAmount(newData.getBudgetAmount());
                updated = true;
                logger.info("Updated budgetAmount for purchase {}: {} (existing was: {})", existing.getInnerId(), newData.getBudgetAmount(), existing.getBudgetAmount());
            } else {
                logger.debug("BudgetAmount for purchase {} unchanged: {}", existing.getInnerId(), existing.getBudgetAmount());
            }
        } else {
            logger.debug("newData.getBudgetAmount() is null for purchase {}", existing.getInnerId());
        }
        
        // Обновляем валюту
        if (newData.getCurrency() != null && !newData.getCurrency().trim().isEmpty()) {
            if (existing.getCurrency() == null || !existing.getCurrency().equals(newData.getCurrency())) {
                existing.setCurrency(newData.getCurrency());
                updated = true;
                logger.debug("Updated currency for purchase {}: {}", existing.getInnerId(), newData.getCurrency());
            }
        }
        
        // Обновляем state
        if (newData.getState() != null && !newData.getState().trim().isEmpty()) {
            if (existing.getState() == null || !existing.getState().equals(newData.getState())) {
                existing.setState(newData.getState());
                updated = true;
                logger.debug("Updated state for purchase {}: {}", existing.getInnerId(), newData.getState());
            }
        }
        
        // Обновляем expenseItem
        if (newData.getExpenseItem() != null && !newData.getExpenseItem().trim().isEmpty()) {
            if (existing.getExpenseItem() == null || !existing.getExpenseItem().equals(newData.getExpenseItem())) {
                existing.setExpenseItem(newData.getExpenseItem());
                updated = true;
                logger.debug("Updated expenseItem for purchase {}: {}", existing.getInnerId(), newData.getExpenseItem());
            }
        }
        
        // Обновляем mcc (способ закупки)
        if (newData.getMcc() != null && !newData.getMcc().trim().isEmpty()) {
            if (existing.getMcc() == null || !existing.getMcc().equals(newData.getMcc())) {
                existing.setMcc(newData.getMcc());
                updated = true;
                logger.debug("Updated mcc for purchase {}: {}", existing.getInnerId(), newData.getMcc());
            }
        }
        
        // Обновляем contractInnerIds (множественные договоры)
        // Сравниваем множества внутренних номеров договоров
        java.util.Set<String> existingIds = existing.getContractInnerIds();
        java.util.Set<String> newIds = newData.getContractInnerIds();
        
        if (newIds == null || newIds.isEmpty()) {
            // Если в новых данных нет договоров, но в существующих были - очищаем
            if (existingIds != null && !existingIds.isEmpty()) {
                existing.clearContractInnerIds();
                updated = true;
                logger.debug("Cleared contractInnerIds for purchase {}", existing.getInnerId());
            }
        } else {
            // Проверяем, изменились ли договоры
            if (existingIds == null || existingIds.isEmpty()) {
                // Если в существующих нет договоров, добавляем новые
                for (String contractInnerId : newIds) {
                    if (contractInnerId != null && !contractInnerId.trim().isEmpty()) {
                        String trimmedId = contractInnerId.trim();
                        // Валидация: contractInnerId не должен совпадать с innerId закупки
                        if (!trimmedId.equals(existing.getInnerId())) {
                            existing.addContractInnerId(trimmedId);
                            updated = true;
                        }
                    }
                }
                if (updated) {
                    logger.debug("Added contractInnerIds for purchase {}: {}", existing.getInnerId(), newIds);
                }
            } else {
                // Сравниваем множества
                java.util.Set<String> toAdd = new java.util.HashSet<>(newIds);
                toAdd.removeAll(existingIds);
                java.util.Set<String> toRemove = new java.util.HashSet<>(existingIds);
                toRemove.removeAll(newIds);
                
                if (!toAdd.isEmpty() || !toRemove.isEmpty()) {
                    // Удаляем старые
                    for (String id : toRemove) {
                        existing.removeContractInnerId(id);
                    }
                    // Добавляем новые (с валидацией)
                    for (String contractInnerId : toAdd) {
                        if (contractInnerId != null && !contractInnerId.trim().isEmpty()) {
                            String trimmedId = contractInnerId.trim();
                            if (!trimmedId.equals(existing.getInnerId())) {
                                existing.addContractInnerId(trimmedId);
                            }
                        }
                    }
                    updated = true;
                    logger.debug("Updated contractInnerIds for purchase {}: removed {}, added {}", 
                        existing.getInnerId(), toRemove, toAdd);
                }
            }
        }
        
        // Обновляем status
        if (newData.getStatus() != null) {
            if (existing.getStatus() == null || !existing.getStatus().equals(newData.getStatus())) {
                existing.setStatus(newData.getStatus());
                updated = true;
                logger.debug("Updated status for purchase {}: {}", existing.getInnerId(), newData.getStatus());
            }
        }
        
        return updated;
    }
    
    /**
     * Обновляет поля существующего договора только если они отличаются
     */
    private boolean updateContractFields(Contract existing, Contract newData) {
        boolean updated = false;
        
        // Обновляем внутренний номер
        if (newData.getInnerId() != null && !newData.getInnerId().trim().isEmpty()) {
            if (existing.getInnerId() == null || !existing.getInnerId().equals(newData.getInnerId())) {
                existing.setInnerId(newData.getInnerId());
                updated = true;
            }
        }
        
        // Обновляем дату создания
        if (newData.getContractCreationDate() != null) {
            if (existing.getContractCreationDate() == null || 
                !existing.getContractCreationDate().equals(newData.getContractCreationDate())) {
                existing.setContractCreationDate(newData.getContractCreationDate());
                updated = true;
            }
        }
        
        // Обновляем ЦФО
        if (newData.getCfo() != null) {
            Cfo newCfo = newData.getCfo();
            if (existing.getCfo() == null || !newCfo.getId().equals(existing.getCfo().getId())) {
                existing.setCfo(newCfo);
                updated = true;
            }
        }
        
        // Обновляем наименование
        if (newData.getName() != null && !newData.getName().trim().isEmpty()) {
            if (existing.getName() == null || !existing.getName().equals(newData.getName())) {
                existing.setName(newData.getName());
                updated = true;
            }
        }
        
        // Обновляем заголовок
        if (newData.getTitle() != null && !newData.getTitle().trim().isEmpty()) {
            if (existing.getTitle() == null || !existing.getTitle().equals(newData.getTitle())) {
                existing.setTitle(newData.getTitle());
                updated = true;
            }
        }
        
        // Обновляем форму документа
        if (newData.getDocumentForm() != null && !newData.getDocumentForm().trim().isEmpty()) {
            if (existing.getDocumentForm() == null || !existing.getDocumentForm().equals(newData.getDocumentForm())) {
                existing.setDocumentForm(newData.getDocumentForm());
                updated = true;
            }
        }
        
        // Обновляем purchaseRequestId
        // ВАЖНО: Всегда обновляем purchaseRequestId, если в новых данных он есть, даже если значения совпадают
        // Это нужно для случаев, когда purchaseRequestId был установлен в кеше Hibernate, но не сохранен в БД
        if (newData.getPurchaseRequestId() != null) {
            Long existingPrId = existing.getPurchaseRequestId();
            Long newPrId = newData.getPurchaseRequestId();
            if (existingPrId == null || !existingPrId.equals(newPrId)) {
                existing.setPurchaseRequestId(newPrId);
                updated = true;
                logger.info("Updated purchaseRequestId for contract {}: {} -> {}", 
                    existing.getInnerId(), existingPrId, newPrId);
            } else {
                // Значения совпадают, но принудительно обновляем для гарантии сохранения в БД
                // Это нужно, если purchaseRequestId был установлен в кеше, но не сохранен в БД
                existing.setPurchaseRequestId(newPrId);
                updated = true;
                logger.info("Force updated purchaseRequestId for contract {}: {} (values match, ensuring DB save)", 
                    existing.getInnerId(), newPrId);
            }
        }
        
        // Обновляем сумму (budgetAmount)
        if (newData.getBudgetAmount() != null) {
            if (existing.getBudgetAmount() == null || !existing.getBudgetAmount().equals(newData.getBudgetAmount())) {
                existing.setBudgetAmount(newData.getBudgetAmount());
                updated = true;
                logger.debug("Updated budgetAmount for contract {}: {}", existing.getInnerId(), newData.getBudgetAmount());
            }
        }
        
        // Обновляем валюту
        if (newData.getCurrency() != null && !newData.getCurrency().trim().isEmpty()) {
            if (existing.getCurrency() == null || !existing.getCurrency().equals(newData.getCurrency())) {
                existing.setCurrency(newData.getCurrency());
                updated = true;
                logger.debug("Updated currency for contract {}: {}", existing.getInnerId(), newData.getCurrency());
            }
        }
        
        // Обновляем state
        if (newData.getState() != null && !newData.getState().trim().isEmpty()) {
            if (existing.getState() == null || !existing.getState().equals(newData.getState())) {
                existing.setState(newData.getState());
                updated = true;
                logger.debug("Updated state for contract {}: {}", existing.getInnerId(), newData.getState());
            }
        }
        
        // Обновляем status
        if (newData.getStatus() != null) {
            if (existing.getStatus() == null || !existing.getStatus().equals(newData.getStatus())) {
                existing.setStatus(newData.getStatus());
                updated = true;
                logger.debug("Updated status for contract {}: {}", existing.getInnerId(), newData.getStatus());
            }
        }
        
        // Обновляем parentContractId
        // ВАЖНО: Всегда обновляем parentContractId, если в новых данных он есть, даже если значения совпадают
        // Это нужно для случаев, когда parentContractId был установлен в кеше Hibernate, но не сохранен в БД
        if (newData.getParentContractId() != null) {
            Long existingParentId = existing.getParentContractId();
            Long newParentId = newData.getParentContractId();
            if (existingParentId == null || !existingParentId.equals(newParentId)) {
                existing.setParentContractId(newParentId);
                updated = true;
                logger.info("Updated parentContractId for contract {}: {} -> {}", 
                    existing.getInnerId(), existingParentId, newParentId);
            } else {
                // Значения совпадают, но принудительно обновляем для гарантии сохранения в БД
                // Это нужно, если parentContractId был установлен в кеше, но не сохранен в БД
                existing.setParentContractId(newParentId);
                updated = true;
                logger.info("Force updated parentContractId for contract {}: {} (values match, ensuring DB save)", 
                    existing.getInnerId(), newParentId);
            }
        }
        
        // Обновляем плановую дату начала поставки
        if (newData.getPlannedDeliveryStartDate() != null) {
            if (existing.getPlannedDeliveryStartDate() == null || !existing.getPlannedDeliveryStartDate().equals(newData.getPlannedDeliveryStartDate())) {
                existing.setPlannedDeliveryStartDate(newData.getPlannedDeliveryStartDate());
                updated = true;
                logger.debug("Updated plannedDeliveryStartDate for contract {}: {}", existing.getInnerId(), newData.getPlannedDeliveryStartDate());
            }
        }
        
        // Обновляем плановую дату окончания поставки
        if (newData.getPlannedDeliveryEndDate() != null) {
            if (existing.getPlannedDeliveryEndDate() == null || !existing.getPlannedDeliveryEndDate().equals(newData.getPlannedDeliveryEndDate())) {
                existing.setPlannedDeliveryEndDate(newData.getPlannedDeliveryEndDate());
                updated = true;
                logger.debug("Updated plannedDeliveryEndDate for contract {}: {}", existing.getInnerId(), newData.getPlannedDeliveryEndDate());
            }
        }
        
        return updated;
    }
    
    /**
     * Парсит purchaseRequestId из ссылки (формат "N <число>")
     */
    private Long parsePurchaseRequestIdFromLink(String link) {
        if (link == null || link.trim().isEmpty()) {
            return null;
        }
        
        try {
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("N\\s+(\\d+)");
            java.util.regex.Matcher matcher = pattern.matcher(link);
            
            if (matcher.find()) {
                String numberStr = matcher.group(1);
                return Long.parseLong(numberStr);
            }
        } catch (Exception e) {
            logger.warn("Error parsing purchaseRequestId from link '{}': {}", link, e.getMessage());
        }
        
        return null;
    }
    
    /**
     * Сохраняет все накопленные сущности пакетами (вызывается в конце обработки файла)
     */
    public void flushAllBatches() {
        flushCfoBatch();
        flushPurchaseRequestBatch();
        flushPurchaseBatch();
        flushContractBatch();
    }
    
    /**
     * Сохраняет накопленные заявки на закупку пакетом
     */
    private void flushPurchaseRequestBatch() {
        if (!purchaseRequestBatch.isEmpty()) {
            try {
                purchaseRequestRepository.saveAll(purchaseRequestBatch);
                logger.debug("Flushed {} purchase requests to database", purchaseRequestBatch.size());
                purchaseRequestBatch.clear();
            } catch (Exception e) {
                logger.error("Error flushing purchase request batch: {}", e.getMessage(), e);
            }
        }
    }
    
    /**
     * Сохраняет накопленные закупки пакетом
     */
    private void flushPurchaseBatch() {
        if (!purchaseBatch.isEmpty()) {
            try {
                purchaseRepository.saveAll(purchaseBatch);
                logger.debug("Flushed {} purchases to database", purchaseBatch.size());
                purchaseBatch.clear();
            } catch (Exception e) {
                logger.error("Error flushing purchase batch: {}", e.getMessage(), e);
            }
        }
    }
    
    /**
     * Сохраняет накопленные договоры пакетом
     */
    private void flushContractBatch() {
        if (!contractBatch.isEmpty()) {
            try {
                contractRepository.saveAll(contractBatch);
                logger.debug("Flushed {} contracts to database", contractBatch.size());
                contractBatch.clear();
            } catch (Exception e) {
                logger.error("Error flushing contract batch: {}", e.getMessage(), e);
            }
        }
    }
    
    public Map<String, Integer> getResults() {
        // Сохраняем все оставшиеся сущности перед возвратом результатов
        flushAllBatches();
        
        Map<String, Integer> results = new HashMap<>();
        results.put("purchaseRequests", purchaseRequestsCount);
        results.put("purchases", purchasesCount);
        results.put("contracts", contractsCount);
        results.put("users", usersCount);
        results.put("purchaseRequestsCreated", purchaseRequestsCreated);
        results.put("purchaseRequestsUpdated", purchaseRequestsUpdated);
        results.put("purchasesCreated", purchasesCreated);
        results.put("purchasesUpdated", purchasesUpdated);
        results.put("contractsCreated", contractsCreated);
        results.put("contractsUpdated", contractsUpdated);
        results.put("usersCreated", usersCreated);
        results.put("usersUpdated", usersUpdated);
        return results;
    }
    
    @Override
    public void headerFooter(String text, boolean isHeader, String tagName) {
        // Игнорируем header/footer
    }
}

