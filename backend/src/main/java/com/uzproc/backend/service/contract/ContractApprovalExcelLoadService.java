package com.uzproc.backend.service.contract;

import com.uzproc.backend.entity.Cfo;
import com.uzproc.backend.repository.CfoRepository;
import com.uzproc.backend.repository.contract.ContractRepository;
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
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

/**
 * Загружает согласования договоров из Excel (папка frontend/upload/approvals).
 * Фильтр: только строки с "Вид документа" = "Договор".
 * Связь с договором по колонке "Документ.Внутренний номер" (contract.inner_id).
 *
 * Производительность (важно для файла на ~33k строк):
 *  - Excel парсится в лёгкие DTO ({@link ContractApprovalRowData}) без обращений к БД;
 *  - справочники (contract inner_id → id, cfo name → id) предзагружаются в Map ОДНИМ запросом — нет N+1;
 *  - запись идёт батчами в отдельных транзакциях с flush/clear через {@link ContractApprovalBatchSaver}
 *    (вместо одной гигантской @Transactional на весь файл, которая раздувала сессию Hibernate до O(n²)).
 */
@Service
public class ContractApprovalExcelLoadService {

    private static final Logger logger = LoggerFactory.getLogger(ContractApprovalExcelLoadService.class);

    private static final String DOCUMENT_TYPE_COLUMN = "Вид документа";
    private static final String CONTRACT_TYPE = "Договор";
    private static final String INNER_ID_COLUMN = "Документ.Внутренний номер";
    private static final String GUID_COLUMN = "GUID";
    private static final String CFO_COLUMN = "ЦФО";
    private static final String DOCUMENT_FORM_COLUMN = "Форма документа";
    private static final String STAGE_COLUMN = "Этап";
    private static final String ROLE_COLUMN = "Роль";
    private static final String EXECUTOR_FULL_NAME_COLUMN = "Исполнитель.Полное имя";
    private static final String EXECUTOR_EMAIL_COLUMN = "Исполнитель.Email";
    private static final String ASSIGNMENT_DATE_COLUMN = "Дата назначения";
    private static final String PLANNED_COMPLETION_DATE_COLUMN = "Плановая дата исполнения";
    private static final String COMPLETION_DATE_COLUMN = "Фактическая дата исполнения";
    private static final String COMPLETION_RESULT_COLUMN = "Результат выполнения";
    private static final String COMMENT_COLUMN = "Комментарий";
    private static final String IS_WAITING_COLUMN = "Ожидание";

    private static final int BATCH_SIZE = 500;

    private static final DateTimeFormatter[] DATE_TIME_PARSERS = {
        DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss"),
        DateTimeFormatter.ofPattern("dd.MM.yyyy H:mm:ss"),
        DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm"),
        DateTimeFormatter.ofPattern("dd.MM.yyyy H:mm"),
        DateTimeFormatter.ofPattern("dd.MM.yyyy"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd H:mm:ss"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd H:mm"),
        DateTimeFormatter.ofPattern("yyyy-MM-dd"),
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss"),
        DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm"),
        DateTimeFormatter.ofPattern("dd/MM/yyyy")
    };

    private final ContractRepository contractRepository;
    private final CfoRepository cfoRepository;
    private final ContractApprovalBatchSaver batchSaver;
    private final DataFormatter dataFormatter = new DataFormatter();

    public ContractApprovalExcelLoadService(
            ContractRepository contractRepository,
            CfoRepository cfoRepository,
            ContractApprovalBatchSaver batchSaver) {
        this.contractRepository = contractRepository;
        this.cfoRepository = cfoRepository;
        this.batchSaver = batchSaver;
    }

