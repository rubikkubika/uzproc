package com.uzproc.backend.service.payment;

import com.uzproc.backend.entity.Cfo;
import com.uzproc.backend.entity.payment.Payment;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.repository.CfoRepository;
import com.uzproc.backend.repository.payment.PaymentRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
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
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class PaymentExcelLoadService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentExcelLoadService.class);

    private static final String AMOUNT_COLUMN = "Сумма";
    private static final String CFO_COLUMN = "ЦФО";
    private static final String COMMENT_COLUMN = "Комментарий (Основание)";
    private static final String COMMENT_COLUMN_ALT = "Основание";
    private static final String COMMENT_COLUMN_ALT2 = "Комментарий(Основание)";

    /** Паттерн для извлечения номера заявки из комментария: "Создана по документу ... N 1898 - ..." или "N1898" */
    private static final Pattern REQUEST_NUMBER_IN_COMMENT = Pattern.compile("N\\s*(\\d+)");

    private final PaymentRepository paymentRepository;
    private final CfoRepository cfoRepository;
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final DataFormatter dataFormatter = new DataFormatter();

    public PaymentExcelLoadService(PaymentRepository paymentRepository, CfoRepository cfoRepository,
                                  PurchaseRequestRepository purchaseRequestRepository) {
        this.paymentRepository = paymentRepository;
        this.cfoRepository = cfoRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
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

            Integer amountColumnIndex = findColumnIndex(columnIndexMap, AMOUNT_COLUMN);
            Integer cfoColumnIndex = findColumnIndex(columnIndexMap, CFO_COLUMN);
            Integer commentColumnIndex = findColumnIndex(columnIndexMap, COMMENT_COLUMN);
            if (commentColumnIndex == null) {
                commentColumnIndex = findColumnIndex(columnIndexMap, COMMENT_COLUMN_ALT);
            }
            if (commentColumnIndex == null) {
                commentColumnIndex = findColumnIndex(columnIndexMap, COMMENT_COLUMN_ALT2);
            }
            logger.info("Payments: file {} columns -> Сумма={}, ЦФО={}, Комментарий(Основание)={}", excelFile.getName(), amountColumnIndex, cfoColumnIndex, commentColumnIndex);

            if (amountColumnIndex == null && cfoColumnIndex == null) {
                logger.warn("Payments: neither 'Сумма' nor 'ЦФО' column found in file {}", excelFile.getName());
                return 0;
            }

            Iterator<Row> rowIterator = sheet.iterator();
            for (int i = 0; i <= headerRowIndex && rowIterator.hasNext(); i++) {
                rowIterator.next();
            }

            int loadedCount = 0;
            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                if (isRowEmpty(row)) continue;
                try {
                    Payment payment = parsePaymentRow(row, amountColumnIndex, cfoColumnIndex, commentColumnIndex);
                    if (payment != null && (payment.getAmount() != null || payment.getCfo() != null || (payment.getComment() != null && !payment.getComment().trim().isEmpty()))) {
                        Payment toSave = payment;
                        if (payment.getComment() != null && !payment.getComment().trim().isEmpty()) {
                            Optional<Payment> existingOpt = paymentRepository.findFirstByComment(payment.getComment().trim());
                            if (existingOpt.isPresent()) {
                                Payment existing = existingOpt.get();
                                existing.setAmount(payment.getAmount());
                                existing.setCfo(payment.getCfo());
                                existing.setComment(payment.getComment());
                                existing.setPurchaseRequest(payment.getPurchaseRequest());
                                toSave = existing;
                            }
                        }
                        paymentRepository.save(toSave);
                        loadedCount++;
                    }
                } catch (Exception e) {
                    logger.warn("Error processing payment row {}: {}", row.getRowNum() + 1, e.getMessage());
                }
            }

            logger.info("Loaded {} payments from file {}", loadedCount, excelFile.getName());
            return loadedCount;
        } finally {
            workbook.close();
        }
    }

    private Payment parsePaymentRow(Row row, Integer amountColumnIndex, Integer cfoColumnIndex, Integer commentColumnIndex) {
        Payment payment = new Payment();

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

        return payment;
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
