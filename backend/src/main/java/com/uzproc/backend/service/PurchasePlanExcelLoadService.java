package com.uzproc.backend.service;

import com.uzproc.backend.entity.PurchasePlanItem;
import com.uzproc.backend.repository.PurchasePlanItemRepository;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Optional;

@Service
public class PurchasePlanExcelLoadService {

    private static final Logger logger = LoggerFactory.getLogger(PurchasePlanExcelLoadService.class);
    
    // Названия колонок в Excel файле плана закупок
    private static final String YEAR_COLUMN = "Год";
    private static final String COMPANY_COLUMN = "Компания";
    private static final String CFO_COLUMN = "ЦФО";
    private static final String PURCHASE_SUBJECT_COLUMN = "Предмет закупки";
    private static final String BUDGET_AMOUNT_COLUMN = "Бюждетзакупки/суммадоговора(UZS)";
    private static final String CONTRACT_END_DATE_COLUMN = "Срок окончания действия договора";
    private static final String REQUEST_DATE_COLUMN = "Дата заявки";
    private static final String NEW_CONTRACT_DATE_COLUMN = "Дата нового договора";

    private final PurchasePlanItemRepository purchasePlanItemRepository;
    private final DataFormatter dataFormatter = new DataFormatter();

    public PurchasePlanExcelLoadService(PurchasePlanItemRepository purchasePlanItemRepository) {
        this.purchasePlanItemRepository = purchasePlanItemRepository;
    }

