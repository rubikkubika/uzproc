package com.uzproc.backend.service;

import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.repository.PurchaseRequestRepository;
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

@Service
public class ExcelLoadService {

    private static final Logger logger = LoggerFactory.getLogger(ExcelLoadService.class);
    private static final String DOCUMENT_TYPE_COLUMN = "Вид документа";
    private static final String PURCHASE_REQUEST_TYPE = "Заявка на ЗП";
    private static final String REQUEST_NUMBER_COLUMN = "Номер заявки на ЗП";
    private static final String CREATION_DATE_COLUMN = "Дата создания";
    private static final String INNER_ID_COLUMN = "Внутренний номер";
    private static final String CFO_COLUMN = "ЦФО";
    private static final String NAME_COLUMN = "Наименование";
    private static final String TITLE_COLUMN = "Заголовок";
    private static final String REQUIRES_PURCHASE_COLUMN = "Требуется Закупка";

    private final PurchaseRequestRepository purchaseRequestRepository;
    private final DataFormatter dataFormatter = new DataFormatter();

    public ExcelLoadService(PurchaseRequestRepository purchaseRequestRepository) {
        this.purchaseRequestRepository = purchaseRequestRepository;
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
                        PurchaseRequest pr = parsePurchaseRequestRow(row, requestNumberColumnIndex, creationDateColumnIndex, innerIdColumnIndex, cfoColumnIndex, nameColumnIndex, titleColumnIndex, requiresPurchaseColumnIndex, requiresPurchaseColumnName);
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
        
        return updated;
    }

    /**
     * Парсит строку Excel в PurchaseRequest для типа "Заявка на ЗП"
     * Загружает "Номер заявки на ЗП", "Дата создания", "Внутренний номер", "ЦФО", "Наименование", "Заголовок" и "Требуется Закупка"
     */
    private PurchaseRequest parsePurchaseRequestRow(Row row, int requestNumberColumnIndex, int creationDateColumnIndex, Integer innerIdColumnIndex, Integer cfoColumnIndex, Integer nameColumnIndex, Integer titleColumnIndex, Integer requiresPurchaseColumnIndex, String requiresPurchaseColumnName) {
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
}

