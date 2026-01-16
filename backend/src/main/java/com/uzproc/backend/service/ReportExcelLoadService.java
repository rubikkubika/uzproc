package com.uzproc.backend.service;

import com.uzproc.backend.entity.Purchase;
import com.uzproc.backend.entity.PurchaseRequest;
import com.uzproc.backend.entity.PurchaseApproval;
import com.uzproc.backend.entity.PurchaseRequestApproval;
import com.uzproc.backend.repository.ContractRepository;
import com.uzproc.backend.repository.PurchaseApprovalRepository;
import com.uzproc.backend.repository.PurchaseRequestApprovalRepository;
import com.uzproc.backend.repository.PurchaseRepository;
import com.uzproc.backend.repository.PurchaseRequestRepository;
import com.uzproc.backend.service.PurchaseRequestService;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.util.CellRangeAddress;
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
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.Optional;

@Service
public class ReportExcelLoadService {

    private static final Logger logger = LoggerFactory.getLogger(ReportExcelLoadService.class);
    
    // Константы для колонок
    private static final String REQUEST_NUMBER_COLUMN = "№ заявки";
    private static final int REQUEST_NUMBER_COLUMN_INDEX = 0;
    private static final String CONTRACT_INNER_ID_COLUMN = "Договор.Внутренний номер";
    
    // Этапы согласований для заявок на закупку
    private static final String STAGE_APPROVAL_REQUEST = "Согласование Заявки на ЗП";
    private static final String STAGE_MANAGER = "Руководитель закупщика";
    private static final String STAGE_APPROVAL = "Утверждение заявки на ЗП";
    private static final String STAGE_APPROVAL_NO_ZP = "Утверждение заявки на ЗП (НЕ требуется ЗП)";
    
    // Этапы согласований для закупок
    private static final String STAGE_RESULTS_APPROVAL = "Согласование результатов ЗП";
    private static final String STAGE_PURCHASE_COMMISSION = "Закупочная комиссия";
    private static final String STAGE_COMMISSION_RESULT_CHECK = "Проверка результата закупочной комиссии";
    
    // Константы колонок больше не нужны - используем динамический поиск по заголовкам
    
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
    
    // Роли для этапа "Утверждение заявки на ЗП (НЕ требуется ЗП)"
    private static final String[] APPROVAL_NO_ZP_ROLES = {
        "Ответственный закупщик"
    };
    
    // Роли для этапа "Согласование результатов ЗП"
    private static final String[] RESULTS_APPROVAL_ROLES = {
        "Руководитель закупщика документа",
        "Служба безопасности",
        "Руководитель закупщика",
        "Руководитель ЦФО",
        "Финансист ЦФО"
    };
    
    // Роли для этапа "Закупочная комиссия"
    private static final String[] PURCHASE_COMMISSION_ROLES = {
        "Секретарь ЗК",
        "Финансовый директор",
        "Финансовый директор (Маркет)",
        "Генеральный директор",
        "Операционный директор",
        "Директор ДИТ",
        "Директор ЮД (CLO)",
        "Директор Проектного офиса (PMO)",
        "Директор по закупкам (CPO)",
        "Директор по безопасности",
        "Председатель Закупочной комиссии"
    };
    
    // Роли для этапа "Проверка результата закупочной комиссии"
    private static final String[] COMMISSION_RESULT_CHECK_ROLES = {
        "Ответственный закупщик"
    };
    
    // Оптимизация: статические DateTimeFormatter для парсинга дат (создаются один раз)
    private static final java.time.format.DateTimeFormatter[] DATE_TIME_FORMATTERS = {
        java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss"),
        java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"),
        java.time.format.DateTimeFormatter.ofPattern("dd.MM.yyyy"),
        java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
        java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
        java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd"),
        java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
        java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"),
        java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy")
    };

    private final PurchaseRequestRepository purchaseRequestRepository;
    private final PurchaseRequestApprovalRepository requestApprovalRepository;
    private final PurchaseRepository purchaseRepository;
    private final PurchaseApprovalRepository purchaseApprovalRepository;
    private final ContractRepository contractRepository;
    private final PurchaseRequestStatusUpdateService statusUpdateService;
    private final ContractStatusUpdateService contractStatusUpdateService;
    private final PurchaseStatusUpdateService purchaseStatusUpdateService;
    private final DataFormatter dataFormatter = new DataFormatter();
    
    // Batch-списки для накопления согласований перед сохранением
    private final List<PurchaseRequestApproval> requestApprovalBatch = new ArrayList<>();
    private final List<PurchaseApproval> purchaseApprovalBatch = new ArrayList<>();
    private final List<Purchase> purchaseUpdateBatch = new ArrayList<>();
    private static final int BATCH_SIZE = 100; // Размер пакета для batch-операций

    public ReportExcelLoadService(
            PurchaseRequestRepository purchaseRequestRepository,
            PurchaseRequestApprovalRepository requestApprovalRepository,
            PurchaseRepository purchaseRepository,
            PurchaseApprovalRepository purchaseApprovalRepository,
            ContractRepository contractRepository,
            PurchaseRequestStatusUpdateService statusUpdateService,
            ContractStatusUpdateService contractStatusUpdateService,
            PurchaseStatusUpdateService purchaseStatusUpdateService) {
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.requestApprovalRepository = requestApprovalRepository;
        this.purchaseRepository = purchaseRepository;
        this.purchaseApprovalRepository = purchaseApprovalRepository;
        this.contractRepository = contractRepository;
        this.statusUpdateService = statusUpdateService;
        this.contractStatusUpdateService = contractStatusUpdateService;
        this.purchaseStatusUpdateService = purchaseStatusUpdateService;
    }

    /**
     * Загружает данные из Excel файла отчета
     * Парсит согласования для заявок на закупку
     */
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

