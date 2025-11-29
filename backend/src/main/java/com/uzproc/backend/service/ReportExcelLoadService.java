package com.uzproc.backend.service;

import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.entity.PurchaseRequestApproval;
import com.uzproc.backend.repository.PurchaseRequestApprovalRepository;
import com.uzproc.backend.repository.PurchaseRequestRepository;
import com.uzproc.backend.service.PurchaseRequestService;
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
    
    // Колонки для этапа "Согласование Заявки на ЗП" (34-73, 10 ролей × 4 колонки)
    private static final int STAGE_APPROVAL_REQUEST_START_COL = 34;
    private static final int STAGE_APPROVAL_REQUEST_END_COL = 73;
    
    // Колонки для этапа "Руководитель закупщика" (75-78, 1 роль × 4 колонки)
    private static final int STAGE_MANAGER_START_COL = 75;
    private static final int STAGE_MANAGER_END_COL = 78;
    
    // Колонки для этапа "Утверждение заявки на ЗП" (80-96, 4 роли × 4 колонки, но есть пропуск колонки 92)
    private static final int STAGE_APPROVAL_START_COL = 80;
    private static final int STAGE_APPROVAL_END_COL = 96;
    
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
    // Внимание: колонка 92 пропущена в файле, поэтому для 4-й роли начинаем с колонки 93
    private static final String[] APPROVAL_ROLES = {
        "Ответственный закупщик",
        "Подготовил документ",
        "Руководитель закупщика",
        "Ответственный закупщик"
    };
    
    // Специальная обработка для этапа "Утверждение заявки на ЗП" из-за пропуска колонки 92
    private static final int STAGE_APPROVAL_SKIP_COL = 92;

    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PurchaseRequestApprovalRepository approvalRepository;
    private final PurchaseRequestService purchaseRequestService;
    private final DataFormatter dataFormatter = new DataFormatter();

    public ReportExcelLoadService(
            PurchaseRequestRepository purchaseRequestRepository,
            PurchaseRequestApprovalRepository approvalRepository,
            PurchaseRequestService purchaseRequestService) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.approvalRepository = approvalRepository;
        this.purchaseRequestService = purchaseRequestService;
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
                    Long idPurchaseRequest = purchaseRequest.getIdPurchaseRequest();
                    if (requestNumber == 1944L) {
                        logger.info("=== ОБРАБОТКА ЗАЯВКИ 1944: requestNumber={}, idPurchaseRequest={} ===", requestNumber, idPurchaseRequest);
                    }
                    int rowApprovalsCount = parseApprovalsForRequest(row, idPurchaseRequest);
                    approvalsCount += rowApprovalsCount;
                    
                    // Обновляем статус заявки на основе согласований
                    // Вызываем всегда, так как согласования могли быть изменены
                    purchaseRequestService.updateStatusBasedOnApprovals(purchaseRequest.getIdPurchaseRequest());
                    
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
        // Логирование для заявки 1944
        if (idPurchaseRequest == 1944L) {
            logger.info("=== НАЧАЛО ПАРСИНГА СОГЛАСОВАНИЙ ДЛЯ ЗАЯВКИ 1944 ===");
        }
        int count = 0;
        
        // Парсим этап "Согласование Заявки на ЗП" (колонки 31-60)
        count += parseApprovalStage(row, idPurchaseRequest, STAGE_APPROVAL_REQUEST, 
            STAGE_APPROVAL_REQUEST_START_COL, STAGE_APPROVAL_REQUEST_END_COL, APPROVAL_REQUEST_ROLES);
        
        // Парсим этап "Руководитель закупщика" (колонки 61-63)
        count += parseApprovalStage(row, idPurchaseRequest, STAGE_MANAGER, 
            STAGE_MANAGER_START_COL, STAGE_MANAGER_END_COL, new String[]{"Руководитель закупщика"});
        
        // Парсим этап "Утверждение заявки на ЗП" (колонки 80-96, с пропуском колонки 92)
        count += parseApprovalStageWithSkip(row, idPurchaseRequest, STAGE_APPROVAL, 
            STAGE_APPROVAL_START_COL, STAGE_APPROVAL_END_COL, APPROVAL_ROLES, STAGE_APPROVAL_SKIP_COL);
        
        return count;
    }
    
    /**
     * Парсит согласования для одного этапа
     */
    private int parseApprovalStage(Row row, Long idPurchaseRequest, String stage, 
                                   int startCol, int endCol, String[] roles) {
        int count = 0;
        int roleIndex = 0;
        
        // Для каждой роли есть 4 колонки: Дата назначения, Дата выполнения, Дней в работе, Результат выполнения
        for (int col = startCol; col <= endCol && roleIndex < roles.length; col += 4) {
            if (col + 3 > endCol) {
                break;
            }
            
            String role = roles[roleIndex];
            
            // Колонка col: Дата назначения
            // Колонка col+1: Дата выполнения
            // Колонка col+2: Дней в работе
            // Колонка col+3: Результат выполнения
            
            Cell assignmentDateCell = row.getCell(col);
            Cell completionDateCell = row.getCell(col + 1);
            Cell daysInWorkCell = row.getCell(col + 2);
            Cell completionResultCell = row.getCell(col + 3);
            
            LocalDateTime assignmentDate = parseDateCell(assignmentDateCell);
            LocalDateTime completionDate = parseDateCell(completionDateCell);
            Integer daysInWork = parseIntegerCell(daysInWorkCell);
            String completionResult = getCellValueAsString(completionResultCell);
            
            // Логирование для отладки
            logger.info("Parsing approval: stage={}, role={}, col={}, assignmentDate={}, completionDate={}, daysInWork={}, completionResultCell={}, completionResult={}", 
                stage, role, col + 3, assignmentDate, completionDate, daysInWork, 
                completionResultCell != null ? "exists" : "null", completionResult);
            
            // Детальное логирование для заявки 1944
            if (idPurchaseRequest == 1944L) {
                logger.info("=== ДЕТАЛЬНОЕ ЛОГИРОВАНИЕ ДЛЯ ЗАЯВКИ 1944 ===");
                logger.info("Роль: {}", role);
                logger.info("Этап: {}", stage);
                logger.info("Колонка {} (Дата назначения): cellType={}, cell={}, parsed={}", 
                    col, assignmentDateCell != null ? assignmentDateCell.getCellType().toString() : "null",
                    assignmentDateCell != null ? "exists" : "null", assignmentDate);
                logger.info("Колонка {} (Дата выполнения): cellType={}, cell={}, parsed={}", 
                    col + 1, completionDateCell != null ? completionDateCell.getCellType().toString() : "null",
                    completionDateCell != null ? "exists" : "null", completionDate);
                logger.info("Колонка {} (Дней в работе): cellType={}, cell={}, parsed={}", 
                    col + 2, daysInWorkCell != null ? daysInWorkCell.getCellType().toString() : "null",
                    daysInWorkCell != null ? "exists" : "null", daysInWork);
                logger.info("Колонка {} (Результат выполнения): cellType={}, cell={}, parsed={}", 
                    col + 3, completionResultCell != null ? completionResultCell.getCellType().toString() : "null",
                    completionResultCell != null ? "exists" : "null", completionResult);
                boolean willBeSaved = assignmentDate != null || completionDate != null || daysInWork != null 
                    || (completionResult != null && !completionResult.trim().isEmpty());
                logger.info("Будет сохранено в БД: {}", willBeSaved);
                logger.info("=== КОНЕЦ ДЕТАЛЬНОГО ЛОГИРОВАНИЯ ===");
            }
            
            // Сохраняем согласование только если есть хотя бы одно значение
            if (assignmentDate != null || completionDate != null || daysInWork != null 
                    || (completionResult != null && !completionResult.trim().isEmpty())) {
                PurchaseRequestApproval approval = approvalRepository
                    .findByIdPurchaseRequestAndStageAndRole(idPurchaseRequest, stage, role)
                    .orElse(new PurchaseRequestApproval(idPurchaseRequest, stage, role));
                
                boolean updated = false;
                
                if (assignmentDate != null) {
                    approval.setAssignmentDate(assignmentDate);
                    updated = true;
                }
                if (completionDate != null) {
                    approval.setCompletionDate(completionDate);
                    updated = true;
                }
                if (daysInWork != null) {
                    approval.setDaysInWork(daysInWork);
                    updated = true;
                }
                // Всегда обновляем результат выполнения
                // Если ячейка существует, читаем значение (даже если пустое)
                String trimmedResult = completionResult != null ? completionResult.trim() : null;
                String currentResult = approval.getCompletionResult();
                
                // Обновляем, если значение изменилось или если ячейка существует и значение пустое (для очистки)
                if (completionResultCell != null) {
                    // Ячейка существует - обновляем значение
                    if (trimmedResult == null || trimmedResult.isEmpty()) {
                        if (currentResult != null) {
                            approval.setCompletionResult(null);
                            updated = true;
                            logger.debug("Cleared completion result for stage={}, role={}", stage, role);
                        }
                    } else {
                        if (!trimmedResult.equals(currentResult)) {
                            approval.setCompletionResult(trimmedResult);
                            updated = true;
                            logger.debug("Updated completion result for stage={}, role={}: '{}'", 
                                stage, role, trimmedResult);
                        }
                    }
                } else if (trimmedResult != null && !trimmedResult.isEmpty()) {
                    // Ячейка не существует, но значение есть (из merged cell или другого источника)
                    if (!trimmedResult.equals(currentResult)) {
                        approval.setCompletionResult(trimmedResult);
                        updated = true;
                        logger.debug("Updated completion result for stage={}, role={}: '{}'", 
                            stage, role, trimmedResult);
                    }
                }
                
                if (updated || approval.getId() == null) {
                    approvalRepository.save(approval);
                    count++;
                }
            }
            
            roleIndex++;
        }
        
        return count;
    }
    
    /**
     * Парсит согласования для одного этапа с учетом пропущенных колонок
     */
    private int parseApprovalStageWithSkip(Row row, Long idPurchaseRequest, String stage, 
                                           int startCol, int endCol, String[] roles, int skipCol) {
        int count = 0;
        int roleIndex = 0;
        
        // Для каждой роли есть 4 колонки: Дата назначения, Дата выполнения, Дней в работе, Результат выполнения
        for (int col = startCol; col <= endCol && roleIndex < roles.length; ) {
            // Пропускаем указанную колонку
            if (col == skipCol) {
                col++;
                continue;
            }
            
            if (col + 3 > endCol) {
                break;
            }
            
            String role = roles[roleIndex];
            
            // Колонка col: Дата назначения
            // Колонка col+1: Дата выполнения
            // Колонка col+2: Дней в работе
            // Колонка col+3: Результат выполнения
            
            Cell assignmentDateCell = row.getCell(col);
            Cell completionDateCell = row.getCell(col + 1);
            Cell daysInWorkCell = row.getCell(col + 2);
            Cell completionResultCell = row.getCell(col + 3);
            
            LocalDateTime assignmentDate = parseDateCell(assignmentDateCell);
            LocalDateTime completionDate = parseDateCell(completionDateCell);
            Integer daysInWork = parseIntegerCell(daysInWorkCell);
            String completionResult = getCellValueAsString(completionResultCell);
            
            // Логирование для отладки
            logger.info("Parsing approval: stage={}, role={}, col={}, assignmentDate={}, completionDate={}, daysInWork={}, completionResultCell={}, completionResult={}", 
                stage, role, col + 3, assignmentDate, completionDate, daysInWork, 
                completionResultCell != null ? "exists" : "null", completionResult);
            
            // Сохраняем согласование только если есть хотя бы одно значение
            if (assignmentDate != null || completionDate != null || daysInWork != null 
                    || (completionResult != null && !completionResult.trim().isEmpty())) {
                PurchaseRequestApproval approval = approvalRepository
                    .findByIdPurchaseRequestAndStageAndRole(idPurchaseRequest, stage, role)
                    .orElse(new PurchaseRequestApproval(idPurchaseRequest, stage, role));
                
                boolean updated = false;
                
                if (assignmentDate != null) {
                    approval.setAssignmentDate(assignmentDate);
                    updated = true;
                }
                if (completionDate != null) {
                    approval.setCompletionDate(completionDate);
                    updated = true;
                }
                if (daysInWork != null) {
                    approval.setDaysInWork(daysInWork);
                    updated = true;
                }
                // Всегда обновляем результат выполнения
                // Если ячейка существует, читаем значение (даже если пустое)
                String trimmedResult = completionResult != null ? completionResult.trim() : null;
                String currentResult = approval.getCompletionResult();
                
                // Обновляем, если значение изменилось или если ячейка существует и значение пустое (для очистки)
                if (completionResultCell != null) {
                    // Ячейка существует - обновляем значение
                    if (trimmedResult == null || trimmedResult.isEmpty()) {
                        if (currentResult != null) {
                            approval.setCompletionResult(null);
                            updated = true;
                            logger.debug("Cleared completion result for stage={}, role={}", stage, role);
                        }
                    } else {
                        if (!trimmedResult.equals(currentResult)) {
                            approval.setCompletionResult(trimmedResult);
                            updated = true;
                            logger.debug("Updated completion result for stage={}, role={}: '{}'", 
                                stage, role, trimmedResult);
                        }
                    }
                } else if (trimmedResult != null && !trimmedResult.isEmpty()) {
                    // Ячейка не существует, но значение есть (из merged cell или другого источника)
                    if (!trimmedResult.equals(currentResult)) {
                        approval.setCompletionResult(trimmedResult);
                        updated = true;
                        logger.debug("Updated completion result for stage={}, role={}: '{}'", 
                            stage, role, trimmedResult);
                    }
                }
                
                if (updated || approval.getId() == null) {
                    approvalRepository.save(approval);
                    count++;
                }
            }
            
            roleIndex++;
            col += 4; // Переходим к следующей роли
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
            // Проверяем, является ли ячейка ошибкой Excel
            if (cell.getCellType() == CellType.ERROR) {
                return null;
            }
            
            // Проверяем формулу с ошибкой
            if (cell.getCellType() == CellType.FORMULA) {
                if (cell.getCachedFormulaResultType() == CellType.ERROR) {
                    return null;
                }
            }
            
            String value = dataFormatter.formatCellValue(cell);
            
            // Фильтруем ошибки Excel (#NULL!, #N/A, #VALUE!, #REF!, #DIV/0!, #NAME?, #NUM!)
            if (value != null && (value.startsWith("#") || value.trim().isEmpty())) {
                return null;
            }
            
            return value;
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

