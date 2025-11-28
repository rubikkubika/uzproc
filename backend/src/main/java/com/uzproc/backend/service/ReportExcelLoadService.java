package com.uzproc.backend.service;

import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.entity.PurchaseRequestApproval;
import com.uzproc.backend.repository.PurchaseRequestApprovalRepository;
import com.uzproc.backend.repository.PurchaseRequestRepository;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.util.DateFormatConverter;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.Iterator;
import java.util.Optional;

@Service
public class ReportExcelLoadService {

    private static final Logger logger = LoggerFactory.getLogger(ReportExcelLoadService.class);
    
    // Константы для колонок
    private static final String REQUEST_NUMBER_COLUMN = "№ заявки";
    private static final int REQUEST_NUMBER_COLUMN_INDEX = 0;
    
    // Этапы согласований для заявок на закупку
    private static final String STAGE_APPROVAL_REQUEST = "Согласование Заявки на ЗП";
    private static final String STAGE_MANAGER = "Руководитель закупщика";
    private static final String STAGE_APPROVAL = "Утверждение заявки на ЗП";
    
    // Колонки для этапа "Согласование Заявки на ЗП" (31-60)
    private static final int STAGE_APPROVAL_REQUEST_START_COL = 31;
    private static final int STAGE_APPROVAL_REQUEST_END_COL = 60;
    
    // Колонки для этапа "Руководитель закупщика" (61-63)
    private static final int STAGE_MANAGER_START_COL = 61;
    private static final int STAGE_MANAGER_END_COL = 63;
    
    // Колонки для этапа "Утверждение заявки на ЗП" (64-75)
    private static final int STAGE_APPROVAL_START_COL = 64;
    private static final int STAGE_APPROVAL_END_COL = 75;
    
    // Роли для этапа "Согласование Заявки на ЗП"
    private static final String[] APPROVAL_REQUEST_ROLES = {
        "Руководитель закупщика",
        "Руководитель ЦФО",
        "Председатель ЦФО M - PVZ",
        "Финансист ЦФО",
        "Генеральный директор",
        "Финансовый директор",
        "Финансовый директор (Маркет)",
        "Служба безопасности",
        "Руководитель ЦФО M - IT",
        "Руководитель ЦФО M - Maintenance"
    };
    
    // Роли для этапа "Утверждение заявки на ЗП"
    private static final String[] APPROVAL_ROLES = {
        "Ответственный закупщик",
        "Подготовил документ",
        "Руководитель закупщика",
        "Ответственный закупщик"
    };

    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PurchaseRequestApprovalRepository approvalRepository;
    private final DataFormatter dataFormatter = new DataFormatter();