            // Пропускаем первые 3 строки (0, 1, 2) - они содержат фильтры или пустые
            // Заголовки находятся в строках 3, 4, 5 (индексы 3, 4, 5)
            for (int i = 0; i < 3 && rowIterator.hasNext(); i++) {
                rowIterator.next();
            }
            
            // Читаем заголовки (строки 3-5) для построения карты колонок
            Row headerRow0 = rowIterator.hasNext() ? rowIterator.next() : null; // Строка 3 (POI индекс 3) - этапы
            Row headerRow1 = rowIterator.hasNext() ? rowIterator.next() : null; // Строка 4 (POI индекс 4) - роли
            Row headerRow2 = rowIterator.hasNext() ? rowIterator.next() : null; // Строка 5 (POI индекс 5) - поля/действия
            
            if (headerRow2 == null) {
                logger.warn("Header rows not found in report file {}", excelFile.getName());
                return 0;
            }

            // Строим карту колонок на основе заголовков с учетом merged cells
            Map<String, Integer> approvalColumnMap = buildApprovalColumnMap(sheet, headerRow0, headerRow1, headerRow2);
            logger.info("Built approval column map with {} entries", approvalColumnMap.size());
            
            // Ищем колонку "Договор.Внутренний номер" в заголовках репорта
            // Ищем во всех строках заголовков, как и другие колонки
            Integer contractInnerIdColumnIndex = findContractInnerIdColumn(headerRow0, headerRow1, headerRow2);
            if (contractInnerIdColumnIndex != null) {
                logger.info("Found contractInnerId column '{}' at index {} in report file", CONTRACT_INNER_ID_COLUMN, contractInnerIdColumnIndex);
            } else {
                logger.warn("ContractInnerId column '{}' not found in report file. Searching for similar columns...", CONTRACT_INNER_ID_COLUMN);
            }
            
            logger.info("Processing report file: {}", excelFile.getName());
            
            int processedRequestsCount = 0;
            int processedPurchasesCount = 0;
            int requestApprovalsCount = 0;
            int purchaseApprovalsCount = 0;
            int skippedCount = 0;
            
            // Обрабатываем строки данных (начиная со строки 6)
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
                    
                    if (purchaseRequestOpt.isPresent()) {
                        PurchaseRequest purchaseRequest = purchaseRequestOpt.get();
                        Long idPurchaseRequest = purchaseRequest.getIdPurchaseRequest();
                        
                        // Парсим согласования для заявки
                        if (requestNumber == 1944L || requestNumber == 2075L) {
                            logger.info("=== ОБРАБОТКА ЗАЯВКИ {}: requestNumber={}, idPurchaseRequest={} ===", requestNumber, requestNumber, idPurchaseRequest);
                        }
                        int rowApprovalsCount = parseApprovalsForRequest(row, idPurchaseRequest, approvalColumnMap);
                        if (requestNumber == 1944L || requestNumber == 2075L) {
                            logger.info("=== ЗАЯВКА {}: спарсено согласований: {} ===", requestNumber, rowApprovalsCount);
                        }
                        requestApprovalsCount += rowApprovalsCount;
                        
                        processedRequestsCount++;
                    } else if (requestNumber == 2075L) {
                        logger.warn("=== ЗАЯВКА 2075 НЕ НАЙДЕНА В БАЗЕ ДАННЫХ: requestNumber={} ===", requestNumber);
                    }
                    
                    // Находим закупки по purchaseRequestId (используем номер заявки на закупку)
                    // Связь делается через номер заявки на закупку (requestNumber = idPurchaseRequest)
                    List<Purchase> purchases = purchaseRepository.findByPurchaseRequestId(requestNumber);
                    if (!purchases.isEmpty()) {
                        for (Purchase purchase : purchases) {
                            Long purchaseRequestId = purchase.getPurchaseRequestId();
                            if (purchaseRequestId != null) {
                                // Логирование для закупки 2075
                                if (purchaseRequestId == 2075L || requestNumber == 2075L) {
                                    logger.info("=== ОБРАБОТКА ЗАКУПКИ: requestNumber={}, purchaseRequestId={}, purchaseId={} ===", 
                                        requestNumber, purchaseRequestId, purchase.getId());
                                }
                                // Парсим согласования для закупки
                                int rowPurchaseApprovalsCount = parseApprovalsForPurchase(row, purchaseRequestId, approvalColumnMap);
                                if (purchaseRequestId == 2075L || requestNumber == 2075L) {
                                    logger.info("=== ЗАКУПКА {}: спарсено согласований: {} ===", purchaseRequestId, rowPurchaseApprovalsCount);
                                }
                                purchaseApprovalsCount += rowPurchaseApprovalsCount;
                                
                                // Парсим и обновляем contractInnerId из колонки "Договор.Внутренний номер" в репорте
                                // Связь с закупкой через номер заявки на закупку (purchaseRequestId)
                                if (contractInnerIdColumnIndex != null) {
                                    updatePurchaseContractInnerId(purchase, row, contractInnerIdColumnIndex);
                                }
                                
                                processedPurchasesCount++;
                            }
                        }
                    } else if (requestNumber == 2075L) {
                        logger.warn("=== ЗАКУПКА 2075 НЕ НАЙДЕНА В БАЗЕ ДАННЫХ: requestNumber={} ===", requestNumber);
                    }
                    
