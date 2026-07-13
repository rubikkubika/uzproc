package com.uzproc.backend.service.handreport;

import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.contract.ContractStatus;
import com.uzproc.backend.repository.contract.ContractRepository;
import com.uzproc.backend.service.delivery.DeliveryService;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Date;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Парсинг ручного отчёта по договорам (папка upload/handreport).
 * По колонке «ЗП/заявка» берём номер заявки; если по нему есть подписанные договоры-спецификации,
 * создаём поставку «по нашим правилам» (если ещё нет) и проставляем «Дата отгрузки (факт)»
 * в фактическую дату поставки.
 */
@Service
public class HandReportExcelLoadService {

    private static final Logger logger = LoggerFactory.getLogger(HandReportExcelLoadService.class);

    private static final String REQUEST_COLUMN = "ЗП/заявка";
    private static final String FACT_DATE_COLUMN = "Дата отгрузки (факт)";
    private static final String ESF_DATE_COLUMN = "Дата выставления ЭСФ";
    private static final String NOTE_COLUMN = "Примечания";
    /** Заголовок колонки статуса из отчёта — в файле это буквально «41» (напр. значение «Закрыто»). */
    private static final String REPORT_STATUS_COLUMN = "41";
    private static final String SPECIFICATION_FORM = "Спецификация";

    private static final Pattern FIRST_INT = Pattern.compile("\\d+");

    private final ContractRepository contractRepository;
    private final DeliveryService deliveryService;

    public HandReportExcelLoadService(ContractRepository contractRepository, DeliveryService deliveryService) {
        this.contractRepository = contractRepository;
        this.deliveryService = deliveryService;
    }

    /** Парсит файл и возвращает число обработанных поставок (создано + обновлена дата). */
    public int loadHandReport(File excelFile) throws IOException {
        Workbook workbook;
        try (FileInputStream fis = new FileInputStream(excelFile)) {
            workbook = excelFile.getName().toLowerCase().endsWith(".xlsx")
                    ? new XSSFWorkbook(fis) : new HSSFWorkbook(fis);
        }
        try {
            // Ищем лист и строку заголовка с колонкой «ЗП/заявка».
            Sheet sheet = null;
            Map<String, Integer> columns = null;
            int headerRowIndex = -1;
            for (int s = 0; s < workbook.getNumberOfSheets() && columns == null; s++) {
                Sheet candidate = workbook.getSheetAt(s);
                int last = Math.min(30, candidate.getLastRowNum());
                for (int i = 0; i <= last; i++) {
                    Row row = candidate.getRow(i);
                    if (row == null) continue;
                    Map<String, Integer> map = buildColumnIndexMap(row);
                    if (findColumnIndex(map, REQUEST_COLUMN) != null) {
                        sheet = candidate;
                        columns = map;
                        headerRowIndex = i;
                        break;
                    }
                }
            }
            if (columns == null) {
                logger.warn("HandReport: header with column '{}' not found in file {}", REQUEST_COLUMN, excelFile.getName());
                return 0;
            }

            Integer requestIdx = findColumnIndex(columns, REQUEST_COLUMN);
            Integer factDateIdx = findColumnIndex(columns, FACT_DATE_COLUMN);
            Integer esfDateIdx = findColumnIndex(columns, ESF_DATE_COLUMN);
            Integer noteIdx = findColumnIndex(columns, NOTE_COLUMN);
            Integer reportStatusIdx = columns.get(REPORT_STATUS_COLUMN); // только точное совпадение заголовка «41»
            logger.info("HandReport: file {} sheet '{}' headerRow={} -> ЗП/заявка={}, Дата отгрузки (факт)={}, Дата выставления ЭСФ={}, Примечание={}, Статус(41)={}",
                    excelFile.getName(), sheet.getSheetName(), headerRowIndex + 1, requestIdx, factDateIdx, esfDateIdx, noteIdx, reportStatusIdx);

            Iterator<Row> it = sheet.iterator();
            for (int i = 0; i <= headerRowIndex && it.hasNext(); i++) {
                it.next();
            }

            int rowsWithRequest = 0;
            int createdDeliveries = 0;
            int updatedDates = 0;
            int noSpecification = 0;

            while (it.hasNext()) {
                Row row = it.next();
                if (row == null) continue;
                try {
                    Long requestId = parseFirstLong(getCellValueAsString(row.getCell(requestIdx)));
                    if (requestId == null) continue;
                    rowsWithRequest++;

                    LocalDate factDate = (factDateIdx != null) ? parseExcelDate(row.getCell(factDateIdx)) : null;
                    LocalDate esfDate = (esfDateIdx != null) ? parseExcelDate(row.getCell(esfDateIdx)) : null;
                    String note = (noteIdx != null) ? getCellValueAsString(row.getCell(noteIdx)) : null;
                    String reportStatus = (reportStatusIdx != null) ? getCellValueAsString(row.getCell(reportStatusIdx)) : null;

                    // Подписанные договоры-спецификации по этой заявке.
                    List<Contract> specs = contractRepository.findByPurchaseRequestId(requestId).stream()
                            .filter(c -> SPECIFICATION_FORM.equalsIgnoreCase(
                                    c.getDocumentForm() != null ? c.getDocumentForm().trim() : null))
                            .filter(c -> c.getStatus() == ContractStatus.SIGNED)
                            .collect(Collectors.toList());

                    if (specs.isEmpty()) {
                        noSpecification++;
                        continue;
                    }
                    for (Contract spec : specs) {
                        boolean created = deliveryService.upsertDeliveryForSpecification(spec.getId(), factDate, esfDate, note, reportStatus);
                        if (created) createdDeliveries++;
                        if (factDate != null) updatedDates++;
                    }
                } catch (Exception e) {
                    logger.warn("HandReport: error on row {}: {}", row.getRowNum() + 1, e.getMessage());
                }
            }

            logger.info("HandReport done: rowsWithRequest={}, createdDeliveries={}, factDatesSet={}, rowsWithoutSpecification={}",
                    rowsWithRequest, createdDeliveries, updatedDates, noSpecification);
            return createdDeliveries + updatedDates;
        } finally {
            workbook.close();
        }
    }