    /**
     * Загружает позиции плана закупок из Excel файла
     * 
     * @param excelFile файл Excel с планом закупок
     * @return количество загруженных записей
     */
    @Transactional
    public int loadPurchasePlanItemsFromExcel(File excelFile) throws IOException {
        Workbook workbook;
        try (FileInputStream fis = new FileInputStream(excelFile)) {
            if (excelFile.getName().endsWith(".xlsx")) {
                workbook = new XSSFWorkbook(fis);
            } else {
                workbook = new HSSFWorkbook(fis);
            }
        }

        try {
            // Ищем лист "Данные"
            Sheet sheet = null;
            for (int i = 0; i < workbook.getNumberOfSheets(); i++) {
                String sheetName = workbook.getSheetName(i);
                if ("Данные".equalsIgnoreCase(sheetName.trim())) {
                    sheet = workbook.getSheetAt(i);
                    logger.info("Found sheet 'Данные' at index {}", i);
                    break;
                }
            }
            
            // Если не нашли лист "Данные", используем первый лист
            if (sheet == null) {
                logger.warn("Sheet 'Данные' not found, using first sheet");
                sheet = workbook.getSheetAt(0);
            }
            
            // Ищем заголовки в первых строках (на случай, если структура файла изменилась)
            Row headerRow = null;
            int headerRowIndex = -1;
            Map<String, Integer> columnIndexMap = null;
            
            // Пробуем найти заголовки в первых 10 строках
            for (int i = 0; i < 10 && i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null) {
                    continue;
                }
                
                Map<String, Integer> tempMap = buildColumnIndexMap(row);
                
                // Проверяем, есть ли в этой строке хотя бы несколько ожидаемых колонок
                int foundColumns = 0;
                if (tempMap.containsKey(YEAR_COLUMN) || findColumnIndex(tempMap, YEAR_COLUMN) != null) foundColumns++;
                if (tempMap.containsKey(COMPANY_COLUMN) || findColumnIndex(tempMap, COMPANY_COLUMN) != null) foundColumns++;
                if (tempMap.containsKey(CFO_COLUMN) || findColumnIndex(tempMap, CFO_COLUMN) != null) foundColumns++;
                if (tempMap.containsKey(PURCHASE_SUBJECT_COLUMN) || findColumnIndex(tempMap, PURCHASE_SUBJECT_COLUMN) != null) foundColumns++;
                
                // Если нашли хотя бы 2 из 4 основных колонок, считаем это заголовками
                if (foundColumns >= 2) {
                    headerRow = row;
                    headerRowIndex = i;
                    columnIndexMap = tempMap;
                    logger.info("Found header row at index {} (0-based)", i);
                    break;
                }
            }
            
            if (headerRow == null || columnIndexMap == null) {
                logger.error("Could not find header row in first 10 rows of file {}", excelFile.getName());
                return 0;
            }
            
            // Создаем итератор, начиная со строки после заголовков
            Iterator<Row> rowIterator = sheet.iterator();
            // Пропускаем строки до заголовков
            for (int i = 0; i <= headerRowIndex; i++) {
                if (rowIterator.hasNext()) {
                    rowIterator.next();
                }
            }
            
            // Находим индексы колонок с альтернативными названиями
            Integer yearColumnIndex = findColumnIndex(columnIndexMap, YEAR_COLUMN);
            if (yearColumnIndex == null) {
                yearColumnIndex = findColumnIndex(columnIndexMap, "Год плана");
            }
            
            Integer companyColumnIndex = findColumnIndex(columnIndexMap, COMPANY_COLUMN);
            if (companyColumnIndex == null) {
                companyColumnIndex = findColumnIndex(columnIndexMap, "Компания/Организация");
            }
            
            Integer cfoColumnIndex = findColumnIndex(columnIndexMap, CFO_COLUMN);
            if (cfoColumnIndex == null) {
                cfoColumnIndex = findColumnIndex(columnIndexMap, "Центр финансовой ответственности");
            }
            
            Integer purchaseSubjectColumnIndex = findColumnIndex(columnIndexMap, PURCHASE_SUBJECT_COLUMN);
            if (purchaseSubjectColumnIndex == null) {
                purchaseSubjectColumnIndex = findColumnIndex(columnIndexMap, "Предмет");
            }
            if (purchaseSubjectColumnIndex == null) {
                purchaseSubjectColumnIndex = findColumnIndex(columnIndexMap, "Наименование предмета закупки");
            }
            
            // Пробуем найти колонку бюджета с разными вариантами названия
            Integer budgetAmountColumnIndex = findColumnIndex(columnIndexMap, BUDGET_AMOUNT_COLUMN);
            if (budgetAmountColumnIndex == null) {
                budgetAmountColumnIndex = findColumnIndex(columnIndexMap, "Бюджет закупки/сумма договора(UZS)");
            }
            if (budgetAmountColumnIndex == null) {
                budgetAmountColumnIndex = findColumnIndex(columnIndexMap, "Бюждетзакупки/суммадоговора(UZS)");
            }
            if (budgetAmountColumnIndex == null) {
                budgetAmountColumnIndex = findColumnIndex(columnIndexMap, "Бюджет закупки/сумма договора");
            }
            if (budgetAmountColumnIndex == null) {
                budgetAmountColumnIndex = findColumnIndex(columnIndexMap, "Бюджет закупки");
            }
            if (budgetAmountColumnIndex == null) {
                budgetAmountColumnIndex = findColumnIndex(columnIndexMap, "Бюджет");
            }
            if (budgetAmountColumnIndex == null) {
                budgetAmountColumnIndex = findColumnIndex(columnIndexMap, "Сумма договора");
            }
            
            Integer contractEndDateColumnIndex = findColumnIndex(columnIndexMap, CONTRACT_END_DATE_COLUMN);
            if (contractEndDateColumnIndex == null) {
                contractEndDateColumnIndex = findColumnIndex(columnIndexMap, "Срок окончания договора");
            }
            if (contractEndDateColumnIndex == null) {
                contractEndDateColumnIndex = findColumnIndex(columnIndexMap, "Дата окончания договора");
            }
            
            Integer requestDateColumnIndex = findColumnIndex(columnIndexMap, REQUEST_DATE_COLUMN);
            if (requestDateColumnIndex == null) {
                requestDateColumnIndex = findColumnIndex(columnIndexMap, "Дата заявки на закупку");
            }
            
            Integer newContractDateColumnIndex = findColumnIndex(columnIndexMap, NEW_CONTRACT_DATE_COLUMN);
            if (newContractDateColumnIndex == null) {
                newContractDateColumnIndex = findColumnIndex(columnIndexMap, "Дата нового контракта");
            }
            
            // Логируем все найденные колонки
            logger.info("All columns in Excel file:");
            for (Map.Entry<String, Integer> entry : columnIndexMap.entrySet()) {
                logger.info("  Column {}: '{}'", entry.getValue(), entry.getKey());
            }
            
            // Логируем найденные колонки
            logger.info("Found columns - year: {}, company: {}, cfo: {}, purchaseSubject: {}, budgetAmount: {}, " +
                    "contractEndDate: {}, requestDate: {}, newContractDate: {}",
                    yearColumnIndex, companyColumnIndex, cfoColumnIndex, purchaseSubjectColumnIndex,
                    budgetAmountColumnIndex, contractEndDateColumnIndex, requestDateColumnIndex, newContractDateColumnIndex);
            
            int loadedCount = 0;
            int skippedCount = 0;
            
            // Обрабатываем все строки
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                
                if (isRowEmpty(row)) {
                    continue;
                }

                try {
                    PurchasePlanItem item = parsePurchasePlanItemRow(row, yearColumnIndex, companyColumnIndex,
                            cfoColumnIndex, purchaseSubjectColumnIndex, budgetAmountColumnIndex,
                            contractEndDateColumnIndex, requestDateColumnIndex, newContractDateColumnIndex);
                    
                    if (item != null && item.getPurchaseSubject() != null && !item.getPurchaseSubject().trim().isEmpty()) {
                        // Проверяем, существует ли уже запись с таким же purchase_subject (без учета регистра)
                        Optional<PurchasePlanItem> existingItem = purchasePlanItemRepository.findByPurchaseSubjectIgnoreCase(item.getPurchaseSubject().trim());
                        
                        if (existingItem.isPresent()) {
                            // Обновляем существующую запись
                            PurchasePlanItem existing = existingItem.get();
                            updatePurchasePlanItemFields(existing, item);
                            purchasePlanItemRepository.save(existing);
                            logger.debug("Updated existing purchase plan item with subject: {}", item.getPurchaseSubject());
                        } else {
                            // Создаем новую запись
                            purchasePlanItemRepository.save(item);
                            logger.debug("Created new purchase plan item with subject: {}", item.getPurchaseSubject());
                        }
                        loadedCount++;
                    } else {
                        skippedCount++;
                        if (item != null && (item.getPurchaseSubject() == null || item.getPurchaseSubject().trim().isEmpty())) {
                            logger.debug("Skipping row {}: purchase subject is empty", row.getRowNum() + 1);
                        }
                    }
                } catch (Exception e) {
                    logger.warn("Error processing purchase plan item row {}: {}", row.getRowNum() + 1, e.getMessage());
                    skippedCount++;
                }
            }
            
