package com.uzproc.backend.service.purchase;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.uzproc.backend.dto.purchase.PurchaseDto;
import com.uzproc.backend.entity.purchase.Purchase;
import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.repository.purchase.PurchaseRepository;
import com.uzproc.backend.repository.supplier.SupplierRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Сервис для работы с конкурентным листом (КЛ) закупки.
 * Парсит Excel файл формата "Конкурентный лист", сохраняет JSON в поле purchases.competitive_sheet.
 * При парсинге ищет поставщиков по ИНН в таблице suppliers.
 */
@Service
public class CompetitiveSheetService {

    private static final Logger log = LoggerFactory.getLogger(CompetitiveSheetService.class);

    private final PurchaseRepository purchaseRepository;
    private final SupplierRepository supplierRepository;
    private final PurchaseService purchaseService;
    private final ObjectMapper objectMapper;

    public CompetitiveSheetService(PurchaseRepository purchaseRepository,
                                   SupplierRepository supplierRepository,
                                   PurchaseService purchaseService,
                                   ObjectMapper objectMapper) {
        this.purchaseRepository = purchaseRepository;
        this.supplierRepository = supplierRepository;
        this.purchaseService = purchaseService;
        this.objectMapper = objectMapper;
    }

    /**
     * Загрузить и распарсить конкурентный лист из Excel файла.
     * Сохраняет JSON в purchases.competitive_sheet.
     */
    @Transactional
    public PurchaseDto uploadCompetitiveSheet(Long purchaseId, MultipartFile file) throws Exception {
        Purchase purchase = purchaseRepository.findById(purchaseId)
                .orElseThrow(() -> new IllegalArgumentException("Закупка не найдена: " + purchaseId));

        Map<String, Object> sheet = parseCompetitiveSheet(file.getInputStream());

        // Обогащаем участников данными из БД по ИНН
        enrichParticipantsWithSuppliers(sheet);

        String json = objectMapper.writeValueAsString(sheet);
        purchase.setCompetitiveSheet(json);
        purchase.setCompetitiveSheetUploadedAt(LocalDateTime.now());
        purchaseRepository.save(purchase);

        return purchaseService.findById(purchaseId);
    }

    /**
     * Удалить конкурентный лист у закупки.
     */
    @Transactional
    public PurchaseDto deleteCompetitiveSheet(Long purchaseId) {
        Purchase purchase = purchaseRepository.findById(purchaseId)
                .orElseThrow(() -> new IllegalArgumentException("Закупка не найдена: " + purchaseId));
        purchase.setCompetitiveSheet(null);
        purchase.setCompetitiveSheetUploadedAt(null);
        purchaseRepository.save(purchase);
        return purchaseService.findById(purchaseId);
    }

