package com.uzproc.backend.service;

import com.uzproc.backend.entity.Purchase;
import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.entity.User;
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
    private final UserRepository userRepository;
    private final DataFormatter dataFormatter;
    
    // Индексы колонок (определяются из заголовка)
    private Map<String, Integer> columnIndices = new HashMap<>();
    private boolean headerProcessed = false;
    private int currentRowNum = -1;
    private Map<Integer, String> currentRowData = new HashMap<>();
    
    // Счетчики
    private int purchaseRequestsCount = 0;
    private int purchasesCount = 0;
    private int usersCount = 0;
    private int purchaseRequestsCreated = 0;
    private int purchasesCreated = 0;
    
    // Константы
    private static final String DOCUMENT_TYPE_COLUMN = "Вид документа";
    private static final String PURCHASE_REQUEST_TYPE = "Заявка на ЗП";
    private static final String PURCHASE_TYPE = "Закупочная процедура";
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
    
    // Названия колонок для проверки инвертированной логики
    private String requiresPurchaseColumnName = null;
    private String planColumnName = null;
    
    public ExcelStreamingRowHandler(
            EntityExcelLoadService excelLoadService,
            PurchaseRequestRepository purchaseRequestRepository,
            PurchaseRepository purchaseRepository,
            UserRepository userRepository,
            StylesTable stylesTable,
            ReadOnlySharedStringsTable sharedStringsTable) {
        this.excelLoadService = excelLoadService;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.purchaseRepository = purchaseRepository;
        this.userRepository = userRepository;
        this.dataFormatter = new DataFormatter();
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
    }
    
    private void processDataRow() {
        try {
            // Получаем тип документа
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
            if (PURCHASE_REQUEST_TYPE.equals(trimmedDocType)) {
                processPurchaseRequestRow();
            } else if (PURCHASE_TYPE.equals(trimmedDocType)) {
                processPurchaseRow();
            }
            
            // Обрабатываем пользователей из колонки "Подготовил"
            processUserRow();
            
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
                    pr.setCfo(cfo.trim());
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
            if (requiresPurchaseCol == null) {
                requiresPurchaseCol = findColumnIndex("Требуется закупка");
            }
            if (requiresPurchaseCol == null) {
                requiresPurchaseCol = findColumnIndex("Не требуется ЗП (Заявка на ЗП)");
            }
            if (requiresPurchaseCol != null) {
                String cellValueStr = currentRowData.get(requiresPurchaseCol);
                boolean isInvertedLogic = requiresPurchaseColumnName != null && requiresPurchaseColumnName.contains("Не требуется");
                
                Boolean requiresPurchase = null;
                if (cellValueStr != null && !cellValueStr.trim().isEmpty()) {
                    Boolean parsedValue = parseBooleanString(cellValueStr);
                    if (parsedValue != null) {
                        if (isInvertedLogic) {
                            // Для колонки "Не требуется ЗП": "да" = не требуется (false), "нет" = требуется (true)
                            requiresPurchase = !parsedValue;
                        } else {
                            // Обычная логика: "да" = требуется (true), "нет" = не требуется (false)
                            requiresPurchase = parsedValue;
                        }
                    } else {
                        // Если значение не распознано, но колонка найдена, логируем
                        logger.debug("Row {}: Cannot parse requiresPurchase value '{}' (column: '{}')", 
                            currentRowNum + 1, cellValueStr, requiresPurchaseColumnName);
                    }
                } else if (isInvertedLogic) {
                    // Если колонка "Не требуется" и ячейка пустая, значит требуется
                    requiresPurchase = true;
                }
                
                if (requiresPurchase != null) {
                    pr.setRequiresPurchase(requiresPurchase);
                    logger.debug("Row {}: parsed requiresPurchase as: {} (column: '{}', value: '{}', inverted: {})", 
                        currentRowNum + 1, requiresPurchase, requiresPurchaseColumnName, cellValueStr, isInvertedLogic);
                }
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
            
            // Сохраняем или обновляем
            if (existingOpt.isPresent()) {
                PurchaseRequest existing = existingOpt.get();
                boolean updated = updatePurchaseRequestFields(existing, pr);
                if (updated) {
                    purchaseRequestRepository.save(existing);
                }
            } else {
                purchaseRequestRepository.save(pr);
                purchaseRequestsCreated++;
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
                    purchase.setCfo(cfo.trim());
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
                        }
                    }
                }
            }
            
            // Сохраняем или обновляем
            if (existingOpt.isPresent()) {
                Purchase existing = existingOpt.get();
                boolean updated = updatePurchaseFields(existing, purchase);
                if (updated) {
                    purchaseRepository.save(existing);
                }
            } else {
                purchaseRepository.save(purchase);
                purchasesCreated++;
            }
            purchasesCount++;
            
        } catch (Exception e) {
            logger.warn("Error processing purchase row {}: {}", currentRowNum + 1, e.getMessage(), e);
        }
    }
    
    private void processUserRow() {
        try {
            Integer preparedByCol = columnIndices.get(PREPARED_BY_COLUMN);
            if (preparedByCol == null) {
                return;
            }
            
            String preparedBy = currentRowData.get(preparedByCol);
            if (preparedBy != null && !preparedBy.trim().isEmpty()) {
                excelLoadService.parseAndSaveUser(preparedBy.trim());
                usersCount++;
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
            } catch (DateTimeParseException e) {
                // Пробуем следующий формат
            }
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
        if (newData.getCfo() != null && !newData.getCfo().trim().isEmpty()) {
            if (existing.getCfo() == null || !existing.getCfo().equals(newData.getCfo())) {
                existing.setCfo(newData.getCfo());
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
        if (newData.getRequiresPurchase() != null) {
            if (existing.getRequiresPurchase() == null || !existing.getRequiresPurchase().equals(newData.getRequiresPurchase())) {
                existing.setRequiresPurchase(newData.getRequiresPurchase());
                updated = true;
            }
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
        
        // Обновляем закупщика
        if (newData.getPurchaser() != null && !newData.getPurchaser().trim().isEmpty()) {
            if (existing.getPurchaser() == null || !existing.getPurchaser().equals(newData.getPurchaser())) {
                existing.setPurchaser(newData.getPurchaser());
                updated = true;
            }
        }
        
        return updated;
    }
    
    /**
     * Обновляет поля существующей закупки только если они отличаются
     */
    private boolean updatePurchaseFields(Purchase existing, Purchase newData) {
        boolean updated = false;
        
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
        if (newData.getCfo() != null && !newData.getCfo().trim().isEmpty()) {
            if (existing.getCfo() == null || !existing.getCfo().equals(newData.getCfo())) {
                existing.setCfo(newData.getCfo());
                updated = true;
            }
        }
        
        // Обновляем purchaseRequestId
        if (newData.getPurchaseRequestId() != null) {
            if (existing.getPurchaseRequestId() == null || !existing.getPurchaseRequestId().equals(newData.getPurchaseRequestId())) {
                existing.setPurchaseRequestId(newData.getPurchaseRequestId());
                updated = true;
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
    
    public Map<String, Integer> getResults() {
        Map<String, Integer> results = new HashMap<>();
        results.put("purchaseRequests", purchaseRequestsCount);
        results.put("purchases", purchasesCount);
        results.put("users", usersCount);
        results.put("purchaseRequestsCreated", purchaseRequestsCreated);
        results.put("purchasesCreated", purchasesCreated);
        return results;
    }
    
    @Override
    public void headerFooter(String text, boolean isHeader, String tagName) {
        // Игнорируем header/footer
    }
}