    /**
     * Загружает согласования договоров из Excel файла (папка approvals).
     * Только строки с "Вид документа" = "Договор". Связь с договором по "Документ.Внутренний номер".
     *
     * Без @Transactional на уровне метода: запись идёт независимыми REQUIRES_NEW-батчами,
     * прогресс коммитится по ходу, сбой одного батча не откатывает весь импорт.
     */
    public int loadContractApprovalsFromExcel(File excelFile) throws IOException {
        Workbook workbook;
        try (FileInputStream fis = new FileInputStream(excelFile)) {
            if (excelFile.getName().endsWith(".xlsx")) {
                workbook = new XSSFWorkbook(fis);
            } else {
                workbook = new HSSFWorkbook(fis);
            }
        }

        List<ContractApprovalRowData> rows;
        int skippedNoContract;
        int skippedNotContractType;
        try {
            Sheet sheet = workbook.getSheetAt(0);

            // --- Поиск строки заголовка ---
            Row headerRow = null;
            int headerRowIndex = -1;
            Map<String, Integer> columnIndexMap = null;
            final String[] requiredHeaderColumns = { INNER_ID_COLUMN, DOCUMENT_TYPE_COLUMN, STAGE_COLUMN, ROLE_COLUMN };
            final int headerSearchRows = 20;

            for (int i = 0; i < Math.min(headerSearchRows, sheet.getLastRowNum() + 1); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                Map<String, Integer> tempMap = buildColumnIndexMap(row);
                boolean allRequired = true;
                for (String col : requiredHeaderColumns) {
                    if (findColumnIndex(tempMap, col) == null) {
                        allRequired = false;
                        break;
                    }
                }
                if (allRequired) {
                    headerRow = row;
                    headerRowIndex = i;
                    columnIndexMap = tempMap;
                    logger.debug("Contract approvals: header row found at 0-based index {} (row {} in Excel)", i, i + 1);
                    break;
                }
            }

            if (columnIndexMap == null) {
                logger.warn("Contract approvals: header row not found in file {} (checked first {} rows, required columns: {})",
                        excelFile.getName(), headerSearchRows, Arrays.toString(requiredHeaderColumns));
                return 0;
            }

            Integer documentTypeColumnIndex = findColumnIndex(columnIndexMap, DOCUMENT_TYPE_COLUMN);
            Integer innerIdColumnIndex = findColumnIndex(columnIndexMap, INNER_ID_COLUMN);
            Integer guidColumnIndex = findColumnIndex(columnIndexMap, GUID_COLUMN);
            Integer cfoColumnIndex = findColumnIndex(columnIndexMap, CFO_COLUMN);
            Integer documentFormColumnIndex = findColumnIndex(columnIndexMap, DOCUMENT_FORM_COLUMN);
            Integer stageColumnIndex = findColumnIndex(columnIndexMap, STAGE_COLUMN);
            Integer roleColumnIndex = findColumnIndex(columnIndexMap, ROLE_COLUMN);
            Integer executorFullNameColumnIndex = findColumnIndex(columnIndexMap, EXECUTOR_FULL_NAME_COLUMN);
            Integer executorEmailColumnIndex = findColumnIndex(columnIndexMap, EXECUTOR_EMAIL_COLUMN);
            Integer assignmentDateColumnIndex = findColumnIndex(columnIndexMap, ASSIGNMENT_DATE_COLUMN);
            Integer plannedCompletionDateColumnIndex = findColumnIndex(columnIndexMap, PLANNED_COMPLETION_DATE_COLUMN);
            Integer completionDateColumnIndex = findColumnIndex(columnIndexMap, COMPLETION_DATE_COLUMN);
            Integer completionResultColumnIndex = findColumnIndex(columnIndexMap, COMPLETION_RESULT_COLUMN);
            Integer commentColumnIndex = findColumnIndex(columnIndexMap, COMMENT_COLUMN);
            Integer isWaitingColumnIndex = findColumnIndex(columnIndexMap, IS_WAITING_COLUMN);

            if (documentTypeColumnIndex == null) {
                logger.warn("Contract approvals: column '{}' not found in file {}", DOCUMENT_TYPE_COLUMN, excelFile.getName());
                return 0;
            }
            if (innerIdColumnIndex == null) {
                logger.warn("Contract approvals: column '{}' not found in file {}", INNER_ID_COLUMN, excelFile.getName());
                return 0;
            }
            if (stageColumnIndex == null || roleColumnIndex == null) {
                logger.warn("Contract approvals: columns '{}' or '{}' not found in file {}", STAGE_COLUMN, ROLE_COLUMN, excelFile.getName());
                return 0;
            }

            // --- Предзагрузка справочников в память (устранение N+1) ---
            Map<String, Long> contractIdByInnerId = loadContractCache();
            Map<String, Long> cfoIdByName = loadCfoCache();
            logger.info("Contract approvals: caches loaded — contracts: {}, cfo: {}", contractIdByInnerId.size(), cfoIdByName.size());

            // --- Парсинг всех строк в DTO (без обращений к БД) ---
            Iterator<Row> rowIterator = sheet.iterator();
            for (int i = 0; i <= headerRowIndex && rowIterator.hasNext(); i++) {
                rowIterator.next();
            }

            rows = new ArrayList<>();
            skippedNoContract = 0;
            skippedNotContractType = 0;
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                if (isRowEmpty(row)) continue;

                String docType = getCellValueAsString(row.getCell(documentTypeColumnIndex));
                if (docType == null || !CONTRACT_TYPE.equals(docType.trim())) {
                    skippedNotContractType++;
                    continue;
                }

                String innerId = getCellValueAsString(row.getCell(innerIdColumnIndex));
                if (innerId == null || innerId.trim().isEmpty()) {
                    skippedNoContract++;
                    continue;
                }
                Long contractId = contractIdByInnerId.get(innerId.trim());
                if (contractId == null) {
                    logger.debug("Contract approvals: contract not found for innerId '{}', row {}", innerId.trim(), row.getRowNum() + 1);
                    skippedNoContract++;
                    continue;
                }

                ContractApprovalRowData data = parseContractApprovalRow(row, contractId, cfoIdByName,
                        guidColumnIndex, cfoColumnIndex, documentFormColumnIndex,
                        stageColumnIndex, roleColumnIndex, executorFullNameColumnIndex, executorEmailColumnIndex,
                        assignmentDateColumnIndex, plannedCompletionDateColumnIndex, completionDateColumnIndex,
                        completionResultColumnIndex, commentColumnIndex, isWaitingColumnIndex);
                if (data != null) {
                    rows.add(data);
                }
            }
        } finally {
            workbook.close();
        }