    /**
     * Парсинг Excel файла конкурентного листа.
     *
     * Структура листа "Конкурентный лист":
     * Строка 0: заголовок "Конкурентный лист"
     * Строка 1: "Выбранный поставщик" (объединена над победителем)
     * Строка 2: № п/п | Наименование | Ед.изм. | Кол-во | [Поставщик1 ИНН ...] (4 ячейки) | ...
     * Строка 3: подзаголовки цен (Цена без НДС / с НДС / Стоимость без НДС / с НДС)
     * Строки 4+: позиции товаров (числовой номер в колонке 0)
     * Затем: "Дополнительные критерии:" и ниже — строки критериев
     */
    @SuppressWarnings("unchecked")
    private Map<String, Object> parseCompetitiveSheet(InputStream inputStream) throws Exception {
        try (Workbook workbook = new XSSFWorkbook(inputStream)) {
            Sheet sheet = workbook.getSheetAt(0);

            // --- Шаг 1: найти строку с заголовками поставщиков (строка 2, индекс 2) ---
            Row suppliersHeaderRow = sheet.getRow(2);
            Row pricesHeaderRow = sheet.getRow(3);

            if (suppliersHeaderRow == null) {
                throw new IllegalArgumentException("Неверный формат файла: не найдена строка заголовков поставщиков");
            }

            // Колонки 0-3: № п/п, Наименование, Ед.изм., Кол-во
            // Начиная с колонки 4 — группы поставщиков (по 4 колонки каждый)
            List<Map<String, Object>> participants = new ArrayList<>();
            int totalCols = suppliersHeaderRow.getLastCellNum();

            // Определить победителя из строки 1 (ячейка с "Выбранный поставщик" объединена)
            int winnerStartCol = findWinnerStartCol(sheet);

            for (int col = 4; col < totalCols; col += 4) {
                String supplierHeader = getCellStr(suppliersHeaderRow, col);
                if (supplierHeader == null || supplierHeader.isBlank()) continue;

                // Парсим "Название\nИНН: 123456789"
                String supplierName = supplierHeader;
                String inn = null;
                if (supplierHeader.contains("ИНН:")) {
                    String[] parts = supplierHeader.split("ИНН:");
                    supplierName = parts[0].trim();
                    inn = parts[1].trim().replaceAll("[^0-9]", "");
                } else if (supplierHeader.contains("\n")) {
                    String[] lines = supplierHeader.split("\n");
                    supplierName = lines[0].trim();
                    for (String line : lines) {
                        if (line.contains("ИНН")) {
                            inn = line.replaceAll("[^0-9]", "");
                            break;
                        }
                    }
                }

                Map<String, Object> participant = new LinkedHashMap<>();
                participant.put("name", supplierName);
                participant.put("inn", inn);
                participant.put("isWinner", col == winnerStartCol);
                participant.put("supplierId", null);
                participant.put("supplierName", null);
                participant.put("startCol", col); // временно, удалим после
                participant.put("prices", new ArrayList<>());
                participants.add(participant);
            }

            // --- Шаг 2: позиции товаров ---
            List<Map<String, Object>> items = new ArrayList<>();
            int additionalCriteriaRow = -1;

            for (int r = 4; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                Cell firstCell = row.getCell(0);
                if (firstCell == null) continue;

                // Проверяем, это строка с позицией (числовой номер) или начало доп.критериев
                if (firstCell.getCellType() == CellType.NUMERIC) {
                    int num = (int) firstCell.getNumericCellValue();
                    String name = getCellStr(row, 1);
                    String unit = getCellStr(row, 2);
                    BigDecimal qty = getCellNumeric(row, 3);

                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("num", num);
                    item.put("name", name);
                    item.put("unit", unit);
                    item.put("quantity", qty);
                    items.add(item);

                    // Цены по участникам
                    for (Map<String, Object> participant : participants) {
                        int startCol = (int) participant.get("startCol");
                        BigDecimal priceWithoutVat = getCellNumeric(row, startCol);
                        BigDecimal priceWithVat = getCellNumeric(row, startCol + 1);
                        BigDecimal totalWithoutVat = getCellNumeric(row, startCol + 2);
                        BigDecimal totalWithVat = getCellNumeric(row, startCol + 3);

                        Map<String, Object> price = new LinkedHashMap<>();
                        price.put("itemNum", num);
                        price.put("priceWithoutVat", priceWithoutVat);
                        price.put("priceWithVat", priceWithVat);
                        price.put("totalWithoutVat", totalWithoutVat);
                        price.put("totalWithVat", totalWithVat);

                        ((List<Map<String, Object>>) participant.get("prices")).add(price);
                    }
                } else {
                    String cellStr = getCellStr(row, 0);
                    if (cellStr != null && cellStr.contains("Дополнительные критерии")) {
                        additionalCriteriaRow = r;
                        break;
                    }
                }
            }

            // --- Шаг 3: дополнительные критерии ---
            if (additionalCriteriaRow >= 0) {
                parseCriteria(sheet, additionalCriteriaRow + 1, participants);
            }

            // Убираем временное поле startCol
            for (Map<String, Object> p : participants) {
                p.remove("startCol");
            }

            // --- Итоговый объект ---
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("items", items);
            result.put("participants", participants);
            result.put("uploadedAt", LocalDateTime.now().toString());
            return result;
        }
    }

    /**
     * Найти стартовую колонку победителя по строке 1 ("Выбранный поставщик").
     * Ищем объединённую ячейку с таким текстом.
     */
    private int findWinnerStartCol(Sheet sheet) {
        Row row1 = sheet.getRow(1);
        if (row1 == null) return -1;
        for (int col = 4; col < row1.getLastCellNum(); col++) {
            Cell cell = row1.getCell(col);
            if (cell != null && getCellStr(row1, col) != null
                    && getCellStr(row1, col).contains("Выбранный")) {
                return col;
            }
        }
        // Если нет явной пометки — ищем через merged regions
        for (org.apache.poi.ss.util.CellRangeAddress region : sheet.getMergedRegions()) {
            if (region.getFirstRow() == 1) {
                Row r = sheet.getRow(region.getFirstRow());
                if (r != null) {
                    Cell c = r.getCell(region.getFirstColumn());
                    if (c != null && c.getCellType() == CellType.STRING
                            && c.getStringCellValue().contains("Выбранный")) {
                        return region.getFirstColumn();
                    }
                }
            }
        }
        return -1;
    }

