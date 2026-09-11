package com.uzproc.backend.service.supplier;

import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.repository.supplier.SupplierRepository;
import com.uzproc.backend.service.excel.ImportBatchRunner;
import com.uzproc.backend.service.excel.dictionary.ImportDictionaries;
import com.uzproc.backend.service.excel.dictionary.ImportDictionaryService;
import com.uzproc.backend.service.excel.dictionary.SupplierDictionary;
import com.uzproc.backend.service.excel.dictionary.SupplierDictionary.SupplierRef;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * Загрузка поставщиков из Excel (папка frontend/upload/suppliers).
 * Колонки: Вид, КПП, ИНН, Код, Наименование.
 * Идентификация по полю Код: создание или обновление записи.
 */
@Service
public class SupplierExcelLoadService {

    private static final Logger logger = LoggerFactory.getLogger(SupplierExcelLoadService.class);

    private static final String TYPE_COLUMN = "Вид";
    private static final String KPP_COLUMN = "КПП";
    private static final String INN_COLUMN = "ИНН";
    private static final String CODE_COLUMN = "Код";
    private static final String NAME_COLUMN = "Наименование";

    /** Размер порции: каждая порция сохраняется в отдельной транзакции */
    private static final int BATCH_SIZE = 500;

    private final SupplierRepository supplierRepository;
    private final ImportDictionaryService dictionaryService;
    private final ImportBatchRunner batchRunner;
    private final DataFormatter dataFormatter = new DataFormatter();

    public SupplierExcelLoadService(SupplierRepository supplierRepository,
                                    ImportDictionaryService dictionaryService,
                                    ImportBatchRunner batchRunner) {
        this.supplierRepository = supplierRepository;
        this.dictionaryService = dictionaryService;
        this.batchRunner = batchRunner;
    }

    /** Строка файла с заполненным «Код»: номер строки (с 0) и разобранные поля. */
    private record SupplierFileRow(int rowNum, Supplier data) {
    }

    /**
     * Загружает поставщиков из Excel файла.
     * Каждая строка с заполненным «Код» — создание или обновление поставщика.
     * Без @Transactional на весь файл (она раздувала сессию Hibernate до O(n²) на тысячах строк):
     * строки сохраняются порциями по BATCH_SIZE в отдельных транзакциях ({@link ImportBatchRunner}),
     * а существующие поставщики сравниваются со справочником в памяти — из БД загружаются
     * только поставщики, у которых что-то изменилось.
     */
    public int loadSuppliersFromExcel(File excelFile) throws IOException {
        Workbook workbook;
        try (FileInputStream fis = new FileInputStream(excelFile)) {
            if (excelFile.getName().endsWith(".xlsx")) {
                workbook = new XSSFWorkbook(fis);
            } else {
                workbook = new HSSFWorkbook(fis);
            }
        }

        List<SupplierFileRow> rows = new ArrayList<>();
        try {
            Sheet sheet = workbook.getSheetAt(0);
            int headerRowIndex = -1;
            Map<String, Integer> columnIndexMap = null;

            for (int i = 0; i < Math.min(10, sheet.getLastRowNum() + 1); i++) {
                Row row = sheet.getRow(i);
                if (row == null) continue;
                Map<String, Integer> tempMap = buildColumnIndexMap(row);
                Integer codeIdx = findColumnIndex(tempMap, CODE_COLUMN);
                if (codeIdx != null) {
                    headerRowIndex = i;
                    columnIndexMap = tempMap;
                    break;
                }
            }

            if (columnIndexMap == null) {
                logger.warn("Suppliers: header row with column 'Код' not found in file {} (checked first 10 rows)", excelFile.getName());
                return 0;
            }

            Integer typeColumnIndex = findColumnIndex(columnIndexMap, TYPE_COLUMN);
            Integer kppColumnIndex = findColumnIndex(columnIndexMap, KPP_COLUMN);
            Integer innColumnIndex = findColumnIndex(columnIndexMap, INN_COLUMN);
            Integer codeColumnIndex = findColumnIndex(columnIndexMap, CODE_COLUMN);
            Integer nameColumnIndex = findColumnIndex(columnIndexMap, NAME_COLUMN);

            if (codeColumnIndex == null) {
                logger.warn("Suppliers: column 'Код' not found in file {}", excelFile.getName());
                return 0;
            }

            logger.info("Suppliers: file {} columns -> Вид={}, КПП={}, ИНН={}, Код={}, Наименование={}",
                excelFile.getName(), typeColumnIndex, kppColumnIndex, innColumnIndex, codeColumnIndex, nameColumnIndex);

            Iterator<Row> rowIterator = sheet.iterator();
            for (int i = 0; i <= headerRowIndex && rowIterator.hasNext(); i++) {
                rowIterator.next();
            }

            while (rowIterator.hasNext()) {
                Row row = rowIterator.next();
                if (isRowEmpty(row)) continue;
                try {
                    Supplier supplier = parseSupplierRow(row, typeColumnIndex, kppColumnIndex, innColumnIndex, codeColumnIndex, nameColumnIndex);
                    if (supplier == null || supplier.getCode() == null || supplier.getCode().trim().isEmpty()) {
                        continue;
                    }
                    supplier.setCode(supplier.getCode().trim());
                    rows.add(new SupplierFileRow(row.getRowNum(), supplier));
                } catch (Exception e) {
                    logger.warn("Suppliers: error parsing row {} in file {}: {}", row.getRowNum() + 1, excelFile.getName(), e.getMessage());
                }
            }
        } finally {
            workbook.close();
        }

        ImportDictionaries dictionaries = dictionaryService.load(EnumSet.of(ImportDictionaryService.Kind.SUPPLIERS));
        int loadedCount = 0;
        for (int from = 0; from < rows.size(); from += BATCH_SIZE) {
            List<SupplierFileRow> batch = rows.subList(from, Math.min(from + BATCH_SIZE, rows.size()));
            loadedCount += batchRunner.save("Suppliers", batch, row -> saveSupplierRow(row.data(), dictionaries.suppliers()),
                    dictionaries, row -> String.valueOf(row.rowNum() + 1));
        }

        logger.info("Suppliers: loaded {} records from file {}", loadedCount, excelFile.getName());
        return loadedCount;
    }