        logger.info("Contract approvals: parsed {} rows from file {} (skipped not contract type: {}, no contract: {})",
                rows.size(), excelFile.getName(), skippedNotContractType, skippedNoContract);

        // --- Фаза 1: резолв/создание исполнителей батчами, проставление executorId ---
        resolveExecutors(rows);

        // --- Фаза 2: upsert согласований батчами ---
        int loadedCount = saveApprovalsInBatches(rows);

        logger.info("Loaded {} contract approvals from file {} (rows: {}, skipped not contract type: {}, no contract: {})",
                loadedCount, excelFile.getName(), rows.size(), skippedNotContractType, skippedNoContract);
        return loadedCount;
    }

    // ============================ Кэши справочников ============================

    private Map<String, Long> loadContractCache() {
        List<Object[]> all = contractRepository.findAllInnerIdAndId();
        Map<String, Long> map = new HashMap<>(all.size() * 2);
        for (Object[] r : all) {
            String innerId = (String) r[0];
            Long id = (Long) r[1];
            if (innerId != null && id != null) {
                map.put(innerId.trim(), id);
            }
        }
        return map;
    }

    private Map<String, Long> loadCfoCache() {
        List<Cfo> all = cfoRepository.findAll();
        Map<String, Long> map = new HashMap<>(all.size() * 2);
        for (Cfo cfo : all) {
            if (cfo.getName() != null && cfo.getId() != null) {
                map.put(cfo.getName().toLowerCase().trim(), cfo.getId());
            }
        }
        return map;
    }

    // ============================ Фаза 1: пользователи ============================

    /**
     * Собирает уникальных исполнителей и резолвит/создаёт их батчами (REQUIRES_NEW),
     * затем проставляет executorId в строки. Кэш наполняется только закоммиченными id,
     * поэтому сбой батча не оставляет ссылок на несуществующих пользователей.
     */
    private void resolveExecutors(List<ContractApprovalRowData> rows) {
        // Уникальные персоны: key → {key, fullName, email}
        LinkedHashMap<String, String[]> distinct = new LinkedHashMap<>();
        for (ContractApprovalRowData row : rows) {
            String key = row.executorKey();
            if (key != null && !distinct.containsKey(key)) {
                distinct.put(key, new String[]{ key, row.executorFullName, row.executorEmail });
            }
        }
        if (distinct.isEmpty()) {
            return;
        }

        Map<String, Long> userIdCache = new HashMap<>(distinct.size() * 2);
        List<String[]> batch = new ArrayList<>(BATCH_SIZE);
        int resolved = 0;
        for (String[] person : distinct.values()) {
            batch.add(person);
            if (batch.size() >= BATCH_SIZE) {
                resolved += flushUserBatch(batch, userIdCache);
            }
        }
        if (!batch.isEmpty()) {
            resolved += flushUserBatch(batch, userIdCache);
        }
        logger.info("Contract approvals: resolved {} distinct executors", resolved);

        // Проставляем executorId по кэшу
        for (ContractApprovalRowData row : rows) {
            String key = row.executorKey();
            if (key != null) {
                row.executorId = userIdCache.get(key);
            }
        }
    }

    /**
     * Сохраняет батч персон; в глобальный кэш кладёт ТОЛЬКО закоммиченные id.
     * При сбое быстрого пути — построчный fallback (теряется только плохая персона).
     */
    private int flushUserBatch(List<String[]> batch, Map<String, Long> userIdCache) {
        if (batch.isEmpty()) return 0;
        try {
            Map<String, Long> committed = batchSaver.resolveUsersBatch(batch);
            userIdCache.putAll(committed);
            return committed.size();
        } catch (Exception e) {
            logger.warn("Contract approvals: user batch resolve failed ({}), retrying row-by-row for {} persons",
                    e.getMessage(), batch.size());
            int saved = 0;
            for (String[] person : batch) {
                try {
                    Long id = batchSaver.resolveUserIsolated(person[1], person[2]);
                    if (id != null) {
                        userIdCache.put(person[0], id);
                        saved++;
                    }
                } catch (Exception ex) {
                    logger.warn("Contract approvals: skipping executor '{}': {}", person[1], ex.getMessage());
                }
            }
            return saved;
        } finally {
            batch.clear();
        }
    }

    // ============================ Фаза 2: согласования ============================

    private int saveApprovalsInBatches(List<ContractApprovalRowData> rows) {
        int loadedCount = 0;
        int batchNumber = 0;
        List<ContractApprovalRowData> batch = new ArrayList<>(BATCH_SIZE);
        for (ContractApprovalRowData row : rows) {
            batch.add(row);
            if (batch.size() >= BATCH_SIZE) {
                batchNumber++;
                loadedCount += flushApprovalBatch(batch);
                logger.debug("Contract approvals: batch {} saved ({} rows so far)", batchNumber, loadedCount);
            }
        }
        if (!batch.isEmpty()) {
            batchNumber++;
            loadedCount += flushApprovalBatch(batch);
            logger.debug("Contract approvals: final batch {} saved ({} rows total)", batchNumber, loadedCount);
        }
        return loadedCount;
    }

    /**
     * Быстрый путь — {@link ContractApprovalBatchSaver#saveApprovalsBatch}; при сбое (например,
     * одна строка испортила сессию) батч повторяется построчно через saveApprovalRowIsolated —
     * теряется только плохая строка, а не весь батч. Список ВСЕГДА очищается в finally.
     */
    private int flushApprovalBatch(List<ContractApprovalRowData> batch) {
        if (batch.isEmpty()) return 0;
        try {
            return batchSaver.saveApprovalsBatch(batch);
        } catch (Exception e) {
            logger.warn("Contract approvals: batch save failed ({}), retrying row-by-row for {} rows",
                    e.getMessage(), batch.size());
            int saved = 0;
            for (ContractApprovalRowData data : batch) {
                try {
                    saved += batchSaver.saveApprovalRowIsolated(data);
                } catch (Exception ex) {
                    logger.warn("Contract approvals: skipping row {}: {}", data.excelRowNum, ex.getMessage());
                }
            }
            return saved;
        } finally {
            batch.clear();
        }
    }

    // ============================ Парсинг строки ============================

    private ContractApprovalRowData parseContractApprovalRow(Row row, Long contractId, Map<String, Long> cfoIdByName,
            Integer guidColumnIndex, Integer cfoColumnIndex, Integer documentFormColumnIndex,
            Integer stageColumnIndex, Integer roleColumnIndex, Integer executorFullNameColumnIndex, Integer executorEmailColumnIndex,
            Integer assignmentDateColumnIndex, Integer plannedCompletionDateColumnIndex, Integer completionDateColumnIndex,
            Integer completionResultColumnIndex, Integer commentColumnIndex, Integer isWaitingColumnIndex) {

        String stage = getCellValueAsString(row.getCell(stageColumnIndex));
        if (stage == null || stage.trim().isEmpty()) {
            return null;
        }
        String role = getCellValueAsString(row.getCell(roleColumnIndex));
        if (role == null || role.trim().isEmpty()) {
            return null;
        }

        ContractApprovalRowData a = new ContractApprovalRowData();
        a.contractId = contractId;
        a.stage = stage.trim();
        a.role = role.trim();
        a.excelRowNum = row.getRowNum() + 1;

        if (guidColumnIndex != null) {
            String guidStr = getCellValueAsString(row.getCell(guidColumnIndex));
            if (guidStr != null && !guidStr.trim().isEmpty()) {
                try {
                    a.guid = UUID.fromString(guidStr.trim());
                } catch (IllegalArgumentException e) {
                    logger.debug("Invalid GUID in row {}: {}", row.getRowNum() + 1, guidStr);
                }
            }
        }

        if (cfoColumnIndex != null) {
            String cfoStr = getCellValueAsString(row.getCell(cfoColumnIndex));
            if (cfoStr != null && !cfoStr.trim().isEmpty()) {
                a.cfoId = cfoIdByName.get(cfoStr.toLowerCase().trim());
            }
        }

        if (documentFormColumnIndex != null) {
            String docForm = getCellValueAsString(row.getCell(documentFormColumnIndex));
            if (docForm != null && !docForm.trim().isEmpty()) {
                a.documentForm = docForm.trim();
            }
        }

        if (executorFullNameColumnIndex != null) {
            String fullName = getCellValueAsString(row.getCell(executorFullNameColumnIndex));
            if (fullName != null && !fullName.trim().isEmpty()) {
                a.executorFullName = fullName.trim();
            }
        }
        if (executorEmailColumnIndex != null) {
            String email = getCellValueAsString(row.getCell(executorEmailColumnIndex));
            if (email != null && !email.trim().isEmpty()) {
                a.executorEmail = email.trim();
            }
        }

        if (assignmentDateColumnIndex != null) {
            a.assignmentDate = parseDateCell(row.getCell(assignmentDateColumnIndex));
        }
        if (plannedCompletionDateColumnIndex != null) {
            a.plannedCompletionDate = parseDateCell(row.getCell(plannedCompletionDateColumnIndex));
        }
        if (completionDateColumnIndex != null) {
            a.completionDate = parseDateCell(row.getCell(completionDateColumnIndex));
        }

        if (completionResultColumnIndex != null) {
            String result = getCellValueAsString(row.getCell(completionResultColumnIndex));
            if (result != null && !result.trim().isEmpty()) {
                a.completionResult = result.trim().length() > 1000 ? result.trim().substring(0, 1000) : result.trim();
            }
        }
        if (commentColumnIndex != null) {
            String comment = getCellValueAsString(row.getCell(commentColumnIndex));
            if (comment != null && !comment.trim().isEmpty()) {
                a.commentText = comment.trim().length() > 2000 ? comment.trim().substring(0, 2000) : comment.trim();
            }
        }
        if (isWaitingColumnIndex != null) {
            a.isWaiting = parseBooleanCell(row.getCell(isWaitingColumnIndex));
        }

        return a;
    }

    // ============================ Утилиты парсинга ============================

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
        String normalized = normalizeColumnName(columnName);
        for (Map.Entry<String, Integer> e : columnIndexMap.entrySet()) {
            if (normalizeColumnName(e.getKey()).equals(normalized)) return e.getValue();
            if (e.getKey().toLowerCase().contains(columnName.toLowerCase()) || columnName.toLowerCase().contains(e.getKey().toLowerCase())) {
                return e.getValue();
            }
        }
        return null;
    }

    private static String normalizeColumnName(String str) {
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

    private LocalDateTime parseDateCell(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                Date d = cell.getDateCellValue();
                if (d != null) {
                    return Instant.ofEpochMilli(d.getTime()).atZone(ZoneId.systemDefault()).toLocalDateTime();
                }
            }
            if (cell.getCellType() == CellType.NUMERIC) {
                double n = cell.getNumericCellValue();
                if (n > 0 && n < 1000000) {
                    try {
                        Date d = DateUtil.getJavaDate(n);
                        if (d != null) {
                            return Instant.ofEpochMilli(d.getTime()).atZone(ZoneId.systemDefault()).toLocalDateTime();
                        }
                    } catch (Exception ignored) { }
                }
            }
            String raw = getCellValueAsString(cell);
            if (raw == null || raw.trim().isEmpty()) return null;
            for (DateTimeFormatter f : DATE_TIME_PARSERS) {
                try {
                    return LocalDateTime.parse(raw.trim(), f);
                } catch (DateTimeParseException ignored) { }
            }
            DateTimeFormatter[] dateOnlyParsers = {
                DateTimeFormatter.ofPattern("dd.MM.yyyy"),
                DateTimeFormatter.ofPattern("yyyy-MM-dd"),
                DateTimeFormatter.ofPattern("dd/MM/yyyy")
            };
            for (DateTimeFormatter f : dateOnlyParsers) {
                try {
                    return LocalDate.parse(raw.trim(), f).atStartOfDay();
                } catch (DateTimeParseException ignored) { }
            }
        } catch (Exception e) {
            logger.debug("Cannot parse date from cell: {}", getCellValueAsString(cell));
        }
        return null;
    }

    private Boolean parseBooleanCell(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.BOOLEAN) {
                return cell.getBooleanCellValue();
            }
            if (cell.getCellType() == CellType.STRING) {
                String v = getCellValueAsString(cell);
                if (v == null || v.trim().isEmpty()) return null;
                v = v.trim().toLowerCase();
                if ("да".equals(v) || "true".equals(v) || "1".equals(v) || "yes".equals(v)) return true;
                if ("нет".equals(v) || "false".equals(v) || "0".equals(v) || "no".equals(v)) return false;
            }
            if (cell.getCellType() == CellType.NUMERIC) {
                double n = cell.getNumericCellValue();
                if (n == 1.0) return true;
                if (n == 0.0) return false;
            }
        } catch (Exception e) {
            logger.debug("Cannot parse boolean from cell: {}", getCellValueAsString(cell));
        }
        return null;
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