    /**
     * Парсинг дополнительных критериев (начиная с additionalCriteriaStartRow).
     * Каждая строка: лейбл в col 0, значения в col startCol участника.
     */
    @SuppressWarnings("unchecked")
    private void parseCriteria(Sheet sheet, int startRow, List<Map<String, Object>> participants) {
        // Ожидаемые метки строк
        String[] criteriaKeys = {
                "agreesWithContract",   // 1. Согласие с типовым договором
                "contractorStatus",     // 2. Статус контрагента
                "paymentTerms",         // 3. Условия оплаты
                "warrantyMonths",       // 4. Гарантия
                "deliveryDays",         // 5. Срок поставки
        };

        // Инициализируем criteria для каждого участника
        for (Map<String, Object> p : participants) {
            p.put("criteria", new LinkedHashMap<>());
            p.put("techAssessment", null);
            p.put("initiatorComment", null);
            p.put("procurementComment", null);
        }

        int criteriaIdx = 0;
        for (int r = startRow; r <= sheet.getLastRowNum(); r++) {
            Row row = sheet.getRow(r);
            if (row == null) continue;
            String label = getCellStr(row, 0);
            if (label == null || label.isBlank()) continue;

            String labelLower = label.toLowerCase();

            if (labelLower.contains("результат тех")) {
                // Строка "Результат тех.оценки Инициатора:"
                for (Map<String, Object> p : participants) {
                    int col = getParticipantCol(p);
                    if (col >= 0) {
                        p.put("techAssessment", getCellStr(row, col));
                    }
                }
            } else if (labelLower.contains("комментари") && labelLower.contains("инициатора")) {
                for (Map<String, Object> p : participants) {
                    int col = getParticipantCol(p);
                    if (col >= 0) {
                        p.put("initiatorComment", getCellStr(row, col));
                    }
                }
            } else if (labelLower.contains("комментари") && labelLower.contains("закупок")) {
                for (Map<String, Object> p : participants) {
                    int col = getParticipantCol(p);
                    if (col >= 0) {
                        p.put("procurementComment", getCellStr(row, col));
                    }
                }
            } else if (criteriaIdx < criteriaKeys.length) {
                // Нумерованные критерии (1-5)
                for (Map<String, Object> p : participants) {
                    int col = getParticipantCol(p);
                    if (col >= 0) {
                        ((Map<String, Object>) p.get("criteria")).put(criteriaKeys[criteriaIdx], getCellStr(row, col));
                    }
                }
                criteriaIdx++;
            }
        }
    }

    /** Получить начальную колонку участника (временно хранится в participants как startCol после парсинга) */
    private int getParticipantCol(Map<String, Object> participant) {
        Object col = participant.get("startCol");
        return col instanceof Integer ? (int) col : -1;
    }

    /** Обогащение участников данными поставщика из БД по ИНН */
    @SuppressWarnings("unchecked")
    private void enrichParticipantsWithSuppliers(Map<String, Object> sheet) {
        Object participantsObj = sheet.get("participants");
        if (!(participantsObj instanceof List)) return;

        List<Map<String, Object>> participants = (List<Map<String, Object>>) participantsObj;
        for (Map<String, Object> p : participants) {
            String inn = (String) p.get("inn");
            if (inn != null && !inn.isBlank()) {
                Optional<Supplier> supplier = supplierRepository.findFirstByInn(inn);
                supplier.ifPresent(s -> {
                    p.put("supplierId", s.getId());
                    p.put("supplierName", s.getName());
                });
            }
        }
    }

    // --- Вспомогательные методы ---

    private String getCellStr(Row row, int col) {
        if (row == null) return null;
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        return switch (cell.getCellType()) {
            case STRING -> {
                String v = cell.getStringCellValue().trim();
                yield v.isEmpty() ? null : v;
            }
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) yield cell.getLocalDateTimeCellValue().toString();
                double d = cell.getNumericCellValue();
                if (d == Math.floor(d) && !Double.isInfinite(d)) yield String.valueOf((long) d);
                yield String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield String.valueOf(cell.getStringCellValue()).trim();
                } catch (Exception e) {
                    try {
                        double d = cell.getNumericCellValue();
                        if (d == Math.floor(d)) yield String.valueOf((long) d);
                        yield String.valueOf(d);
                    } catch (Exception ex) {
                        yield null;
                    }
                }
            }
            default -> null;
        };
    }

    private BigDecimal getCellNumeric(Row row, int col) {
        if (row == null) return null;
        Cell cell = row.getCell(col);
        if (cell == null) return null;
        try {
            return switch (cell.getCellType()) {
                case NUMERIC -> BigDecimal.valueOf(cell.getNumericCellValue());
                case STRING -> {
                    String s = cell.getStringCellValue().trim().replace(",", ".").replace(" ", "");
                    yield s.isEmpty() ? null : new BigDecimal(s);
                }
                case FORMULA -> BigDecimal.valueOf(cell.getNumericCellValue());
                default -> null;
            };
        } catch (Exception e) {
            return null;
        }
    }
}
