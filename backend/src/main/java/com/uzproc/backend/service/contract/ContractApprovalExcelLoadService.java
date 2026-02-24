package com.uzproc.backend.service.contract;

import com.uzproc.backend.entity.Cfo;
import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.contract.ContractApproval;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.CfoRepository;
import com.uzproc.backend.repository.contract.ContractApprovalRepository;
import com.uzproc.backend.repository.contract.ContractRepository;
import com.uzproc.backend.repository.user.UserRepository;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final ContractApprovalRepository contractApprovalRepository;
    private final ContractRepository contractRepository;
    private final CfoRepository cfoRepository;
    private final UserRepository userRepository;
    private final DataFormatter dataFormatter = new DataFormatter();

    public ContractApprovalExcelLoadService(
            ContractApprovalRepository contractApprovalRepository,
            ContractRepository contractRepository,
            CfoRepository cfoRepository,
            UserRepository userRepository) {
        this.contractApprovalRepository = contractApprovalRepository;
        this.contractRepository = contractRepository;
        this.cfoRepository = cfoRepository;
        this.userRepository = userRepository;
    }

    /**
     * Загружает согласования договоров из Excel файла (папка approvals).
     * Только строки с "Вид документа" = "Договор". Связь с договором по "Документ.Внутренний номер".
     */
    @Transactional
    public int loadContractApprovalsFromExcel(File excelFile) throws IOException {
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
            Row headerRow = null;
            int headerRowIndex = -1;
            Map<String, Integer> columnIndexMap = null;

            // Обязательные колонки заголовка: строка считается заголовком, если в ней есть все эти колонки.
            // Поиск в диапазоне первых строк (заголовки могут сдвигаться).
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

            Iterator<Row> rowIterator = sheet.iterator();
            for (int i = 0; i <= headerRowIndex && rowIterator.hasNext(); i++) {
                rowIterator.next();
            }

            int loadedCount = 0;
            int skippedNoContract = 0;
            int skippedNotContractType = 0;
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
                innerId = innerId.trim();

                Optional<Contract> contractOpt = contractRepository.findByInnerId(innerId);
                if (contractOpt.isEmpty()) {
                    logger.debug("Contract approvals: contract not found for innerId '{}', row {}", innerId, row.getRowNum() + 1);
                    skippedNoContract++;
                    continue;
                }
                Contract contract = contractOpt.get();
                Long contractId = contract.getId();

                ContractApproval approval = parseContractApprovalRow(row,
                        innerIdColumnIndex, guidColumnIndex, cfoColumnIndex, documentFormColumnIndex,
                        stageColumnIndex, roleColumnIndex, executorFullNameColumnIndex, executorEmailColumnIndex,
                        assignmentDateColumnIndex, plannedCompletionDateColumnIndex, completionDateColumnIndex,
                        completionResultColumnIndex, commentColumnIndex, isWaitingColumnIndex);
                if (approval == null) continue;

                approval.setContractId(contractId);

                Optional<ContractApproval> existingOpt = contractApprovalRepository.findByContractIdAndStageAndRole(contractId, approval.getStage(), approval.getRole());
                if (existingOpt.isPresent()) {
                    ContractApproval existing = existingOpt.get();
                    boolean updated = updateContractApprovalFields(existing, approval);
                    if (updated) {
                        contractApprovalRepository.save(existing);
                        loadedCount++;
                    }
                } else {
                    contractApprovalRepository.save(approval);
                    loadedCount++;
                }
            }

            logger.info("Loaded {} contract approvals from file {} (skipped not contract type: {}, no contract: {})",
                    loadedCount, excelFile.getName(), skippedNotContractType, skippedNoContract);
            return loadedCount;
        } finally {
            workbook.close();
        }
    }

    private ContractApproval parseContractApprovalRow(Row row,
            Integer innerIdColumnIndex, Integer guidColumnIndex, Integer cfoColumnIndex, Integer documentFormColumnIndex,
            Integer stageColumnIndex, Integer roleColumnIndex, Integer executorFullNameColumnIndex, Integer executorEmailColumnIndex,
            Integer assignmentDateColumnIndex, Integer plannedCompletionDateColumnIndex, Integer completionDateColumnIndex,
            Integer completionResultColumnIndex, Integer commentColumnIndex, Integer isWaitingColumnIndex) {
        ContractApproval a = new ContractApproval();

        if (stageColumnIndex != null) {
            String stage = getCellValueAsString(row.getCell(stageColumnIndex));
            if (stage != null && !stage.trim().isEmpty()) {
                a.setStage(stage.trim());
            } else {
                return null;
            }
        } else {
            return null;
        }

        if (roleColumnIndex != null) {
            String role = getCellValueAsString(row.getCell(roleColumnIndex));
            if (role != null && !role.trim().isEmpty()) {
                a.setRole(role.trim());
            } else {
                return null;
            }
        } else {
            return null;
        }

        if (guidColumnIndex != null) {
            String guidStr = getCellValueAsString(row.getCell(guidColumnIndex));
            if (guidStr != null && !guidStr.trim().isEmpty()) {
                try {
                    a.setGuid(UUID.fromString(guidStr.trim()));
                } catch (IllegalArgumentException e) {
                    logger.debug("Invalid GUID in row {}: {}", row.getRowNum() + 1, guidStr);
                }
            }
        }

        if (cfoColumnIndex != null) {
            String cfoStr = getCellValueAsString(row.getCell(cfoColumnIndex));
            if (cfoStr != null && !cfoStr.trim().isEmpty()) {
                Optional<Cfo> cfoOpt = cfoRepository.findByNameIgnoreCase(cfoStr.trim());
                cfoOpt.ifPresent(a::setCfo);
            }
        }

        if (documentFormColumnIndex != null) {
            String docForm = getCellValueAsString(row.getCell(documentFormColumnIndex));
            if (docForm != null && !docForm.trim().isEmpty()) {
                a.setDocumentForm(docForm.trim());
            }
        }

        if (executorFullNameColumnIndex != null || executorEmailColumnIndex != null) {
            String fullName = executorFullNameColumnIndex != null ? getCellValueAsString(row.getCell(executorFullNameColumnIndex)) : null;
            String email = executorEmailColumnIndex != null ? getCellValueAsString(row.getCell(executorEmailColumnIndex)) : null;
            if (fullName != null && !fullName.trim().isEmpty()) {
                fullName = fullName.trim();
            } else {
                fullName = null;
            }
            if (email != null && !email.trim().isEmpty()) {
                email = email.trim();
            } else {
                email = null;
            }
            if (fullName != null || email != null) {
                User executor = findOrCreateUserByFullNameAndEmail(fullName, email);
                if (executor != null) {
                    a.setExecutor(executor);
                }
            }
        }

        if (assignmentDateColumnIndex != null) {
            LocalDateTime dt = parseDateCell(row.getCell(assignmentDateColumnIndex));
            if (dt != null) a.setAssignmentDate(dt);
        }
        if (plannedCompletionDateColumnIndex != null) {
            LocalDateTime dt = parseDateCell(row.getCell(plannedCompletionDateColumnIndex));
            if (dt != null) a.setPlannedCompletionDate(dt);
        }
        if (completionDateColumnIndex != null) {
            LocalDateTime dt = parseDateCell(row.getCell(completionDateColumnIndex));
            if (dt != null) a.setCompletionDate(dt);
        }

        if (completionResultColumnIndex != null) {
            String result = getCellValueAsString(row.getCell(completionResultColumnIndex));
            if (result != null && !result.trim().isEmpty()) {
                a.setCompletionResult(result.trim().length() > 1000 ? result.trim().substring(0, 1000) : result.trim());
            }
        }
        if (commentColumnIndex != null) {
            String comment = getCellValueAsString(row.getCell(commentColumnIndex));
            if (comment != null && !comment.trim().isEmpty()) {
                a.setCommentText(comment.trim().length() > 2000 ? comment.trim().substring(0, 2000) : comment.trim());
            }
        }
        if (isWaitingColumnIndex != null) {
            Boolean waiting = parseBooleanCell(row.getCell(isWaitingColumnIndex));
            if (waiting != null) a.setIsWaiting(waiting);
        }

        return a;
    }

    private boolean updateContractApprovalFields(ContractApproval existing, ContractApproval newData) {
        boolean updated = false;

        if (newData.getGuid() != null && !newData.getGuid().equals(existing.getGuid())) {
            existing.setGuid(newData.getGuid());
            updated = true;
        }
        if (newData.getCfo() != null && (existing.getCfo() == null || !newData.getCfo().getId().equals(existing.getCfoId()))) {
            existing.setCfo(newData.getCfo());
            updated = true;
        }
        if (newData.getDocumentForm() != null && !newData.getDocumentForm().equals(existing.getDocumentForm())) {
            existing.setDocumentForm(newData.getDocumentForm());
            updated = true;
        }
        if (newData.getExecutor() != null && (existing.getExecutor() == null || !newData.getExecutor().getId().equals(existing.getExecutorId()))) {
            existing.setExecutor(newData.getExecutor());
            updated = true;
        }
        if (newData.getAssignmentDate() != null && !newData.getAssignmentDate().equals(existing.getAssignmentDate())) {
            existing.setAssignmentDate(newData.getAssignmentDate());
            updated = true;
        }
        if (newData.getPlannedCompletionDate() != null && !newData.getPlannedCompletionDate().equals(existing.getPlannedCompletionDate())) {
            existing.setPlannedCompletionDate(newData.getPlannedCompletionDate());
            updated = true;
        }
        if (newData.getCompletionDate() != null && !newData.getCompletionDate().equals(existing.getCompletionDate())) {
            existing.setCompletionDate(newData.getCompletionDate());
            updated = true;
        }
        if (newData.getCompletionResult() != null && !newData.getCompletionResult().equals(existing.getCompletionResult())) {
            existing.setCompletionResult(newData.getCompletionResult());
            updated = true;
        }
        if (newData.getCommentText() != null && !newData.getCommentText().equals(existing.getCommentText())) {
            existing.setCommentText(newData.getCommentText());
            updated = true;
        }
        if (newData.getIsWaiting() != null && !newData.getIsWaiting().equals(existing.getIsWaiting())) {
            existing.setIsWaiting(newData.getIsWaiting());
            updated = true;
        }
        return updated;
    }

    /**
     * Находит пользователя по ФИО и email или создаёт нового.
     * Поиск: сначала по email (если задан), иначе по фамилии и имени (из полного имени).
     * Если не найден — создаёт пользователя, сохраняет и возвращает его, затем связь с согласованием устанавливается в parseContractApprovalRow.
     */
    private User findOrCreateUserByFullNameAndEmail(String fullName, String email) {
        if ((fullName == null || fullName.trim().isEmpty()) && (email == null || email.trim().isEmpty())) {
            return null;
        }
        try {
            String surname = null;
            String name = null;
            if (fullName != null && !fullName.trim().isEmpty()) {
                String[] parts = fullName.trim().split("\\s+", 2);
                if (parts.length >= 1) surname = parts[0].trim();
                if (parts.length >= 2) name = parts[1].trim();
            }

            User existingUser = null;
            if (email != null && !email.isEmpty()) {
                existingUser = userRepository.findByEmail(email).orElse(null);
            }
            if (existingUser == null && surname != null && name != null) {
                existingUser = userRepository.findBySurnameAndName(surname, name).orElse(null);
                if (existingUser == null) {
                    existingUser = userRepository.findBySurnameAndName(name, surname).orElse(null);
                }
            }

            if (existingUser != null) {
                boolean updated = false;
                if (email != null && !email.equals(existingUser.getEmail())) {
                    existingUser.setEmail(email);
                    updated = true;
                }
                if (surname != null && !surname.equals(existingUser.getSurname())) {
                    existingUser.setSurname(surname);
                    updated = true;
                }
                if (name != null && !name.equals(existingUser.getName())) {
                    existingUser.setName(name);
                    updated = true;
                }
                if (updated) {
                    userRepository.save(existingUser);
                }
                return existingUser;
            }

            String username = (email != null && email.contains("@"))
                    ? email.substring(0, email.indexOf('@')).replaceAll("[^a-zA-Z0-9_.-]", "_")
                    : (surname != null ? surname : "") + (name != null ? "_" + name : "");
            if (username.isEmpty() || username.equals("_")) {
                username = "user_" + System.currentTimeMillis();
            }
            if (userRepository.existsByUsername(username)) {
                username = username + "_" + System.currentTimeMillis();
            }

            User newUser = new User();
            newUser.setUsername(username);
            newUser.setPassword("");
            newUser.setSurname(surname);
            newUser.setName(name);
            if (email != null && !email.isEmpty()) {
                newUser.setEmail(email);
            }
            newUser = userRepository.save(newUser);
            logger.debug("Created user for contract approval executor: {} {}, email: {}", surname, name, email);
            return newUser;
        } catch (Exception e) {
            logger.warn("Error findOrCreateUserByFullNameAndEmail fullName='{}' email='{}': {}", fullName, email, e.getMessage());
            return null;
        }
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
