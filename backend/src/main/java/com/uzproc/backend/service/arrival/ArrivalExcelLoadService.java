package com.uzproc.backend.service.arrival;

import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Парсит Excel-файл arrival и отправляет строки на сохранение батчами.
 * Парсинг происходит без транзакции — транзакции создаются в ArrivalBatchSaver.
 */
@Service
public class ArrivalExcelLoadService {

    private static final Logger logger = LoggerFactory.getLogger(ArrivalExcelLoadService.class);

    private static final int BATCH_SIZE = 500;

    private static final String DATE_COLUMN = "Дата";
    private static final String NUMBER_COLUMN = "Номер";
    private static final String INN_COLUMN = "ИНН";
    private static final String INVOICE_COLUMN = "Счет-фактура";
    private static final String WAREHOUSE_COLUMN = "Склад";
    private static final String OPERATION_TYPE_COLUMN = "Вид операции";
    private static final String DEPARTMENT_COLUMN = "Подразделение";
    private static final String INCOMING_DATE_COLUMN = "Дата вх.";
    private static final String INCOMING_NUMBER_COLUMN = "Номер вх.";
    private static final String AMOUNT_COLUMN = "Сумма";
    private static final String CURRENCY_COLUMN = "Валюта";
    private static final String COMMENT_COLUMN = "Комментарий";
    private static final String RESPONSIBLE_COLUMN = "Ответственный";