    public ReportExcelLoadService(
            PurchaseRequestRepository purchaseRequestRepository,
            PurchaseRequestApprovalRepository approvalRepository) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.approvalRepository = approvalRepository;
    }

    /**
     * Загружает данные из Excel файла отчета
     * Парсит согласования для заявок на закупку
     */
    @Transactional
    public int loadFromExcel(File excelFile) throws IOException {
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
                logger.warn("Sheet is empty in report file {}", excelFile.getName());
                return 0;
            }

            // Пропускаем заголовки (строки 0-2)
            Row headerRow0 = rowIterator.hasNext() ? rowIterator.next() : null; // Строка 0 - этапы
            Row headerRow1 = rowIterator.hasNext() ? rowIterator.next() : null; // Строка 1 - роли
            Row headerRow2 = rowIterator.hasNext() ? rowIterator.next() : null; // Строка 2 - поля/действия
            
            if (headerRow2 == null) {
                logger.warn("Header rows not found in report file {}", excelFile.getName());
                return 0;
            }

            logger.info("Processing report file: {}", excelFile.getName());
            
            int processedCount = 0;
            int approvalsCount = 0;
            int skippedCount = 0;
            
            // Обрабатываем строки данных (начиная со строки 3)
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                
                if (isRowEmpty(row)) {
                    continue;
                }
                
                try {
                    // Получаем номер заявки из колонки 0
                    Cell requestNumberCell = row.getCell(REQUEST_NUMBER_COLUMN_INDEX);
                    Long requestNumber = parseLongCell(requestNumberCell);
                    
                    if (requestNumber == null) {
                        skippedCount++;
                        continue;
                    }
                    
                    // Находим заявку по id_purchase_request
                    Optional<PurchaseRequest> purchaseRequestOpt = purchaseRequestRepository.findByIdPurchaseRequest(requestNumber);
                    
                    if (purchaseRequestOpt.isEmpty()) {
                        logger.debug("Purchase request with id {} not found, skipping row {}", requestNumber, row.getRowNum() + 1);
                        skippedCount++;
                        continue;
                    }
                    
                    PurchaseRequest purchaseRequest = purchaseRequestOpt.get();
                    
                    // Парсим согласования для этой заявки
                    int rowApprovalsCount = parseApprovalsForRequest(row, purchaseRequest.getIdPurchaseRequest());
                    approvalsCount += rowApprovalsCount;
                    
                    processedCount++;
                    
                } catch (Exception e) {
                    logger.error("Error processing row {}: {}", row.getRowNum() + 1, e.getMessage(), e);
                    skippedCount++;
                }
            }
            
            logger.info("Processed {} requests, loaded {} approvals, skipped {} rows from report file {}", 
                processedCount, approvalsCount, skippedCount, excelFile.getName());
            
            return processedCount;
            
        } finally {
            workbook.close();
        }
    }
    
    /**
     * Парсит согласования для заявки из строки
     */
    private int parseApprovalsForRequest(Row row, Long idPurchaseRequest) {
        int count = 0;
        
        // Парсим этап "Согласование Заявки на ЗП" (колонки 31-60)
        count += parseApprovalStage(row, idPurchaseRequest, STAGE_APPROVAL_REQUEST, 
            STAGE_APPROVAL_REQUEST_START_COL, STAGE_APPROVAL_REQUEST_END_COL, APPROVAL_REQUEST_ROLES);
        
        // Парсим этап "Руководитель закупщика" (колонки 61-63)
        count += parseApprovalStage(row, idPurchaseRequest, STAGE_MANAGER, 
            STAGE_MANAGER_START_COL, STAGE_MANAGER_END_COL, new String[]{"Руководитель закупщика"});
        
        // Парсим этап "Утверждение заявки на ЗП" (колонки 64-75)
        count += parseApprovalStage(row, idPurchaseRequest, STAGE_APPROVAL, 
            STAGE_APPROVAL_START_COL, STAGE_APPROVAL_END_COL, APPROVAL_ROLES);
        
        return count;
    }
    
    /**
     * Парсит согласования для одного этапа
     */
    private int parseApprovalStage(Row row, Long idPurchaseRequest, String stage, 
                                   int startCol, int endCol, String[] roles) {
        int count = 0;
        int roleIndex = 0;
        
        // Для каждой роли есть 3 колонки: Дата назначения, Дата выполнения, Дней в работе
        for (int col = startCol; col <= endCol && roleIndex < roles.length; col += 3) {
            if (col + 2 > endCol) {
                break;
            }
            
            String role = roles[roleIndex];
            
            // Колонка col: Дата назначения
            // Колонка col+1: Дата выполнения
            // Колонка col+2: Дней в работе
            
            Cell assignmentDateCell = row.getCell(col);
            Cell completionDateCell = row.getCell(col + 1);
            Cell daysInWorkCell = row.getCell(col + 2);
            
            LocalDateTime assignmentDate = parseDateCell(assignmentDateCell);
            LocalDateTime completionDate = parseDateCell(completionDateCell);
            Integer daysInWork = parseIntegerCell(daysInWorkCell);
            
            // Сохраняем согласование только если есть хотя бы одно значение
            if (assignmentDate != null || completionDate != null || daysInWork != null) {
                PurchaseRequestApproval approval = approvalRepository
                    .findByIdPurchaseRequestAndStageAndRole(idPurchaseRequest, stage, role)
                    .orElse(new PurchaseRequestApproval(idPurchaseRequest, stage, role));
                
                if (assignmentDate != null) {
                    approval.setAssignmentDate(assignmentDate);
                }
                if (completionDate != null) {
                    approval.setCompletionDate(completionDate);
                }
                if (daysInWork != null) {
                    approval.setDaysInWork(daysInWork);
                }
                
                approvalRepository.save(approval);
                count++;
            }
            
            roleIndex++;
        }
        
        return count;
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
     * Получает строковое значение ячейки
     */
    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return null;
        }
        try {
            return dataFormatter.formatCellValue(cell);
        } catch (Exception e) {
            logger.debug("Error formatting cell value: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Парсит ячейку с числом в Long
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
                    String strValue = getCellValueAsString(cell);
                    if (strValue != null && !strValue.trim().isEmpty()) {
                        // Убираем пробелы и запятые (форматирование чисел)
                        strValue = strValue.replaceAll("[,\\s]", "");
                        try {
                            return Long.parseLong(strValue);
                        } catch (NumberFormatException e) {
                            logger.debug("Cannot parse Long from string: '{}'", strValue);
                            return null;
                        }
                    }
                    return null;
                case FORMULA:
                    if (cell.getCachedFormulaResultType() == CellType.NUMERIC) {
                        return (long) cell.getNumericCellValue();
                    } else if (cell.getCachedFormulaResultType() == CellType.STRING) {
                        String formulaValue = getCellValueAsString(cell);
                        if (formulaValue != null && !formulaValue.trim().isEmpty()) {
                            formulaValue = formulaValue.replaceAll("[,\\s]", "");
                            try {
                                return Long.parseLong(formulaValue);
                            } catch (NumberFormatException e) {
                                return null;
                            }
                        }
                    }
                    return null;
                default:
                    return null;
            }
        } catch (Exception e) {
            logger.debug("Error parsing Long from cell: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Парсит ячейку с числом в Integer
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
                    String strValue = getCellValueAsString(cell);
                    if (strValue != null && !strValue.trim().isEmpty()) {
                        strValue = strValue.replaceAll("[,\\s]", "");
                        try {
                            return Integer.parseInt(strValue);
                        } catch (NumberFormatException e) {
                            logger.debug("Cannot parse Integer from string: '{}'", strValue);
                            return null;
                        }
                    }
                    return null;
                case FORMULA:
                    if (cell.getCachedFormulaResultType() == CellType.NUMERIC) {
                        return (int) cell.getNumericCellValue();
                    } else if (cell.getCachedFormulaResultType() == CellType.STRING) {
                        String formulaValue = getCellValueAsString(cell);
                        if (formulaValue != null && !formulaValue.trim().isEmpty()) {
                            formulaValue = formulaValue.replaceAll("[,\\s]", "");
                            try {
                                return Integer.parseInt(formulaValue);
                            } catch (NumberFormatException e) {
                                return null;
                            }
                        }
                    }
                    return null;
                default:
                    return null;
            }
        } catch (Exception e) {
            logger.debug("Error parsing Integer from cell: {}", e.getMessage());
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
                }
            }
            
            // Если ячейка имеет тип NUMERIC, но не помечена как дата
            if (cell.getCellType() == CellType.NUMERIC) {
                double numericValue = cell.getNumericCellValue();
                // Excel хранит даты как числа (дни с 1900-01-01)
                if (numericValue > 0 && numericValue < 1000000) {
                    try {
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
            logger.debug("Error parsing date cell: {}", e.getMessage());
        }
        
        return null;
    }
    
    /**
     * Парсит строку с датой в LocalDateTime
     */
    private LocalDateTime parseStringDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }
        
        // Различные форматы дат
        String[] dateFormats = {
            "dd.MM.yyyy HH:mm:ss",
            "dd.MM.yyyy HH:mm",
            "dd.MM.yyyy",
            "yyyy-MM-dd HH:mm:ss",
            "yyyy-MM-dd HH:mm",
            "yyyy-MM-dd",
            "dd/MM/yyyy HH:mm:ss",
            "dd/MM/yyyy HH:mm",
            "dd/MM/yyyy"
        };
        
        for (String format : dateFormats) {
            try {
                java.time.format.DateTimeFormatter formatter = 
                    java.time.format.DateTimeFormatter.ofPattern(format);
                if (format.contains("HH:mm")) {
                    return LocalDateTime.parse(dateStr, formatter);
                } else {
                    return java.time.LocalDate.parse(dateStr, formatter).atStartOfDay();
                }
            } catch (Exception e) {
                // Пробуем следующий формат
            }
        }
        
        return null;
    }
}