    // ─────────────────────────────── Хелперы ───────────────────────────────

    private Long parseFirstLong(String value) {
        if (value == null) return null;
        Matcher m = FIRST_INT.matcher(value);
        if (m.find()) {
            try {
                return Long.parseLong(m.group());
            } catch (NumberFormatException ignored) {
                return null;
            }
        }
        return null;
    }

    /** Дата из ячейки: поддерживает date-formatted и «сырой» Excel-серийный номер (напр. 46069). */
    private LocalDate parseExcelDate(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC) {
                double v = cell.getNumericCellValue();
                if (v <= 0) return null;
                Date d = DateUtil.getJavaDate(v);
                return Instant.ofEpochMilli(d.getTime()).atZone(ZoneId.systemDefault()).toLocalDate();
            }
            String raw = getCellValueAsString(cell);
            if (raw == null || raw.isBlank()) return null;
            Long serial = parseFirstLong(raw);
            if (serial != null && serial > 0) {
                Date d = DateUtil.getJavaDate(serial.doubleValue());
                return Instant.ofEpochMilli(d.getTime()).atZone(ZoneId.systemDefault()).toLocalDate();
            }
        } catch (Exception e) {
            logger.debug("HandReport: cannot parse date from cell: {}", getCellValueAsString(cell));
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
                    map.putIfAbsent(value.trim(), i);
                }
            }
        }
        return map;
    }

    private Integer findColumnIndex(Map<String, Integer> columns, String columnName) {
        Integer exact = columns.get(columnName);
        if (exact != null) return exact;
        String target = columnName.toLowerCase().replaceAll("\\s+", " ").trim();
        for (Map.Entry<String, Integer> e : columns.entrySet()) {
            String key = e.getKey().toLowerCase().replaceAll("\\s+", " ").trim();
            if (key.equals(target) || key.contains(target) || target.contains(key)) {
                return e.getValue();
            }
        }
        return null;
    }

    private String getCellValueAsString(Cell cell) {
        if (cell == null) return null;
        switch (cell.getCellType()) {
            case STRING:
                String s = cell.getStringCellValue();
                return s != null && !s.trim().isEmpty() ? s.trim() : null;
            case NUMERIC:
                double n = cell.getNumericCellValue();
                return n == (long) n ? String.valueOf((long) n) : String.valueOf(n);
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    return cell.getStringCellValue();
                } catch (Exception e) {
                    try {
                        return String.valueOf(cell.getNumericCellValue());
                    } catch (Exception ex) {
                        return null;
                    }
                }
            default:
                return null;
        }
    }
}