            logger.info("Loaded {} purchase plan items from file {}, skipped {}", loadedCount, excelFile.getName(), skippedCount);
            return loadedCount;
        } finally {
            workbook.close();
        }
    }

    /**
     * Парсит строку Excel в PurchasePlanItem
     */
    private PurchasePlanItem parsePurchasePlanItemRow(Row row, Integer yearColumnIndex, Integer companyColumnIndex,
            Integer cfoColumnIndex, Integer purchaseSubjectColumnIndex, Integer budgetAmountColumnIndex,
            Integer contractEndDateColumnIndex, Integer requestDateColumnIndex, Integer newContractDateColumnIndex) {
        PurchasePlanItem item = new PurchasePlanItem();
        
        try {
            // Год
            if (yearColumnIndex != null) {
                Cell yearCell = row.getCell(yearColumnIndex);
                Integer year = parseIntegerCell(yearCell);
                if (year != null) {
                    item.setYear(year);
                }
            }
            
            // Компания
            if (companyColumnIndex != null) {
                Cell companyCell = row.getCell(companyColumnIndex);
                String company = getCellValueAsString(companyCell);
                if (company != null && !company.trim().isEmpty()) {
                    item.setCompany(company.trim());
                }
            }
            
            // ЦФО
            if (cfoColumnIndex != null) {
                Cell cfoCell = row.getCell(cfoColumnIndex);
                String cfo = getCellValueAsString(cfoCell);
                if (cfo != null && !cfo.trim().isEmpty()) {
                    item.setCfo(cfo.trim());
                }
            }
            
            // Предмет закупки
            if (purchaseSubjectColumnIndex != null) {
                Cell purchaseSubjectCell = row.getCell(purchaseSubjectColumnIndex);
                String purchaseSubject = getCellValueAsString(purchaseSubjectCell);
                if (purchaseSubject != null && !purchaseSubject.trim().isEmpty()) {
                    item.setPurchaseSubject(purchaseSubject.trim());
                }
            }
            
            // Бюджет закупки/сумма договора
            if (budgetAmountColumnIndex != null) {
                Cell budgetAmountCell = row.getCell(budgetAmountColumnIndex);
                if (budgetAmountCell != null) {
                    String cellValue = dataFormatter.formatCellValue(budgetAmountCell);
                    logger.debug("Row {}: Budget cell value (raw): '{}', cell type: {}", 
                            row.getRowNum() + 1, cellValue, budgetAmountCell.getCellType());
                    BigDecimal budgetAmount = parseBigDecimalCell(budgetAmountCell);
                    if (budgetAmount != null) {
                        item.setBudgetAmount(budgetAmount);
                        logger.debug("Row {}: Parsed budget amount: {}", row.getRowNum() + 1, budgetAmount);
                    } else {
                        logger.warn("Row {}: Failed to parse budget amount from cell value: '{}'", 
                                row.getRowNum() + 1, cellValue);
                    }
                } else {
                    logger.debug("Row {}: Budget cell is null", row.getRowNum() + 1);
                }
            } else {
                logger.warn("Budget amount column not found in Excel file");
            }
            
            // Срок окончания действия договора
            if (contractEndDateColumnIndex != null) {
                Cell contractEndDateCell = row.getCell(contractEndDateColumnIndex);
                LocalDate contractEndDate = parseLocalDateCell(contractEndDateCell);
                if (contractEndDate != null) {
                    item.setContractEndDate(contractEndDate);
                }
            }
            
            // Дата заявки
            if (requestDateColumnIndex != null) {
                Cell requestDateCell = row.getCell(requestDateColumnIndex);
                LocalDate requestDate = parseLocalDateCell(requestDateCell);
                if (requestDate != null) {
                    item.setRequestDate(requestDate);
                }
            }
            
            // Дата нового договора
            if (newContractDateColumnIndex != null) {
                Cell newContractDateCell = row.getCell(newContractDateColumnIndex);
                LocalDate newContractDate = parseLocalDateCell(newContractDateCell);
                if (newContractDate != null) {
                    item.setNewContractDate(newContractDate);
                }
            }
            
            return item;
        } catch (Exception e) {
            logger.error("Error parsing PurchasePlanItem row {}: {}", row.getRowNum() + 1, e.getMessage(), e);
            return null;
        }
    }

    /**
     * Парсит ячейку в Integer
     */
    private Integer parseIntegerCell(Cell cell) {
        if (cell == null) {
            return null;
        }
        
        try {
            switch (cell.getCellType()) {
                case NUMERIC:
                    double numValue = cell.getNumericCellValue();
                    return (int) numValue;
                case STRING:
                    String strValue = cell.getStringCellValue().trim();
                    if (strValue.isEmpty()) {
                        return null;
                    }
                    // Убираем пробелы и запятые (разделители тысяч)
                    strValue = strValue.replaceAll("[\\s,]", "");
                    return Integer.parseInt(strValue);
                case FORMULA:
                    if (cell.getCachedFormulaResultType() == CellType.NUMERIC) {
                        return (int) cell.getNumericCellValue();
                    } else if (cell.getCachedFormulaResultType() == CellType.STRING) {
                        String formulaValue = cell.getStringCellValue().trim();
                        formulaValue = formulaValue.replaceAll("[\\s,]", "");
                        return Integer.parseInt(formulaValue);
                    }
                    return null;
                default:
                    return null;
            }
        } catch (NumberFormatException e) {
            logger.warn("Cannot parse Integer from cell: {}", getCellValueAsString(cell));
            return null;
        }
    }

    /**
     * Парсит ячейку в BigDecimal
     *
     * Для бюджета плана закупок нам важно корректно читать большие целые значения в UZS,
     * которые в Excel могут быть:
     * - числовыми с форматированием разрядов;
     * - строками с пробелами, неразрывными пробелами, суффиксом "UZS" и т.п.
     *
     * Используем комбинированный подход: для NUMERIC ячеек берем значение напрямую,
     * для STRING и FORMULA - парсим строковое представление.
     */
    private BigDecimal parseBigDecimalCell(Cell cell) {
        if (cell == null) {
            logger.debug("parseBigDecimalCell: cell is null");
            return null;
        }

        try {
            // Проверяем тип ячейки
            CellType cellType = cell.getCellType();
            
            // Если ячейка пустая (BLANK), возвращаем null
            if (cellType == CellType.BLANK) {
                logger.debug("parseBigDecimalCell: cell is BLANK");
                return null;
            }
            
            // Если ячейка имеет тип NUMERIC, берем значение напрямую для точности
            if (cellType == CellType.NUMERIC) {
                // Проверяем, не является ли это датой
                if (!DateUtil.isCellDateFormatted(cell)) {
                    double numValue = cell.getNumericCellValue();
                    // Проверяем, что это не NaN и не Infinity
                    if (!Double.isNaN(numValue) && !Double.isInfinite(numValue)) {
                        BigDecimal result = BigDecimal.valueOf(numValue);
                        logger.debug("parseBigDecimalCell: parsed from NUMERIC: {}", result);
                        return result;
                    } else {
                        logger.warn("parseBigDecimalCell: NUMERIC value is NaN or Infinite: {}", numValue);
                    }
                } else {
                    logger.debug("parseBigDecimalCell: NUMERIC cell is date formatted, skipping");
                }
            }
            
            // Если ячейка имеет тип FORMULA с числовым результатом
            if (cellType == CellType.FORMULA) {
                CellType cachedType = cell.getCachedFormulaResultType();
                if (cachedType == CellType.NUMERIC) {
                    if (!DateUtil.isCellDateFormatted(cell)) {
                        double numValue = cell.getNumericCellValue();
                        if (!Double.isNaN(numValue) && !Double.isInfinite(numValue)) {
                            BigDecimal result = BigDecimal.valueOf(numValue);
                            logger.debug("parseBigDecimalCell: parsed from FORMULA NUMERIC: {}", result);
                            return result;
                        }
                    }
                } else if (cachedType == CellType.STRING) {
                    // Формула возвращает строку - обрабатываем как строку
                    String formulaValue = cell.getStringCellValue();
                    if (formulaValue != null && !formulaValue.trim().isEmpty()) {
                        return parseStringToBigDecimal(formulaValue);
                    }
                }
            }
            
            // Для STRING и других типов берем строковое представление через DataFormatter
            String raw = dataFormatter.formatCellValue(cell);
            logger.debug("parseBigDecimalCell: raw value from DataFormatter: '{}', cell type: {}", 
                    raw, cellType);
            
            if (raw == null) {
                logger.debug("parseBigDecimalCell: raw value is null");
                return null;
            }

            raw = raw.trim();
            if (raw.isEmpty() || raw.equals("-") || raw.equals("—")) {
                logger.debug("parseBigDecimalCell: raw value is empty or dash after trim");
                return null;
            }

            return parseStringToBigDecimal(raw);
        } catch (Exception e) {
            logger.warn("Cannot parse BigDecimal from cell: {}, error: {}", getCellValueAsString(cell), e.getMessage(), e);
            return null;
        }
    }
    
    /**
     * Парсит строку в BigDecimal, обрабатывая различные форматы
     */
    private BigDecimal parseStringToBigDecimal(String raw) {
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
            
            logger.debug("parseStringToBigDecimal: cleaned value: '{}'", cleaned);

            if (cleaned.isEmpty()) {
                logger.warn("Cannot parse BigDecimal from string (no digits after cleanup): '{}'", raw);
                return null;
            }

            BigDecimal result = new BigDecimal(cleaned);
            logger.debug("parseStringToBigDecimal: parsed BigDecimal: {}", result);
            return result;
        } catch (NumberFormatException e) {
            logger.warn("Cannot parse BigDecimal from string: '{}', error: {}", raw, e.getMessage());
            return null;
        }
    }

    /**
     * Парсит ячейку с датой в LocalDate
     */
    private LocalDate parseLocalDateCell(Cell cell) {
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
                        .toLocalDate();
                }
            }
            
            // Если ячейка имеет тип STRING, пытаемся распарсить строку
            if (cell.getCellType() == CellType.STRING) {
                String dateStr = getCellValueAsString(cell);
                if (dateStr != null && !dateStr.trim().isEmpty()) {
                    LocalDate parsedDate = parseStringDate(dateStr.trim());
                    if (parsedDate != null) {
                        return parsedDate;
                    }
                }
            }
            
            // Если ячейка имеет тип FORMULA
            if (cell.getCellType() == CellType.FORMULA) {
                if (cell.getCachedFormulaResultType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                    Date dateValue = cell.getDateCellValue();
                    if (dateValue != null) {
                        return dateValue.toInstant()
                            .atZone(ZoneId.systemDefault())
                            .toLocalDate();
                    }
                } else if (cell.getCachedFormulaResultType() == CellType.STRING) {
                    String dateStr = getCellValueAsString(cell);
                    if (dateStr != null && !dateStr.trim().isEmpty()) {
                        LocalDate parsedDate = parseStringDate(dateStr.trim());
                        if (parsedDate != null) {
                            return parsedDate;
                        }
                    }
                }
            }
            
            return null;
        } catch (Exception e) {
            logger.warn("Cannot parse LocalDate from cell: {}", getCellValueAsString(cell));
            return null;
        }
    }

    /**
     * Парсит строку с датой в LocalDate
     * Поддерживает различные форматы: dd.MM.yyyy, yyyy-MM-dd, dd/MM/yyyy и т.д.
     */
    private LocalDate parseStringDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }
        
        // Убираем лишние пробелы
        dateStr = dateStr.trim();
        
        // Пробуем различные форматы
        String[] formats = {
            "dd.MM.yyyy",
            "yyyy-MM-dd",
            "dd/MM/yyyy",
            "MM/dd/yyyy",
            "dd-MM-yyyy",
            "yyyy.MM.dd"
        };
        
        for (String format : formats) {
            try {
                java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern(format);
                return LocalDate.parse(dateStr, formatter);
            } catch (Exception e) {
                // Пробуем следующий формат
            }
        }
        
        // Если не удалось распарсить, пробуем стандартный парсер
        try {
            return LocalDate.parse(dateStr);
        } catch (Exception e) {
            logger.debug("Cannot parse date string: {}", dateStr);
            return null;
        }
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
                    if (i < 20) {
                        logger.debug("Column {}: [{}]", i, trimmed);
                    }
                }
            }
        }
        
        logger.info("Found {} columns in header", columnIndexMap.size());
        return columnIndexMap;
    }

    /**
     * Находит индекс колонки по точному или частичному совпадению
     */
    private Integer findColumnIndex(Map<String, Integer> columnIndexMap, String columnName) {
        // Сначала пробуем точное совпадение
        Integer exactMatch = columnIndexMap.get(columnName);
        if (exactMatch != null) {
            return exactMatch;
        }
        
        // Пробуем найти по частичному совпадению (без учета регистра)
        String normalizedColumnName = normalizeString(columnName);
        for (Map.Entry<String, Integer> entry : columnIndexMap.entrySet()) {
            String entryKey = entry.getKey();
            String normalizedEntryKey = normalizeString(entryKey);
            
            if (normalizedEntryKey.equals(normalizedColumnName)) {
                logger.info("Found column '{}' by normalized match: '{}'", columnName, entryKey);
                return entry.getValue();
            }
            
            if (entryKey.toLowerCase().contains(columnName.toLowerCase()) || 
                columnName.toLowerCase().contains(entryKey.toLowerCase()) ||
                normalizedEntryKey.contains(normalizedColumnName) || 
                normalizedColumnName.contains(normalizedEntryKey)) {
                logger.info("Found column '{}' by partial match: '{}'", columnName, entryKey);
                return entry.getValue();
            }
        }
        
        return null;
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
                try {
                    String value = dataFormatter.formatCellValue(cell);
                    if (value != null && !value.trim().isEmpty()) {
                        return value.trim();
                    }
                } catch (Exception e) {
                    logger.debug("Error reading with DataFormatter: {}", e.getMessage());
                }
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
            if (cell != null) {
                String value = getCellValueAsString(cell);
                if (value != null && !value.trim().isEmpty()) {
                    return false;
                }
            }
        }
        return true;
    }

    /**
     * Обновляет поля существующей записи плана закупок данными из новой записи
     */
    private void updatePurchasePlanItemFields(PurchasePlanItem existing, PurchasePlanItem newData) {
        boolean updated = false;
        
        if (newData.getYear() != null && !newData.getYear().equals(existing.getYear())) {
            existing.setYear(newData.getYear());
            updated = true;
        }
        
        if (newData.getCompany() != null && !newData.getCompany().trim().isEmpty() && 
            !newData.getCompany().equals(existing.getCompany())) {
            existing.setCompany(newData.getCompany());
            updated = true;
        }
        
        if (newData.getCfo() != null && !newData.getCfo().trim().isEmpty() && 
            !newData.getCfo().equals(existing.getCfo())) {
            existing.setCfo(newData.getCfo());
            updated = true;
        }
        
        if (newData.getBudgetAmount() != null && !newData.getBudgetAmount().equals(existing.getBudgetAmount())) {
            existing.setBudgetAmount(newData.getBudgetAmount());
            updated = true;
        }
        
        if (newData.getContractEndDate() != null && !newData.getContractEndDate().equals(existing.getContractEndDate())) {
            existing.setContractEndDate(newData.getContractEndDate());
            updated = true;
        }
        
        if (newData.getRequestDate() != null && !newData.getRequestDate().equals(existing.getRequestDate())) {
            existing.setRequestDate(newData.getRequestDate());
            updated = true;
        }
        
        if (newData.getNewContractDate() != null && !newData.getNewContractDate().equals(existing.getNewContractDate())) {
            existing.setNewContractDate(newData.getNewContractDate());
            updated = true;
        }
        
        if (updated) {
            logger.debug("Updated purchase plan item fields for subject: {}", existing.getPurchaseSubject());
        }
    }
}

