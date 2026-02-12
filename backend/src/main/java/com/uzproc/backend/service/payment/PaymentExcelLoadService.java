package com.uzproc.backend.service.payment;

import com.uzproc.backend.entity.Cfo;
import com.uzproc.backend.entity.payment.Payment;
import com.uzproc.backend.entity.payment.PaymentRequestStatus;
import com.uzproc.backend.entity.payment.PaymentStatus;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.CfoRepository;
import com.uzproc.backend.repository.payment.PaymentRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
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
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Iterator;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PaymentExcelLoadService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentExcelLoadService.class);

    private static final String NUMBER_COLUMN = "Номер";
    private static final String AMOUNT_COLUMN = "Сумма";
    private static final String CFO_COLUMN = "ЦФО";
    private static final String COMMENT_COLUMN = "Комментарий (Основание)";
    private static final String COMMENT_COLUMN_ALT = "Основание";
    private static final String COMMENT_COLUMN_ALT2 = "Комментарий(Основание)";
    private static final String PAYMENT_STATUS_COLUMN = "Статус оплаты";
    private static final String REQUEST_STATUS_COLUMN = "Статус заявки";
    private static final String PLANNED_EXPENSE_DATE_COLUMN = "Дата расхода (план)";
    private static final String PAYMENT_DATE_COLUMN = "Дата оплаты";
    private static final String EXECUTOR_COLUMN = "Исполнитель";
    private static final String RESPONSIBLE_COLUMN = "Ответственный";

    private static final DateTimeFormatter[] DATE_PARSERS = {
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("d.M.yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ISO_LOCAL_DATE
    };

    /** Паттерн для извлечения номера заявки из комментария: "Создана по документу ... N 1898 - ..." или "N1898" */
    private static final Pattern REQUEST_NUMBER_IN_COMMENT = Pattern.compile("N\\s*(\\d+)");

    private final PaymentRepository paymentRepository;
    private final CfoRepository cfoRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final UserRepository userRepository;
    private final DataFormatter dataFormatter = new DataFormatter();

    public PaymentExcelLoadService(PaymentRepository paymentRepository, CfoRepository cfoRepository,
                                  PurchaseRequestRepository purchaseRequestRepository,
                                  UserRepository userRepository) {
        this.paymentRepository = paymentRepository;
        this.cfoRepository = cfoRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.userRepository = userRepository;
    }

    /**
     * Загружает оплаты из Excel файла (папка payments).
     * Колонки: Сумма, ЦФО, Комментарий (Основание).
     * Каждая строка — новая запись (связь ЦФО по имени, при отсутствии — создаётся).
     */
    @Transactional
    public int loadPaymentsFromExcel(File excelFile) throws IOException {
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

            for (int i = 0; i < Math.min(10, sheet.getLastRowNum() + 1); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                Map<String, Integer> tempMap = buildColumnIndexMap(row);
                Integer amountIdx = findColumnIndex(tempMap, AMOUNT_COLUMN);
                Integer cfoIdx = findColumnIndex(tempMap, CFO_COLUMN);
                if (amountIdx != null || cfoIdx != null) {
                    headerRow = row;
                    headerRowIndex = i;
                    columnIndexMap = tempMap;
                    break;
                }
            }

            if (columnIndexMap == null) {
                logger.warn("Payments: header row not found in file {} (checked first 10 rows)", excelFile.getName());
                return 0;
            }

            Integer numberColumnIndex = findColumnIndex(columnIndexMap, NUMBER_COLUMN);
            Integer amountColumnIndex = findColumnIndex(columnIndexMap, AMOUNT_COLUMN);
            Integer cfoColumnIndex = findColumnIndex(columnIndexMap, CFO_COLUMN);
            Integer commentColumnIndex = findColumnIndex(columnIndexMap, COMMENT_COLUMN);
            if (commentColumnIndex == null) {
                commentColumnIndex = findColumnIndex(columnIndexMap, COMMENT_COLUMN_ALT);
            }
            if (commentColumnIndex == null) {
                commentColumnIndex = findColumnIndex(columnIndexMap, COMMENT_COLUMN_ALT2);
            }
            Integer paymentStatusColumnIndex = findColumnIndex(columnIndexMap, PAYMENT_STATUS_COLUMN);
            Integer requestStatusColumnIndex = findColumnIndex(columnIndexMap, REQUEST_STATUS_COLUMN);
            Integer plannedExpenseDateColumnIndex = findColumnIndex(columnIndexMap, PLANNED_EXPENSE_DATE_COLUMN);
            Integer paymentDateColumnIndex = findColumnIndex(columnIndexMap, PAYMENT_DATE_COLUMN);
            Integer executorColumnIndex = findColumnIndex(columnIndexMap, EXECUTOR_COLUMN);
            Integer responsibleColumnIndex = findColumnIndex(columnIndexMap, RESPONSIBLE_COLUMN);
            if (numberColumnIndex == null) {
                logger.warn("Payments: column 'Номер' not found in file {}; headers checked: {}", excelFile.getName(), columnIndexMap.keySet());
            }
            logger.info("Payments: file {} columns -> Номер={}, Сумма={}, ЦФО={}, Комментарий={}, Статус оплаты={}, Статус заявки={}, Дата расхода (план)={}, Дата оплаты={}, Исполнитель={}, Ответственный={}", excelFile.getName(), numberColumnIndex, amountColumnIndex, cfoColumnIndex, commentColumnIndex, paymentStatusColumnIndex, requestStatusColumnIndex, plannedExpenseDateColumnIndex, paymentDateColumnIndex, executorColumnIndex, responsibleColumnIndex);

            if (amountColumnIndex == null && cfoColumnIndex == null) {
                logger.warn("Payments: neither 'Сумма' nor 'ЦФО' column found in file {}", excelFile.getName());
                return 0;
            }

            Iterator<Row> rowIterator = sheet.iterator();
            for (int i = 0; i <= headerRowIndex && rowIterator.hasNext(); i++) {
                rowIterator.next();
            }

            int loadedCount = 0;
            int skippedNoMainId = 0;
            int skippedDuplicateMainId = 0;
            Set<String> mainIdsSeenInFile = new HashSet<>();
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                if (isRowEmpty(row)) continue;
                try {
                    Payment payment = parsePaymentRow(row, numberColumnIndex, amountColumnIndex, cfoColumnIndex, commentColumnIndex, paymentStatusColumnIndex, requestStatusColumnIndex, plannedExpenseDateColumnIndex, paymentDateColumnIndex, executorColumnIndex, responsibleColumnIndex);
                    // Загружаем только строки с основным номером (Номер); строки без номера — мусор, пропускаем
                    if (payment == null || payment.getMainId() == null || payment.getMainId().trim().isEmpty()) {
                        skippedNoMainId++;
                        if (payment != null && (payment.getAmount() != null || payment.getCfo() != null || (payment.getComment() != null && !payment.getComment().trim().isEmpty()))) {
                            logger.debug("Payments: skipping row {} (no mainId): amount={}, cfo={}", row.getRowNum() + 1, payment.getAmount(), payment.getCfo() != null ? payment.getCfo().getName() : null);
                        }
                        continue;
                    }
                    String mainIdTrimmed = payment.getMainId().trim();
                    // Повторений mainId в файле быть не должно — при повторном номере пропускаем строку
                    if (mainIdsSeenInFile.contains(mainIdTrimmed)) {
                        skippedDuplicateMainId++;
                        logger.warn("Payments: duplicate mainId in file at row {} (mainId={}), skipping", row.getRowNum() + 1, mainIdTrimmed);
                        continue;
                    }
                    mainIdsSeenInFile.add(mainIdTrimmed);
                    // Сопоставление только по mainId (номер оплаты). Не ищем по комментарию:
                    // к одной заявке может быть несколько оплат с одинаковым текстом в комментарии.
                    Optional<Payment> existingOpt = paymentRepository.findFirstByMainId(mainIdTrimmed);
                    if (existingOpt.isPresent()) {
                        Payment existing = existingOpt.get();
                        boolean updated = updatePaymentFields(existing, payment);
                        if (updated) {
                            paymentRepository.save(existing);
                            loadedCount++;
                        }
                    } else {
                        paymentRepository.save(payment);
                        loadedCount++;
                    }
                } catch (Exception e) {
                    logger.warn("Error processing payment row {}: {}", row.getRowNum() + 1, e.getMessage());
                }
            }

            logger.info("Loaded {} payments from file {} (skipped without mainId: {}, skipped duplicate mainId in file: {})",
                    loadedCount, excelFile.getName(), skippedNoMainId, skippedDuplicateMainId);
            return loadedCount;
        } finally {
            workbook.close();
        }
    }

    private Payment parsePaymentRow(Row row, Integer numberColumnIndex, Integer amountColumnIndex, Integer cfoColumnIndex, Integer commentColumnIndex,
                                    Integer paymentStatusColumnIndex, Integer requestStatusColumnIndex,
                                    Integer plannedExpenseDateColumnIndex, Integer paymentDateColumnIndex,
                                    Integer executorColumnIndex, Integer responsibleColumnIndex) {
        Payment payment = new Payment();

        if (numberColumnIndex != null) {
            Cell cell = row.getCell(numberColumnIndex);
            String value = getCellValueAsString(cell);
            if (value != null && !value.trim().isEmpty()) {
                String trimmed = value.trim();
                // Если в ячейке число с дробной частью (например 12345.0 из Excel), оставляем целую часть для mainId
                if (trimmed.contains(".") && trimmed.matches("\\d+\\.0+")) {
                    trimmed = trimmed.replaceAll("\\.0+$", "");
                }
                payment.setMainId(trimmed);
            }
        }

        if (amountColumnIndex != null) {
            Cell cell = row.getCell(amountColumnIndex);
            BigDecimal amount = parseBigDecimalCell(cell);
            if (amount != null) {
                payment.setAmount(amount);
            }
        }

        if (cfoColumnIndex != null) {
            Cell cell = row.getCell(cfoColumnIndex);
            String cfoStr = getCellValueAsString(cell);
            if (cfoStr != null && !cfoStr.trim().isEmpty()) {
                String trimmed = cfoStr.trim();
                Optional<Cfo> cfoOpt = cfoRepository.findByNameIgnoreCase(trimmed);
                Cfo cfo = cfoOpt.orElseGet(() -> {
                    Cfo newCfo = new Cfo(trimmed);
                    return cfoRepository.save(newCfo);
                });
                payment.setCfo(cfo);
            }
        }

        if (commentColumnIndex != null) {
            Cell cell = row.getCell(commentColumnIndex);
            String comment = getCellValueAsString(cell);
            if (comment != null && !comment.trim().isEmpty()) {
                String trimmed = comment.trim();
                payment.setComment(trimmed);
                linkPurchaseRequestFromComment(payment, trimmed);
            }
        }

        if (paymentStatusColumnIndex != null) {
            Cell cell = row.getCell(paymentStatusColumnIndex);
            String value = getCellValueAsString(cell);
            if (value != null && !value.trim().isEmpty()) {
                PaymentStatus status = PaymentStatus.fromDisplayName(value.trim());
                if (status != null) {
                    payment.setPaymentStatus(status);
                } else {
                    logger.debug("Payment row {}: unknown 'Статус оплаты' value '{}', expected: К оплате, Оплата возвращена, Оплачена", row.getRowNum() + 1, value.trim());
                }
            }
        }

        if (requestStatusColumnIndex != null) {
            Cell cell = row.getCell(requestStatusColumnIndex);
            String value = getCellValueAsString(cell);
            if (value != null && !value.trim().isEmpty()) {
                PaymentRequestStatus status = PaymentRequestStatus.fromDisplayName(value.trim());
                if (status != null) {
                    payment.setRequestStatus(status);
                } else {
                    logger.debug("Payment row {}: unknown 'Статус заявки' value '{}', expected: На согласовании, Отклонен, Утвержден, Черновик", row.getRowNum() + 1, value.trim());
                }
            }
        }

        if (plannedExpenseDateColumnIndex != null) {
            Cell cell = row.getCell(plannedExpenseDateColumnIndex);
            LocalDate date = parseDateCell(cell);
            if (date != null) {
                payment.setPlannedExpenseDate(date);
            }
        }

        if (paymentDateColumnIndex != null) {
            Cell cell = row.getCell(paymentDateColumnIndex);
            LocalDate date = parseDateCell(cell);
            if (date != null) {
                payment.setPaymentDate(date);
            }
        }

        if (executorColumnIndex != null) {
            Cell cell = row.getCell(executorColumnIndex);
            String value = getCellValueAsString(cell);
            if (value != null && !value.trim().isEmpty()) {
                User executor = findOrCreateUser(value.trim());
                if (executor != null) {
                    payment.setExecutor(executor);
                }
            }
        }

        if (responsibleColumnIndex != null) {
            Cell cell = row.getCell(responsibleColumnIndex);
            String value = getCellValueAsString(cell);
            if (value != null && !value.trim().isEmpty()) {
                User responsible = findOrCreateUser(value.trim());
                if (responsible != null) {
                    payment.setResponsible(responsible);
                }
            }
        }

        return payment;
    }

    /**
     * Обновляет поля существующей оплаты только если они отличаются (как у заявок/закупок).
     */
    private boolean updatePaymentFields(Payment existing, Payment newData) {
        boolean updated = false;

        if (newData.getMainId() != null && !newData.getMainId().trim().isEmpty()) {
            if (existing.getMainId() == null || !existing.getMainId().equals(newData.getMainId().trim())) {
                existing.setMainId(newData.getMainId().trim());
                updated = true;
                logger.debug("Updated mainId for payment {}: {}", existing.getId(), newData.getMainId());
            }
        }

        if (newData.getAmount() != null) {
            if (existing.getAmount() == null || existing.getAmount().compareTo(newData.getAmount()) != 0) {
                existing.setAmount(newData.getAmount());
                updated = true;
                logger.debug("Updated amount for payment {}: {}", existing.getId(), newData.getAmount());
            }
        }

        if (newData.getCfo() != null) {
            if (existing.getCfo() == null || !newData.getCfo().getId().equals(existing.getCfo().getId())) {
                existing.setCfo(newData.getCfo());
                updated = true;
                logger.debug("Updated cfo for payment {}: {}", existing.getId(), newData.getCfo().getName());
            }
        }

        if (newData.getComment() != null) {
            String newComment = newData.getComment().trim();
            if (!newComment.isEmpty() && (existing.getComment() == null || !existing.getComment().equals(newComment))) {
                existing.setComment(newData.getComment());
                updated = true;
                logger.debug("Updated comment for payment {}", existing.getId());
            }
        }

        if (newData.getPurchaseRequest() != null) {
            Long newPrId = newData.getPurchaseRequest().getIdPurchaseRequest();
            if (existing.getPurchaseRequest() == null || !existing.getPurchaseRequest().getIdPurchaseRequest().equals(newPrId)) {
                existing.setPurchaseRequest(newData.getPurchaseRequest());
                updated = true;
                logger.debug("Updated purchaseRequest for payment {}: {}", existing.getId(), newPrId);
            }
        }

        if (newData.getPaymentStatus() != null) {
            if (existing.getPaymentStatus() != newData.getPaymentStatus()) {
                existing.setPaymentStatus(newData.getPaymentStatus());
                updated = true;
                logger.debug("Updated paymentStatus for payment {}: {}", existing.getId(), newData.getPaymentStatus());
            }
        }

        if (newData.getRequestStatus() != null) {
            if (existing.getRequestStatus() != newData.getRequestStatus()) {
                existing.setRequestStatus(newData.getRequestStatus());
                updated = true;
                logger.debug("Updated requestStatus for payment {}: {}", existing.getId(), newData.getRequestStatus());
            }
        }

        if (newData.getPlannedExpenseDate() != null) {
            if (existing.getPlannedExpenseDate() == null || !existing.getPlannedExpenseDate().equals(newData.getPlannedExpenseDate())) {
                existing.setPlannedExpenseDate(newData.getPlannedExpenseDate());
                updated = true;
                logger.debug("Updated plannedExpenseDate for payment {}: {}", existing.getId(), newData.getPlannedExpenseDate());
            }
        }

        if (newData.getPaymentDate() != null) {
            if (existing.getPaymentDate() == null || !existing.getPaymentDate().equals(newData.getPaymentDate())) {
                existing.setPaymentDate(newData.getPaymentDate());
                updated = true;
                logger.debug("Updated paymentDate for payment {}: {}", existing.getId(), newData.getPaymentDate());
            }
        }

        if (newData.getExecutor() != null) {
            if (existing.getExecutor() == null || !newData.getExecutor().getId().equals(existing.getExecutor().getId())) {
                existing.setExecutor(newData.getExecutor());
                updated = true;
                logger.debug("Updated executor for payment {}: {}", existing.getId(), newData.getExecutor().getId());
            }
        }

        if (newData.getResponsible() != null) {
            if (existing.getResponsible() == null || !newData.getResponsible().getId().equals(existing.getResponsible().getId())) {
                existing.setResponsible(newData.getResponsible());
                updated = true;
                logger.debug("Updated responsible for payment {}: {}", existing.getId(), newData.getResponsible().getId());
            }
        }

        return updated;
    }

    /**
     * Парсит строку формата "Фамилия Имя (Отдел, Должность)" или "Фамилия Имя",
     * находит пользователя по surname и name или создаёт нового (как в EntityExcelLoadService.parseAndSaveUser).
     *
     * @return User найденный или созданный пользователь, или null при ошибке парсинга
     */
    private User findOrCreateUser(String executorValue) {
        try {
            String surname = null;
            String name = null;
            String department = null;
            String position = null;

            int openBracketIndex = executorValue.indexOf('(');
            int closeBracketIndex = executorValue.indexOf(')');

            if (openBracketIndex > 0 && closeBracketIndex > openBracketIndex) {
                String namePart = executorValue.substring(0, openBracketIndex).trim();
                String departmentPart = executorValue.substring(openBracketIndex + 1, closeBracketIndex).trim();
                String[] nameParts = namePart.split("\\s+", 2);
                if (nameParts.length >= 1) surname = nameParts[0].trim();
                if (nameParts.length >= 2) name = nameParts[1].trim();
                String[] deptParts = departmentPart.split(",", 2);
                if (deptParts.length >= 1) department = deptParts[0].trim();
                if (deptParts.length >= 2) position = deptParts[1].trim();
            } else {
                String[] nameParts = executorValue.split("\\s+", 2);
                if (nameParts.length >= 1) surname = nameParts[0].trim();
                if (nameParts.length >= 2) name = nameParts[1].trim();
            }

            String username = (surname != null ? surname : "") + (name != null ? "_" + name : "");
            if (username.isEmpty() || username.equals("_")) {
                username = "user_" + System.currentTimeMillis();
            }

            User existingUser = null;
            if (surname != null && name != null) {
                existingUser = userRepository.findBySurnameAndName(surname, name).orElse(null);
                if (existingUser == null) {
                    existingUser = userRepository.findByUsername(username).orElse(null);
                }
            }

            if (existingUser != null) {
                boolean updated = false;
                if (department != null && !department.equals(existingUser.getDepartment())) {
                    existingUser.setDepartment(department);
                    updated = true;
                }
                if (position != null && !position.equals(existingUser.getPosition())) {
                    existingUser.setPosition(position);
                    updated = true;
                }
                if (updated) {
                    userRepository.save(existingUser);
                }
                return existingUser;
            }

            User newUser = new User();
            newUser.setUsername(username);
            newUser.setPassword("");
            newUser.setSurname(surname);
            newUser.setName(name);
            newUser.setDepartment(department);
            newUser.setPosition(position);
            newUser = userRepository.save(newUser);
            logger.debug("Created user for executor: {} {}", surname, name);
            return newUser;
        } catch (Exception e) {
            logger.warn("Error parsing executor '{}': {}", executorValue, e.getMessage());
            return null;
        }
    }

    /**
     * Парсит ячейку как дату: Excel DATE или строка в формате dd.MM.yyyy / yyyy-MM-dd.
     */
    private LocalDate parseDateCell(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                Date d = cell.getDateCellValue();
                if (d == null) return null;
                return Instant.ofEpochMilli(d.getTime()).atZone(ZoneId.systemDefault()).toLocalDate();
            }
            String raw = getCellValueAsString(cell);
            if (raw == null || raw.trim().isEmpty() || "-".equals(raw.trim()) || "—".equals(raw.trim())) {
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

    /**
     * Из комментария вида "Создана по документу 1С:Документооборот: Спецификация 4 по M - IT N 1898 - Термопринтеры"
     * извлекает номер заявки (1898) и связывает оплату с заявкой на закупку по innerId.
     */
    private void linkPurchaseRequestFromComment(Payment payment, String comment) {
        if (comment == null || comment.isEmpty()) return;
        Matcher matcher = REQUEST_NUMBER_IN_COMMENT.matcher(comment);
        String lastMatch = null;
        while (matcher.find()) {
            lastMatch = matcher.group(1);
        }
        if (lastMatch == null || lastMatch.isEmpty()) return;
        String innerId = lastMatch.trim();
        Optional<PurchaseRequest> prOpt = purchaseRequestRepository.findByInnerId(innerId);
        if (prOpt.isEmpty()) {
            try {
                Long idPr = Long.parseLong(innerId);
                prOpt = purchaseRequestRepository.findByIdPurchaseRequest(idPr);
            } catch (NumberFormatException ignored) { }
        }
        if (prOpt.isPresent()) {
            payment.setPurchaseRequest(prOpt.get());
            logger.info("Payment linked to purchase request innerId={}", innerId);
        } else {
            logger.info("Payment: no purchase request found for innerId='{}' (comment excerpt: '{}')", innerId, comment.length() > 80 ? comment.substring(0, 80) + "..." : comment);
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

    private BigDecimal parseBigDecimalCell(Cell cell) {
        if (cell == null) return null;
        try {
            if (cell.getCellType() == CellType.NUMERIC && !DateUtil.isCellDateFormatted(cell)) {
                double v = cell.getNumericCellValue();
                if (!Double.isNaN(v) && !Double.isInfinite(v)) {
                    return BigDecimal.valueOf(v);
                }
            }
            String raw = dataFormatter.formatCellValue(cell);
            if (raw == null || raw.trim().isEmpty() || "-".equals(raw.trim()) || "—".equals(raw.trim())) {
                return null;
            }
            String cleaned = raw.replaceAll("[^0-9.,]", "").replace(",", ".");
            if (cleaned.isEmpty()) return null;
            return new BigDecimal(cleaned);
        } catch (Exception e) {
            logger.debug("Cannot parse BigDecimal from cell: {}", getCellValueAsString(cell));
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