    /**
     * Создаёт или обновляет поставщика по коду внутри транзакции порции. Существующий сравнивается
     * со справочником по тем же правилам, что в {@link #updateSupplierFields}; из БД загружается
     * только поставщик, у которого что-то изменилось.
     *
     * @return true — поставщик создан или обновлён
     */
    private boolean saveSupplierRow(Supplier data, SupplierDictionary suppliers) {
        String code = data.getCode();
        SupplierRef existing = suppliers.byCode(code);
        if (existing == null) {
            // Нет в справочнике — проверяем БД (поставщика мог создать другой загрузчик)
            existing = supplierRepository.findByCode(code).map(SupplierRef::of).orElse(null);
            if (existing != null) suppliers.putExisting(existing);
        }
        if (existing == null) {
            Supplier created = supplierRepository.save(data);
            suppliers.stage(SupplierRef.of(created));
            return true;
        }

        // Сначала сравниваем с копией из справочника — без запроса к БД
        Supplier snapshot = new Supplier(code);
        snapshot.setType(existing.type());
        snapshot.setKpp(existing.kpp());
        snapshot.setInn(existing.inn());
        snapshot.setName(existing.name());
        if (!updateSupplierFields(snapshot, data)) {
            return false;
        }

        Supplier entity = supplierRepository.findById(existing.id()).orElseThrow();
        if (!updateSupplierFields(entity, data)) {
            return false;
        }
        supplierRepository.save(entity);
        suppliers.stage(SupplierRef.of(entity));
        return true;
    }

    private Supplier parseSupplierRow(Row row, Integer typeColumnIndex, Integer kppColumnIndex, Integer innColumnIndex, Integer codeColumnIndex, Integer nameColumnIndex) {
        Supplier supplier = new Supplier();

        if (codeColumnIndex != null) {
            Cell cell = row.getCell(codeColumnIndex);
            String code = getCellValueAsString(cell);
            if (code != null && !code.trim().isEmpty()) {
                supplier.setCode(code.trim());
            }
        }

        if (typeColumnIndex != null) {
            Cell cell = row.getCell(typeColumnIndex);
            String value = getCellValueAsString(cell);
            if (value != null && !value.trim().isEmpty()) {
                supplier.setType(value.trim());
            }
        }

        if (kppColumnIndex != null) {
            Cell cell = row.getCell(kppColumnIndex);
            String value = getCellValueAsString(cell);
            if (value != null && !value.trim().isEmpty()) {
                supplier.setKpp(value.trim());
            }
        }

        if (innColumnIndex != null) {
            Cell cell = row.getCell(innColumnIndex);
            String value = getCellValueAsString(cell);
            if (value != null && !value.trim().isEmpty()) {
                supplier.setInn(value.trim());
            }
        }

        if (nameColumnIndex != null) {
            Cell cell = row.getCell(nameColumnIndex);
            String value = getCellValueAsString(cell);
            if (value != null && !value.trim().isEmpty()) {
                supplier.setName(value.trim());
            }
        }

        return supplier;
    }

    private boolean updateSupplierFields(Supplier existing, Supplier newData) {
        boolean updated = false;

        if (newData.getType() != null && !newData.getType().trim().isEmpty()) {
            if (existing.getType() == null || !existing.getType().equals(newData.getType().trim())) {
                existing.setType(newData.getType().trim());
                updated = true;
            }
        }

        if (newData.getKpp() != null) {
            String newKpp = newData.getKpp().trim();
            if (existing.getKpp() == null || !existing.getKpp().equals(newKpp)) {
                existing.setKpp(newKpp);
                updated = true;
            }
        }

        if (newData.getInn() != null) {
            String newInn = newData.getInn().trim();
            if (existing.getInn() == null || !existing.getInn().equals(newInn)) {
                existing.setInn(newInn);
                updated = true;
            }
        }

        if (newData.getName() != null && !newData.getName().trim().isEmpty()) {
            if (existing.getName() == null || !existing.getName().equals(newData.getName().trim())) {
                existing.setName(newData.getName().trim());
                updated = true;
            }
        }

        return updated;
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