                    if (purchaseRequestOpt.isEmpty() && purchases.isEmpty()) {
                        logger.debug("Neither purchase request nor purchase with id {} found, skipping row {}", requestNumber, row.getRowNum() + 1);
                        skippedCount++;
                    }
                    
                } catch (Exception e) {
                    logger.error("Error processing row {}: {}", row.getRowNum() + 1, e.getMessage(), e);
                    skippedCount++;
                }
            }
            
            // Сохраняем все оставшиеся согласования и обновления в отдельной транзакции
            // Это гарантирует, что согласования сохранятся даже если обновление статусов завершится с ошибкой
            saveAllApprovalsInTransaction();
            
            logger.info("Processed {} requests ({} approvals), {} purchases ({} approvals), skipped {} rows from report file {}", 
                processedRequestsCount, requestApprovalsCount, processedPurchasesCount, purchaseApprovalsCount, skippedCount, excelFile.getName());
            
            // Обновляем статусы в правильном порядке в отдельных транзакциях:
            // 1. Сначала статусы закупок (так как статус заявки зависит от статуса закупки)
            // 2. Затем статусы договоров
            // 3. Затем статусы заявок (которые зависят от статусов закупок и договоров)
            // Каждое обновление в отдельной транзакции, чтобы ошибка в одном не откатывала все
            
            if (purchaseStatusUpdateService != null) {
                logger.info("=== Starting status update for all purchases after parsing report file ===");
                try {
                    purchaseStatusUpdateService.updateAllStatuses();
                    logger.info("=== Purchase status update completed successfully ===");
                } catch (Exception e) {
                    logger.error("=== ERROR during purchase status update after parsing report file: {} ===", e.getMessage(), e);
                    // Не прерываем выполнение - согласования уже сохранены
                }
            } else {
                logger.warn("=== purchaseStatusUpdateService is NULL, skipping purchase status update ===");
            }
            
            if (contractStatusUpdateService != null) {
                logger.info("Starting status update for all contracts after parsing report file");
                try {
                    contractStatusUpdateService.updateAllStatuses();
                    logger.info("Contract status update completed successfully");
                } catch (Exception e) {
                    logger.error("Error during contract status update after parsing report file: {}", e.getMessage(), e);
                    // Не прерываем выполнение - согласования уже сохранены
                }
            }
            
            // Обновляем статусы всех заявок на закупку после парсинга (после обновления статусов закупок и договоров)
            if (statusUpdateService != null) {
                logger.info("=== Starting status update for all purchase requests after parsing report file ===");
                try {
                    statusUpdateService.updateAllStatuses();
                    logger.info("=== Status update completed successfully ===");
                } catch (Exception e) {
                    logger.error("=== ERROR during status update after parsing report file: {} ===", e.getMessage(), e);
                    logger.error("=== Stack trace ===", e);
                    // Не прерываем выполнение - согласования уже сохранены
                }
            } else {
                logger.warn("=== statusUpdateService is NULL, skipping purchase request status update after parsing report file ===");
            }
            
            return processedRequestsCount + processedPurchasesCount;
            
        } finally {
            workbook.close();
        }
    }
    
    /**
     * Парсит согласования для заявки на закупку из строки
     */
    private int parseApprovalsForRequest(Row row, Long idPurchaseRequest, Map<String, Integer> approvalColumnMap) {
        // Логирование для заявки 1944 и 2075
        if (idPurchaseRequest == 1944L || idPurchaseRequest == 2075L) {
            logger.info("=== НАЧАЛО ПАРСИНГА СОГЛАСОВАНИЙ ДЛЯ ЗАЯВКИ {} ===", idPurchaseRequest);
            logger.info("=== Размер карты колонок: {} ===", approvalColumnMap.size());
        }
        int count = 0;
        
        // Парсим этап "Согласование Заявки на ЗП"
        count += parseApprovalStageDynamic(row, idPurchaseRequest, STAGE_APPROVAL_REQUEST, 
            APPROVAL_REQUEST_ROLES, approvalColumnMap);
        
        // Парсим этап "Руководитель закупщика"
        count += parseApprovalStageDynamic(row, idPurchaseRequest, STAGE_MANAGER, 
            new String[]{"Руководитель закупщика"}, approvalColumnMap);
        
        // Парсим этап "Утверждение заявки на ЗП"
        count += parseApprovalStageDynamic(row, idPurchaseRequest, STAGE_APPROVAL, 
            APPROVAL_ROLES, approvalColumnMap);
        
        // Парсим этап "Утверждение заявки на ЗП (НЕ требуется ЗП)"
        count += parseApprovalStageDynamic(row, idPurchaseRequest, STAGE_APPROVAL_NO_ZP, 
            APPROVAL_NO_ZP_ROLES, approvalColumnMap);
        
        return count;
    }
    
    /**
     * Парсит согласования для закупки из строки
     */
    private int parseApprovalsForPurchase(Row row, Long purchaseRequestId, Map<String, Integer> approvalColumnMap) {
        // Логирование для закупки 2075
        if (purchaseRequestId == 2075L) {
            logger.info("=== НАЧАЛО ПАРСИНГА СОГЛАСОВАНИЙ ДЛЯ ЗАКУПКИ {} ===", purchaseRequestId);
            logger.info("=== Размер карты колонок: {} ===", approvalColumnMap.size());
        }
        int count = 0;
        
        // Парсим этап "Согласование результатов ЗП"
        count += parseApprovalStageDynamicForPurchase(row, purchaseRequestId, STAGE_RESULTS_APPROVAL, 
            RESULTS_APPROVAL_ROLES, approvalColumnMap);
        
        // Парсим этап "Закупочная комиссия"
        count += parseApprovalStageDynamicForPurchase(row, purchaseRequestId, STAGE_PURCHASE_COMMISSION, 
            PURCHASE_COMMISSION_ROLES, approvalColumnMap);
        
        // Парсим этап "Проверка результата закупочной комиссии"
        count += parseApprovalStageDynamicForPurchase(row, purchaseRequestId, STAGE_COMMISSION_RESULT_CHECK, 
            COMMISSION_RESULT_CHECK_ROLES, approvalColumnMap);
        
        // Логирование для закупки 2075
        if (purchaseRequestId == 2075L) {
            logger.info("=== ЗАКУПКА {}: спарсено согласований: {} ===", purchaseRequestId, count);
        }
        
        return count;
    }
    
    /**
     * Строит карту колонок для согласований на основе заголовков
     * Ключ: "Этап|Роль|Поле", Значение: индекс колонки
     * Учитывает merged cells для этапов и ролей
     */
    private Map<String, Integer> buildApprovalColumnMap(Sheet sheet, Row headerRow0, Row headerRow1, Row headerRow2) {
        Map<String, Integer> columnMap = new HashMap<>();
        
        // Строим карту merged cells для строки 3 (этапы) - headerRow0 имеет индекс 3
        Map<Integer, String> mergedStageMap = new HashMap<>();
        int stageRowIndex = headerRow0 != null ? headerRow0.getRowNum() : 3;
        for (int i = 0; i < sheet.getNumMergedRegions(); i++) {
            CellRangeAddress mergedRegion = sheet.getMergedRegion(i);
            if (mergedRegion.getFirstRow() == stageRowIndex && mergedRegion.getLastRow() == stageRowIndex) {
                // Это merged cell в строке этапов
                Cell firstCell = headerRow0 != null ? headerRow0.getCell(mergedRegion.getFirstColumn()) : null;
                String stageValue = getCellValueAsString(firstCell);
                if (stageValue != null && !stageValue.trim().isEmpty()) {
                    // Заполняем все колонки в merged region значением этапа
                    for (int col = mergedRegion.getFirstColumn(); col <= mergedRegion.getLastColumn(); col++) {
                        mergedStageMap.put(col, stageValue.trim());
                    }
                }
            }
        }
        
        // Строим карту merged cells для строки 4 (роли) - headerRow1 имеет индекс 4
        Map<Integer, String> mergedRoleMap = new HashMap<>();
        int roleRowIndex = headerRow1 != null ? headerRow1.getRowNum() : 4;
        for (int i = 0; i < sheet.getNumMergedRegions(); i++) {
            CellRangeAddress mergedRegion = sheet.getMergedRegion(i);
            if (mergedRegion.getFirstRow() == roleRowIndex && mergedRegion.getLastRow() == roleRowIndex) {
                // Это merged cell в строке ролей
                Cell firstCell = headerRow1 != null ? headerRow1.getCell(mergedRegion.getFirstColumn()) : null;
                String roleValue = getCellValueAsString(firstCell);
                if (roleValue != null && !roleValue.trim().isEmpty()) {
                    // Заполняем все колонки в merged region значением роли
                    for (int col = mergedRegion.getFirstColumn(); col <= mergedRegion.getLastColumn(); col++) {
                        mergedRoleMap.put(col, roleValue.trim());
                    }
                }
            }
        }
        
        int maxCol = Math.max(
            Math.max(headerRow0 != null ? headerRow0.getLastCellNum() : 0, 
                     headerRow1 != null ? headerRow1.getLastCellNum() : 0),
            headerRow2 != null ? headerRow2.getLastCellNum() : 0
        );
        
        String currentStage = null;
        String currentRole = null;
        for (int col = 0; col < maxCol; col++) {
            // Получаем этап: сначала из merged cells, потом из ячейки
            String stage = mergedStageMap.get(col);
            if (stage == null || stage.trim().isEmpty()) {
                stage = getCellValueAsString(headerRow0 != null ? headerRow0.getCell(col) : null);
            }
            
            // Если этап найден и изменился, сохраняем его как текущий и сбрасываем роль
            if (stage != null && !stage.trim().isEmpty()) {
                String trimmedStage = stage.trim();
                if (!trimmedStage.equals(currentStage)) {
                    currentStage = trimmedStage;
                    // Сбрасываем роль только при смене этапа
                    currentRole = null;
                }
            }
            
            // Пропускаем колонки без этапа (основные поля заявки)
            if (currentStage == null || currentStage.isEmpty()) {
                continue;
            }
            
            // Получаем роль: сначала из merged cells, потом из ячейки
            String role = mergedRoleMap.get(col);
            if (role == null || role.trim().isEmpty()) {
                role = getCellValueAsString(headerRow1 != null ? headerRow1.getCell(col) : null);
            }
            
            String field = getCellValueAsString(headerRow2 != null ? headerRow2.getCell(col) : null);
            
            // Если роль найдена и изменилась, сохраняем ее как текущую
            if (role != null && !role.trim().isEmpty()) {
                String trimmedRole = role.trim();
                if (!trimmedRole.equals(currentRole)) {
                    currentRole = trimmedRole;
                }
            }
            
            // Используем текущую роль, если в этой колонке роль не указана
            String roleToUse = (role != null && !role.trim().isEmpty()) ? role.trim() : currentRole;
            
            // Формируем ключ: "Этап|Роль|Поле"
            if (roleToUse != null && !roleToUse.isEmpty() && field != null && !field.trim().isEmpty()) {
                String key = currentStage + "|" + roleToUse + "|" + field.trim();
                columnMap.put(key, col);
                logger.debug("Mapped column {}: {}", col, key);
            } else if (currentStage != null && !currentStage.isEmpty()) {
                // Логируем, если этап есть, но роль или поле отсутствуют
                logger.debug("Skipping column {}: stage={}, role={}, currentRole={}, field={}", 
                    col, currentStage, role, currentRole, field);
            }
        }
        
        logger.info("Built approval column map with {} entries", columnMap.size());
        return columnMap;
    }
    
    /**
     * Находит индекс колонки для согласования по этапу, роли и полю
     */
    private Integer findApprovalColumn(Map<String, Integer> columnMap, String stage, String role, String field) {
        // Пробуем точное совпадение
        String exactKey = stage + "|" + role + "|" + field;
        Integer col = columnMap.get(exactKey);
        if (col != null) {
            return col;
        }
        
        // Пробуем найти по частичному совпадению (для работы с вариациями названий)
        String normalizedStage = normalizeString(stage);
        String normalizedRole = normalizeString(role);
        String normalizedField = normalizeString(field);
        
        for (Map.Entry<String, Integer> entry : columnMap.entrySet()) {
            String key = entry.getKey();
            String[] parts = key.split("\\|");
            if (parts.length == 3) {
                String keyStage = normalizeString(parts[0]);
                String keyRole = normalizeString(parts[1]);
                String keyField = normalizeString(parts[2]);
                
                if (keyStage.contains(normalizedStage) || normalizedStage.contains(keyStage)) {
                    if (keyRole.contains(normalizedRole) || normalizedRole.contains(keyRole)) {
                        if (keyField.contains(normalizedField) || normalizedField.contains(keyField)) {
                            logger.debug("Found column by partial match: {} -> {}", key, entry.getValue());
                            return entry.getValue();
                        }
                    }
                }
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
        return str.trim().toLowerCase().replaceAll("\\s+", " ");
    }
    
    /**
     * Парсит согласования для одного этапа динамически по карте колонок (для заявок)
     */
    private int parseApprovalStageDynamic(Row row, Long idPurchaseRequest, String stage, 
                                         String[] roles, Map<String, Integer> columnMap) {
        int count = 0;
        
        for (String role : roles) {
            // Ищем колонки для этой роли и этапа
            Integer assignmentDateCol = findApprovalColumn(columnMap, stage, role, "Дата назначения");
            Integer completionDateCol = findApprovalColumn(columnMap, stage, role, "Дата выполнения");
            Integer daysInWorkCol = findApprovalColumn(columnMap, stage, role, "Дней в работе");
            Integer completionResultCol = findApprovalColumn(columnMap, stage, role, "Результат выполнения");
            
            // Если не нашли ни одной колонки, пропускаем эту роль
            if (assignmentDateCol == null && completionDateCol == null && 
                daysInWorkCol == null && completionResultCol == null) {
                logger.debug("No columns found for stage={}, role={}", stage, role);
                // Логирование для заявки 2075
                if (idPurchaseRequest == 2075L) {
                    logger.warn("=== ЗАЯВКА 2075: Не найдены колонки для stage={}, role={} ===", stage, role);
                }
                continue;
            }
            
            Cell assignmentDateCell = assignmentDateCol != null ? row.getCell(assignmentDateCol) : null;
            Cell completionDateCell = completionDateCol != null ? row.getCell(completionDateCol) : null;
            Cell daysInWorkCell = daysInWorkCol != null ? row.getCell(daysInWorkCol) : null;
            Cell completionResultCell = completionResultCol != null ? row.getCell(completionResultCol) : null;
            
            LocalDateTime assignmentDate = parseDateCell(assignmentDateCell);
            LocalDateTime completionDate = parseDateCell(completionDateCell);
            Integer daysInWork = parseIntegerCell(daysInWorkCell);
            String completionResult = getCellValueAsString(completionResultCell);
            
            // Логирование для отладки
            logger.debug("Parsing approval: stage={}, role={}, assignmentDateCol={}, completionDateCol={}, daysInWorkCol={}, completionResultCol={}, assignmentDate={}, completionDate={}, daysInWork={}, completionResult={}", 
                stage, role, assignmentDateCol, completionDateCol, daysInWorkCol, completionResultCol,
                assignmentDate, completionDate, daysInWork, completionResult);
            
            // Логирование для заявки 2075
            if (idPurchaseRequest == 2075L) {
                logger.info("=== ЗАЯВКА 2075: stage={}, role={}, assignmentDate={}, completionDate={}, daysInWork={}, completionResult={} ===", 
                    stage, role, assignmentDate, completionDate, daysInWork, completionResult);
            }
            
            // Сохраняем согласование только если есть хотя бы одно значение
            // (assignmentDate, completionDate, daysInWork, completionResult)
            boolean hasValue = assignmentDate != null || completionDate != null || daysInWork != null 
                    || (completionResult != null && !completionResult.trim().isEmpty());
            
            if (hasValue) {
                PurchaseRequestApproval approval = requestApprovalRepository
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
                
                // Добавляем согласование в batch, если:
                // 1. Оно новое (getId() == null) - создаем только если есть данные (hasValue уже проверено выше)
                // 2. ИЛИ есть обновления (updated == true) - значения изменились
                // hasValue уже проверено в условии if выше, поэтому здесь всегда true
                boolean isNew = approval.getId() == null;
                boolean shouldAdd = isNew || updated;
                
                if (shouldAdd) {
                    requestApprovalBatch.add(approval);
                    count++;
                    
                    // Логирование для заявки 2075
                    if (idPurchaseRequest == 2075L) {
                        logger.info("=== ЗАЯВКА 2075: Создано/обновлено согласование stage={}, role={}, hasValue={}, updated={}, isNew={}, shouldAdd={} ===", 
                            stage, role, hasValue, updated, isNew, shouldAdd);
                    }
                    
                    // Сохраняем batch если он заполнен
                    if (requestApprovalBatch.size() >= BATCH_SIZE) {
                        flushRequestApprovalBatch();
                    }
                } else if (idPurchaseRequest == 2075L) {
                    logger.warn("=== ЗАЯВКА 2075: Пропущено согласование stage={}, role={}, hasValue={}, updated={}, isNew={} ===", 
                        stage, role, hasValue, updated, isNew);
                }
            }
        }
        
        return count;
    }
    
    /**
     * Парсит согласования для одного этапа динамически по карте колонок (для закупок)
     */
    private int parseApprovalStageDynamicForPurchase(Row row, Long purchaseRequestId, String stage, 
                                                     String[] roles, Map<String, Integer> columnMap) {
        int count = 0;
        
        for (String role : roles) {
            // Ищем колонки для этой роли и этапа
            Integer assignmentDateCol = findApprovalColumn(columnMap, stage, role, "Дата назначения");
            Integer completionDateCol = findApprovalColumn(columnMap, stage, role, "Дата выполнения");
            Integer daysInWorkCol = findApprovalColumn(columnMap, stage, role, "Дней в работе");
            Integer completionResultCol = findApprovalColumn(columnMap, stage, role, "Результат выполнения");
            
            // Если не нашли ни одной колонки, пропускаем эту роль
            if (assignmentDateCol == null && completionDateCol == null && 
                daysInWorkCol == null && completionResultCol == null) {
                logger.debug("No columns found for purchase stage={}, role={}", stage, role);
                continue;
            }
            
            Cell assignmentDateCell = assignmentDateCol != null ? row.getCell(assignmentDateCol) : null;
            Cell completionDateCell = completionDateCol != null ? row.getCell(completionDateCol) : null;
            Cell daysInWorkCell = daysInWorkCol != null ? row.getCell(daysInWorkCol) : null;
            Cell completionResultCell = completionResultCol != null ? row.getCell(completionResultCol) : null;
            
            LocalDateTime assignmentDate = parseDateCell(assignmentDateCell);
            LocalDateTime completionDate = parseDateCell(completionDateCell);
            Integer daysInWork = parseIntegerCell(daysInWorkCell);
            String completionResult = getCellValueAsString(completionResultCell);
            
            // Логирование для отладки
            logger.debug("Parsing purchase approval: stage={}, role={}, assignmentDateCol={}, completionDateCol={}, daysInWorkCol={}, completionResultCol={}, assignmentDate={}, completionDate={}, daysInWork={}, completionResult={}", 
                stage, role, assignmentDateCol, completionDateCol, daysInWorkCol, completionResultCol,
                assignmentDate, completionDate, daysInWork, completionResult);
            
            // Логирование для закупки 2075
            if (purchaseRequestId == 2075L) {
                logger.info("=== ЗАКУПКА 2075: stage={}, role={}, assignmentDate={}, completionDate={}, daysInWork={}, completionResult={} ===", 
                    stage, role, assignmentDate, completionDate, daysInWork, completionResult);
            }
            
            // Сохраняем согласование только если есть хотя бы одно значение
            // (assignmentDate, completionDate, daysInWork, completionResult)
            boolean hasValue = assignmentDate != null || completionDate != null || daysInWork != null 
                    || (completionResult != null && !completionResult.trim().isEmpty());
            
            if (hasValue) {
                PurchaseApproval approval = purchaseApprovalRepository
                    .findByPurchaseRequestIdAndStageAndRole(purchaseRequestId, stage, role)
                    .orElse(new PurchaseApproval(purchaseRequestId, stage, role));
                
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
                String trimmedResult = completionResult != null ? completionResult.trim() : null;
                String currentResult = approval.getCompletionResult();
                
                // Обновляем, если значение изменилось или если ячейка существует и значение пустое (для очистки)
                if (completionResultCell != null) {
                    // Ячейка существует - обновляем значение
                    if (trimmedResult == null || trimmedResult.isEmpty()) {
                        if (currentResult != null) {
                            approval.setCompletionResult(null);
                            updated = true;
                            logger.debug("Cleared completion result for purchase stage={}, role={}", stage, role);
                        }
                    } else {
                        if (!trimmedResult.equals(currentResult)) {
                            approval.setCompletionResult(trimmedResult);
                            updated = true;
                            logger.debug("Updated completion result for purchase stage={}, role={}: '{}'", 
                                stage, role, trimmedResult);
                        }
                    }
                } else if (trimmedResult != null && !trimmedResult.isEmpty()) {
                    // Ячейка не существует, но значение есть (из merged cell или другого источника)
                    if (!trimmedResult.equals(currentResult)) {
                        approval.setCompletionResult(trimmedResult);
                        updated = true;
                        logger.debug("Updated completion result for purchase stage={}, role={}: '{}'", 
                            stage, role, trimmedResult);
                    }
                }
                
                // Добавляем согласование в batch, если:
                // 1. Оно новое (getId() == null) - создаем только если есть данные (hasValue уже проверено выше)
                // 2. ИЛИ есть обновления (updated == true) - значения изменились
                // hasValue уже проверено в условии if выше, поэтому здесь всегда true
                boolean isNew = approval.getId() == null;
                boolean shouldAdd = isNew || updated;
                
                if (shouldAdd) {
                    purchaseApprovalBatch.add(approval);
                    count++;
                    
                    // Логирование для закупки 2075
                    if (purchaseRequestId == 2075L) {
                        logger.info("=== ЗАКУПКА 2075: Создано/обновлено согласование stage={}, role={}, hasValue={}, updated={}, isNew={}, shouldAdd={} ===", 
                            stage, role, hasValue, updated, isNew, shouldAdd);
                    }
                    
                    // Сохраняем batch если он заполнен
                    if (purchaseApprovalBatch.size() >= BATCH_SIZE) {
                        flushPurchaseApprovalBatch();
                    }
                } else if (purchaseRequestId == 2075L) {
                    logger.warn("=== ЗАКУПКА 2075: Пропущено согласование stage={}, role={}, hasValue={}, updated={}, isNew={} ===", 
                        stage, role, hasValue, updated, isNew);
                }
            } else if (purchaseRequestId == 2075L) {
                logger.warn("=== ЗАКУПКА 2075: Не найдены колонки для stage={}, role={} ===", stage, role);
            }
        }
        
        return count;
    }
    
    /**
     * Парсит согласования для одного этапа (устаревший метод, больше не используется)
     * @deprecated Используйте parseApprovalStageDynamic вместо этого метода
     */
    @Deprecated
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
                PurchaseRequestApproval approval = requestApprovalRepository
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
                    requestApprovalBatch.add(approval);
                    count++;
                    
                    // Сохраняем batch если он заполнен
                    if (requestApprovalBatch.size() >= BATCH_SIZE) {
                        flushRequestApprovalBatch();
                    }
                }
            }
            
            roleIndex++;
        }
        
        return count;
    }
    
    /**
     * Парсит согласования для одного этапа с учетом пропущенных колонок (устаревший метод, больше не используется)
     * @deprecated Используйте parseApprovalStageDynamic вместо этого метода
     */
    @Deprecated
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
                PurchaseRequestApproval approval = requestApprovalRepository
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
                    requestApprovalBatch.add(approval);
                    count++;
                    
                    // Сохраняем batch если он заполнен
                    if (requestApprovalBatch.size() >= BATCH_SIZE) {
                        flushRequestApprovalBatch();
                    }
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
     * Оптимизировано: использует статические DateTimeFormatter вместо создания новых
     */
    private LocalDateTime parseStringDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }
        
        dateStr = dateStr.trim();
        
        // Используем предварительно созданные статические форматтеры
        for (int i = 0; i < DATE_TIME_FORMATTERS.length; i++) {
            java.time.format.DateTimeFormatter formatter = DATE_TIME_FORMATTERS[i];
            try {
                // Форматтеры с индексами 0, 3, 6 содержат время (HH:mm:ss)
                if (i == 0 || i == 3 || i == 6) {
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
    
    /**
     * Ищет колонку "Договор.Внутренний номер" в заголовках отчета
     * Ищет во всех строках заголовков (headerRow0, headerRow1, headerRow2), как и другие колонки
     */
    private Integer findContractInnerIdColumn(Row headerRow0, Row headerRow1, Row headerRow2) {
        // Определяем максимальное количество колонок
        int maxCol = Math.max(
            Math.max(headerRow0 != null ? headerRow0.getLastCellNum() : 0, 
                     headerRow1 != null ? headerRow1.getLastCellNum() : 0),
            headerRow2 != null ? headerRow2.getLastCellNum() : 0
        );
        
        // Ищем колонку по точному совпадению во всех строках заголовков
        for (int col = 0; col < maxCol; col++) {
            // Проверяем headerRow2 (основная строка с полями)
            if (headerRow2 != null) {
                Cell cell = headerRow2.getCell(col);
                String cellValue = getCellValueAsString(cell);
                if (cellValue != null && cellValue.trim().equals(CONTRACT_INNER_ID_COLUMN)) {
                    logger.debug("Found contractInnerId column '{}' at index {} in report file (headerRow2)", CONTRACT_INNER_ID_COLUMN, col);
                    return col;
                }
            }
            
            // Проверяем headerRow1 (строка с ролями) - на случай, если колонка там
            if (headerRow1 != null) {
                Cell cell = headerRow1.getCell(col);
                String cellValue = getCellValueAsString(cell);
                if (cellValue != null && cellValue.trim().equals(CONTRACT_INNER_ID_COLUMN)) {
                    logger.debug("Found contractInnerId column '{}' at index {} in report file (headerRow1)", CONTRACT_INNER_ID_COLUMN, col);
                    return col;
                }
            }
            
            // Проверяем headerRow0 (строка с этапами) - на случай, если колонка там
            if (headerRow0 != null) {
                Cell cell = headerRow0.getCell(col);
                String cellValue = getCellValueAsString(cell);
                if (cellValue != null && cellValue.trim().equals(CONTRACT_INNER_ID_COLUMN)) {
                    logger.debug("Found contractInnerId column '{}' at index {} in report file (headerRow0)", CONTRACT_INNER_ID_COLUMN, col);
                    return col;
                }
            }
        }
        
        // Ищем по частичному совпадению (содержит "Договор" и "Внутренний") во всех строках
        for (int col = 0; col < maxCol; col++) {
            // Проверяем headerRow2 (основная строка с полями)
            if (headerRow2 != null) {
                Cell cell = headerRow2.getCell(col);
                String cellValue = getCellValueAsString(cell);
                if (cellValue != null) {
                    String normalizedValue = cellValue.trim();
                    boolean hasContract = normalizedValue.contains("Договор");
                    boolean hasInner = normalizedValue.contains("Внутренний");
                    boolean isNotSimpleInner = !normalizedValue.equals("Внутренний номер");
                    boolean hasContractDotInner = normalizedValue.contains("Договор.") && normalizedValue.contains("Внутренний");
                    
                    if ((hasContract && hasInner && isNotSimpleInner) || hasContractDotInner) {
                        logger.info("Found contractInnerId column by partial match: '{}' at index {} in report file (headerRow2)", cellValue, col);
                        return col;
                    }
                }
            }
        }
        
        logger.debug("ContractInnerId column '{}' not found in report file", CONTRACT_INNER_ID_COLUMN);
        return null;
    }
    
    /**
     * Сохраняет все накопленные согласования и обновления пакетами
     */
    private void flushAllBatches() {
        flushRequestApprovalBatch();
        flushPurchaseApprovalBatch();
        flushPurchaseUpdateBatch();
    }
    
    /**
     * Сохраняет все согласования в отдельной транзакции
     * Это гарантирует, что согласования сохранятся даже если обновление статусов завершится с ошибкой
     */
    @Transactional
    private void saveAllApprovalsInTransaction() {
        logger.info("Saving all approvals in separate transaction before status update");
        flushRequestApprovalBatch();
        flushPurchaseApprovalBatch();
        flushPurchaseUpdateBatch();
        logger.info("All approvals saved successfully");
    }
    
    /**
     * Сохраняет накопленные согласования заявок пакетом
     * Использует save вместо saveAll для правильной обработки существующих записей
     */
    private void flushRequestApprovalBatch() {
        if (!requestApprovalBatch.isEmpty()) {
            try {
                int saved = 0;
                int skipped = 0;
                for (PurchaseRequestApproval approval : requestApprovalBatch) {
                    try {
                        // Используем save для правильной обработки существующих записей (merge)
                        requestApprovalRepository.save(approval);
                        saved++;
                    } catch (Exception e) {
                        // Если согласование уже существует, пропускаем его
                        if (e.getMessage() != null && e.getMessage().contains("unique_approval_per_request")) {
                            logger.debug("Approval already exists, skipping: idPurchaseRequest={}, stage={}, role={}", 
                                approval.getIdPurchaseRequest(), approval.getStage(), approval.getRole());
                            skipped++;
                        } else {
                            logger.warn("Error saving approval: idPurchaseRequest={}, stage={}, role={}, error={}", 
                                approval.getIdPurchaseRequest(), approval.getStage(), approval.getRole(), e.getMessage());
                            throw e; // Пробрасываем другие ошибки
                        }
                    }
                }
                logger.info("Flushed {} request approvals to database (saved: {}, skipped: {})", 
                    requestApprovalBatch.size(), saved, skipped);
                requestApprovalBatch.clear();
            } catch (Exception e) {
                logger.error("Error flushing request approval batch: {}", e.getMessage(), e);
                // Очищаем batch даже при ошибке, чтобы не зациклиться
                requestApprovalBatch.clear();
            }
        }
    }
    
    /**
     * Сохраняет накопленные согласования закупок пакетом
     * Использует save вместо saveAll для правильной обработки существующих записей
     */
    private void flushPurchaseApprovalBatch() {
        if (!purchaseApprovalBatch.isEmpty()) {
            try {
                int saved = 0;
                int skipped = 0;
                for (PurchaseApproval approval : purchaseApprovalBatch) {
                    try {
                        // Используем save для правильной обработки существующих записей (merge)
                        purchaseApprovalRepository.save(approval);
                        saved++;
                    } catch (Exception e) {
                        // Если согласование уже существует, пропускаем его
                        if (e.getMessage() != null && e.getMessage().contains("unique")) {
                            logger.debug("Approval already exists, skipping: purchaseRequestId={}, stage={}, role={}", 
                                approval.getPurchaseRequestId(), approval.getStage(), approval.getRole());
                            skipped++;
                        } else {
                            logger.warn("Error saving approval: purchaseRequestId={}, stage={}, role={}, error={}", 
                                approval.getPurchaseRequestId(), approval.getStage(), approval.getRole(), e.getMessage());
                            throw e; // Пробрасываем другие ошибки
                        }
                    }
                }
                logger.info("Flushed {} purchase approvals to database (saved: {}, skipped: {})", 
                    purchaseApprovalBatch.size(), saved, skipped);
                purchaseApprovalBatch.clear();
            } catch (Exception e) {
                logger.error("Error flushing purchase approval batch: {}", e.getMessage(), e);
                // Очищаем batch даже при ошибке, чтобы не зациклиться
                purchaseApprovalBatch.clear();
            }
        }
    }
    
    /**
     * Сохраняет накопленные обновления закупок пакетом
     */
    private void flushPurchaseUpdateBatch() {
        if (!purchaseUpdateBatch.isEmpty()) {
            try {
                purchaseRepository.saveAll(purchaseUpdateBatch);
                logger.debug("Flushed {} purchase updates to database", purchaseUpdateBatch.size());
                purchaseUpdateBatch.clear();
            } catch (Exception e) {
                logger.error("Error flushing purchase update batch: {}", e.getMessage(), e);
            }
        }
    }
    
    /**
     * Обновляет contractInnerId для закупки из колонки "Договор.Внутренний номер"
     */
    private void updatePurchaseContractInnerId(Purchase purchase, Row row, Integer contractInnerIdColumnIndex) {
        try {
            Cell contractInnerIdCell = row.getCell(contractInnerIdColumnIndex);
            String contractInnerId = getCellValueAsString(contractInnerIdCell);
            
            if (contractInnerId != null && !contractInnerId.trim().isEmpty()) {
                String trimmedContractInnerId = contractInnerId.trim();
                
                // Валидация: contractInnerId не должен совпадать с innerId закупки
                if (trimmedContractInnerId.equals(purchase.getInnerId())) {
                    logger.warn("Row {}: contractInnerId '{}' equals purchase innerId '{}', skipping contractInnerId for purchase {}", 
                        row.getRowNum() + 1, trimmedContractInnerId, purchase.getInnerId(), purchase.getInnerId());
                } else {
                    // Добавляем внутренний номер договора (может быть несколько)
                    // Проверяем, не добавлен ли уже этот договор
                    if (!purchase.getContractInnerIds().contains(trimmedContractInnerId)) {
                        purchase.addContractInnerId(trimmedContractInnerId);
                        // Добавляем в batch для обновления
                        if (!purchaseUpdateBatch.contains(purchase)) {
                            purchaseUpdateBatch.add(purchase);
                        }
                        logger.debug("Row {}: Queued purchase {} for batch update with contractInnerId: '{}'", 
                            row.getRowNum() + 1, purchase.getInnerId(), trimmedContractInnerId);
                        
                        // Сохраняем batch если он заполнен
                        if (purchaseUpdateBatch.size() >= BATCH_SIZE) {
                            flushPurchaseUpdateBatch();
                        }
                    }
                }
            }
            // Если колонка пустая, не очищаем существующие договоры (они могут быть из других строк)
        } catch (Exception e) {
            logger.warn("Error updating contractInnerId for purchase {} in row {}: {}", 
                purchase.getInnerId(), row.getRowNum() + 1, e.getMessage());
        }
    }
}