    private static final DateTimeFormatter[] DATE_PARSERS = {
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("d.M.yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ISO_LOCAL_DATE
    };

    private final ArrivalBatchSaver batchSaver;
    private final DataFormatter dataFormatter = new DataFormatter();

    public ArrivalExcelLoadService(ArrivalBatchSaver batchSaver) {
        this.batchSaver = batchSaver;
    }

    /**
     * Парсит Excel и сохраняет батчами по BATCH_SIZE строк.
     * Каждый батч — отдельная транзакция (REQUIRES_NEW).
     */
    public int loadArrivalsFromExcel(File excelFile) throws IOException {
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
            Map<String, Integer> columnIndexMap = null;
            int headerRowIndex = -1;

            for (int i = 0; i < Math.min(10, sheet.getLastRowNum() + 1); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                Map<String, Integer> tempMap = buildColumnIndexMap(row);
                Integer numberIdx = findColumnIndex(tempMap, NUMBER_COLUMN);
                Integer dateIdx = findColumnIndex(tempMap, DATE_COLUMN);
                if (numberIdx != null || dateIdx != null) {
                    headerRowIndex = i;
                    columnIndexMap = tempMap;
                    break;
                }
            }

            if (columnIndexMap == null) {
                logger.warn("Arrivals: header row not found in file {} (checked first 10 rows)", excelFile.getName());
                return 0;
            }

            Integer dateColumnIndex = findColumnIndex(columnIndexMap, DATE_COLUMN);
            Integer numberColumnIndex = findColumnIndex(columnIndexMap, NUMBER_COLUMN);
            Integer innColumnIndex = findColumnIndex(columnIndexMap, INN_COLUMN);
            Integer invoiceColumnIndex = findColumnIndex(columnIndexMap, INVOICE_COLUMN);
            Integer warehouseColumnIndex = findColumnIndex(columnIndexMap, WAREHOUSE_COLUMN);
            Integer operationTypeColumnIndex = findColumnIndex(columnIndexMap, OPERATION_TYPE_COLUMN);
            Integer departmentColumnIndex = findColumnIndex(columnIndexMap, DEPARTMENT_COLUMN);
            Integer incomingDateColumnIndex = findColumnIndex(columnIndexMap, INCOMING_DATE_COLUMN);
            Integer incomingNumberColumnIndex = findColumnIndex(columnIndexMap, INCOMING_NUMBER_COLUMN);
            Integer amountColumnIndex = findColumnIndex(columnIndexMap, AMOUNT_COLUMN);
            Integer currencyColumnIndex = findColumnIndex(columnIndexMap, CURRENCY_COLUMN);
            Integer commentColumnIndex = findColumnIndex(columnIndexMap, COMMENT_COLUMN);
            Integer responsibleColumnIndex = findColumnIndex(columnIndexMap, RESPONSIBLE_COLUMN);

            logger.info("Arrivals: file {} columns -> Дата={}, Номер={}, ИНН={}, Счет-фактура={}, Склад={}, Вид операции={}, Подразделение={}, Дата вх.={}, Номер вх.={}, Сумма={}, Валюта={}, Комментарий={}, Ответственный={}",
                    excelFile.getName(), dateColumnIndex, numberColumnIndex, innColumnIndex, invoiceColumnIndex,
                    warehouseColumnIndex, operationTypeColumnIndex, departmentColumnIndex, incomingDateColumnIndex,
                    incomingNumberColumnIndex, amountColumnIndex, currencyColumnIndex, commentColumnIndex, responsibleColumnIndex);

            Iterator<Row> rowIterator = sheet.iterator();
            for (int i = 0; i <= headerRowIndex && rowIterator.hasNext(); i++) {
                rowIterator.next();
            }

            int loadedCount = 0;
            int skippedNoNumber = 0;
            int batchNumber = 0;
            Set<String> numbersSeen = new HashSet<>();
            List<ArrivalRowData> batch = new ArrayList<>(BATCH_SIZE);

            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                if (isRowEmpty(row)) continue;
                try {
                    ArrivalRowData data = parseRow(row, dateColumnIndex, numberColumnIndex, innColumnIndex,
                            invoiceColumnIndex, warehouseColumnIndex, operationTypeColumnIndex, departmentColumnIndex,
                            incomingDateColumnIndex, incomingNumberColumnIndex, amountColumnIndex, currencyColumnIndex,
                            commentColumnIndex, responsibleColumnIndex);

                    if (data == null || data.number == null || data.number.trim().isEmpty()) {
                        skippedNoNumber++;
                        continue;
                    }

                    String numberTrimmed = data.number.trim();
                    if (numbersSeen.contains(numberTrimmed)) {
                        continue;
                    }
                    numbersSeen.add(numberTrimmed);

                    batch.add(data);

                    if (batch.size() >= BATCH_SIZE) {
                        batchNumber++;
                        loadedCount += batchSaver.saveBatch(batch);
                        logger.debug("Arrivals: batch {} saved ({} rows so far)", batchNumber, loadedCount);
                        batch = new ArrayList<>(BATCH_SIZE);
                    }
                } catch (Exception e) {
                    logger.warn("Error parsing arrival row {}: {}", row.getRowNum() + 1, e.getMessage());
                }
            }

            // Последний неполный батч
            if (!batch.isEmpty()) {
                batchNumber++;
                loadedCount += batchSaver.saveBatch(batch);
                logger.debug("Arrivals: final batch {} saved ({} rows total)", batchNumber, loadedCount);
            }

            logger.info("Loaded {} arrivals from file {} in {} batches (batch size={}, skipped without number: {})",
                    loadedCount, excelFile.getName(), batchNumber, BATCH_SIZE, skippedNoNumber);
            return loadedCount;
        } finally {
            workbook.close();
        }
    }

    private ArrivalRowData parseRow(Row row, Integer dateIdx, Integer numberIdx, Integer innIdx,
                                     Integer invoiceIdx, Integer warehouseIdx, Integer operationTypeIdx,
                                     Integer departmentIdx, Integer incomingDateIdx, Integer incomingNumberIdx,
                                     Integer amountIdx, Integer currencyIdx,
                                     Integer commentIdx, Integer responsibleIdx) {
        ArrivalRowData data = new ArrivalRowData();

        if (dateIdx != null) {
            data.date = parseDateCell(row.getCell(dateIdx));
        }

        if (numberIdx != null) {
            String value = getCellValueAsString(row.getCell(numberIdx));
            if (value != null && !value.trim().isEmpty()) {
                String trimmed = value.trim();
                if (trimmed.contains(".") && trimmed.matches("\\d+\\.0+")) {
                    trimmed = trimmed.replaceAll("\\.0+$", "");
                }
                data.number = trimmed;
            }
        }

        if (innIdx != null) {
            String inn = getCellValueAsString(row.getCell(innIdx));
            if (inn != null && !inn.trim().isEmpty()) {
                String innTrimmed = inn.trim();
                if (innTrimmed.contains(".") && innTrimmed.matches("\\d+\\.0+")) {
                    innTrimmed = innTrimmed.replaceAll("\\.0+$", "");
                }
                data.inn = innTrimmed;
            }
        }

        if (invoiceIdx != null) {
            String value = getCellValueAsString(row.getCell(invoiceIdx));
            if (value != null && !value.trim().isEmpty()) data.invoice = value.trim();
        }

        if (warehouseIdx != null) {
            String value = getCellValueAsString(row.getCell(warehouseIdx));
            if (value != null && !value.trim().isEmpty()) data.warehouse = value.trim();
        }

        if (operationTypeIdx != null) {
            String value = getCellValueAsString(row.getCell(operationTypeIdx));
            if (value != null && !value.trim().isEmpty()) data.operationType = value.trim();
        }

        if (departmentIdx != null) {
            String value = getCellValueAsString(row.getCell(departmentIdx));
            if (value != null && !value.trim().isEmpty()) data.department = value.trim();
        }

        if (incomingDateIdx != null) {
            data.incomingDate = parseDateCell(row.getCell(incomingDateIdx));
        }

        if (incomingNumberIdx != null) {
            String value = getCellValueAsString(row.getCell(incomingNumberIdx));
            if (value != null && !value.trim().isEmpty()) {
                String trimmed = value.trim();
                if (trimmed.contains(".") && trimmed.matches("\\d+\\.0+")) {
                    trimmed = trimmed.replaceAll("\\.0+$", "");
                }
                data.incomingNumber = trimmed;
            }
        }

        if (amountIdx != null) {
            Cell cell = row.getCell(amountIdx);
            if (cell != null) {
                try {
                    if (cell.getCellType() == CellType.NUMERIC) {
                        data.amount = BigDecimal.valueOf(cell.getNumericCellValue());
                    } else {
                        String val = getCellValueAsString(cell);
                        if (val != null && !val.trim().isEmpty()) {
                            String cleaned = val.trim().replace(",", ".").replaceAll("\\s+", "");
                            data.amount = new BigDecimal(cleaned);
                        }
                    }
                } catch (Exception e) {
                    logger.debug("Cannot parse amount from cell at row {}: {}", row.getRowNum() + 1, getCellValueAsString(cell));
                }
            }
        }

        if (currencyIdx != null) {
            String value = getCellValueAsString(row.getCell(currencyIdx));
            if (value != null && !value.trim().isEmpty()) data.currency = value.trim();
        }

        if (commentIdx != null) {
            String value = getCellValueAsString(row.getCell(commentIdx));
            if (value != null && !value.trim().isEmpty()) data.comment = value.trim();
        }

        if (responsibleIdx != null) {
            String value = getCellValueAsString(row.getCell(responsibleIdx));
            if (value != null && !value.trim().isEmpty()) data.responsible = value.trim();
        }

        return data;
    }

    private LocalDate parseDateCell(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                Date d = cell.getDateCellValue();
                if (d == null) return null;
                return Instant.ofEpochMilli(d.getTime()).atZone(ZoneId.systemDefault()).toLocalDate();
            }
            String raw = getCellValueAsString(cell);
            if (raw == null || raw.trim().isEmpty() || "-".equals(raw.trim()) || "\u2014".equals(raw.trim())) {
                return null;
            }
            String trimmed = raw.trim();
            for (DateTimeFormatter formatter : DATE_PARSERS) {
                try {
                    return LocalDate.parse(trimmed, formatter);
                } catch (DateTimeParseException ignored) {
                }
            }
        } catch (Exception e) {
            logger.debug("Cannot parse date from cell: {}", getCellValueAsString(cell));
        }
        return null;
    }

    private Map<String, Integer> buildColumnIndexMap(Row headerRow) {
        Map<String, Integer> map = new HashMap<>();
        for (int i = 0; i < headerRow.getLastCellNum(); i++) {
            Cell cell = headerRow.getCell(i);
            if (cell != null) {
                String value = getCellValueAsString(cell);
                if (value != null && !value.trim().isEmpty()) {
                    map.put(value.trim(), i);
                }
            }
        }
        return map;
    }

    private Integer findColumnIndex(Map<String, Integer> columnIndexMap, String columnName) {
        Integer exact = columnIndexMap.get(columnName);
        if (exact != null) return exact;
        String normalized = normalizeString(columnName);
        for (Map.Entry<String, Integer> e : columnIndexMap.entrySet()) {
            if (normalizeString(e.getKey()).equals(normalized)) return e.getValue();
            if (e.getKey().toLowerCase().contains(columnName.toLowerCase()) || columnName.toLowerCase().contains(e.getKey().toLowerCase())) {
                return e.getValue();
            }
        }
        return null;
    }

    private String normalizeString(String str) {
        if (str == null) return "";
        return str.toLowerCase().replaceAll("\\s+", "").trim();
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING:
                String s = cell.getStringCellValue();
                return s != null && !s.trim().isEmpty() ? s.trim() : null;
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                }
                double n = cell.getNumericCellValue();
                return n == (long) n ? String.valueOf((long) n) : String.valueOf(n);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return dataFormatter.formatCellValue(cell);
                } catch (Exception e) {
                    return null;
                }
            default:
                return null;
        }
    }

    private boolean isRowEmpty(Row row) {
        if (row == null) return true;
        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null) {
                String v = getCellValueAsString(cell);
                if (v != null && !v.trim().isEmpty()) return false;
            }
        }
        return true;
    }
}
