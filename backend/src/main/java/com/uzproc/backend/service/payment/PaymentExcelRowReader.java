package com.uzproc.backend.service.payment;

import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.openxml4j.exceptions.OpenXML4JException;
import org.apache.poi.openxml4j.opc.OPCPackage;
import org.apache.poi.openxml4j.opc.PackageAccess;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.DateUtil;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellReference;
import org.apache.poi.util.XMLHelper;
import org.apache.poi.xssf.eventusermodel.ReadOnlySharedStringsTable;
import org.apache.poi.xssf.eventusermodel.XSSFReader;
import org.apache.poi.xssf.eventusermodel.XSSFSheetXMLHandler;
import org.apache.poi.xssf.model.StylesTable;
import org.apache.poi.xssf.usermodel.XSSFComment;
import org.xml.sax.InputSource;
import org.xml.sax.SAXException;
import org.xml.sax.XMLReader;

import javax.xml.parsers.ParserConfigurationException;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * Построчное чтение первого листа файла оплат.
 * .xlsx читается потоково (SAX через XSSFReader): лист не загружается в память целиком,
 * поэтому размер XML листа не упирается в лимит POI (~100 МБ на массив). .xls читается через HSSFWorkbook.
 * Значения ячеек отдаются в «сыром» виде: числа — без форматирования (1234567.89),
 * даты — ISO (yyyy-MM-dd), строки — как есть.
 */
final class PaymentExcelRowReader {

    /** Получатель строк: номер строки (с 0) и значения ячеек по индексу колонки (с 0). */
    @FunctionalInterface
    interface RowConsumer {
        void accept(int rowNum, Map<Integer, String> cells);
    }

    private PaymentExcelRowReader() {
    }

    static void read(File excelFile, RowConsumer consumer) throws IOException {
        if (excelFile.getName().toLowerCase().endsWith(".xlsx")) {
            readXlsx(excelFile, consumer);
        } else {
            readXls(excelFile, consumer);
        }
    }

    private static void readXlsx(File excelFile, RowConsumer consumer) throws IOException {
        OPCPackage pkg;
        try {
            pkg = OPCPackage.open(excelFile, PackageAccess.READ);
        } catch (OpenXML4JException e) {
            throw new IOException("Cannot open xlsx file " + excelFile.getName() + ": " + e.getMessage(), e);
        }
        try {
            XSSFReader reader = new XSSFReader(pkg);
            StylesTable styles = reader.getStylesTable();
            ReadOnlySharedStringsTable sharedStrings = new ReadOnlySharedStringsTable(pkg);

            XMLReader parser = XMLHelper.newXMLReader();
            parser.setContentHandler(new XSSFSheetXMLHandler(
                    styles, sharedStrings, new RowCollector(consumer), new RawValueDataFormatter(), false));

            Iterator<InputStream> sheets = reader.getSheetsData();
            if (!sheets.hasNext()) {
                return;
            }
            try (InputStream sheet = sheets.next()) {
                parser.parse(new InputSource(sheet));
            }
        } catch (SAXException | OpenXML4JException | ParserConfigurationException e) {
            throw new IOException("Cannot read xlsx file " + excelFile.getName() + ": " + e.getMessage(), e);
        } finally {
            // Пакет открыт только на чтение: revert() закрывает его без попытки сохранения
            pkg.revert();
        }
    }

    private static void readXls(File excelFile, RowConsumer consumer) throws IOException {
        DataFormatter formatter = new RawValueDataFormatter();
        try (FileInputStream fis = new FileInputStream(excelFile);
             HSSFWorkbook workbook = new HSSFWorkbook(fis)) {
            Sheet sheet = workbook.getSheetAt(0);
            for (Row row : sheet) {
                Map<Integer, String> cells = new HashMap<>();
                for (Cell cell : row) {
                    String value = cellToRawString(cell, formatter);
                    if (value != null) {
                        cells.put(cell.getColumnIndex(), value);
                    }
                }
                consumer.accept(row.getRowNum(), cells);
            }
        }
    }

    private static String cellToRawString(Cell cell, DataFormatter formatter) {
        CellType type = cell.getCellType() == CellType.FORMULA ? cell.getCachedFormulaResultType() : cell.getCellType();
        return switch (type) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> formatter.formatRawCellContents(cell.getNumericCellValue(),
                    cell.getCellStyle().getDataFormat(), cell.getCellStyle().getDataFormatString());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> null;
        };
    }

    /** Собирает ячейки строки из SAX-событий и передаёт строку получателю целиком. */
    private static final class RowCollector implements XSSFSheetXMLHandler.SheetContentsHandler {
        private final RowConsumer consumer;
        private Map<Integer, String> cells = new HashMap<>();
        private int nextColumn;

        RowCollector(RowConsumer consumer) {
            this.consumer = consumer;
        }

        @Override
        public void startRow(int rowNum) {
            cells = new HashMap<>();
            nextColumn = 0;
        }

        @Override
        public void cell(String cellReference, String formattedValue, XSSFComment comment) {
            // Атрибут r у ячейки необязателен: без него ячейка идёт следом за предыдущей
            int column = cellReference != null ? new CellReference(cellReference).getCol() : nextColumn;
            nextColumn = column + 1;
            if (formattedValue != null) {
                cells.put(column, formattedValue);
            }
        }

        @Override
        public void endRow(int rowNum) {
            consumer.accept(rowNum, cells);
        }
    }

    /**
     * Форматтер числовых ячеек без учёта отображаемого формата: даты — ISO (yyyy-MM-dd),
     * прочие числа — полная точность без разделителей разрядов и лишних нулей.
     */
    private static final class RawValueDataFormatter extends DataFormatter {
        @Override
        public String formatRawCellContents(double value, int formatIndex, String formatString, boolean use1904Windowing) {
            if (Double.isNaN(value) || Double.isInfinite(value)) {
                return null;
            }
            if (DateUtil.isADateFormat(formatIndex, formatString) && DateUtil.isValidExcelDate(value)) {
                return DateUtil.getLocalDateTime(value).toLocalDate().toString();
            }
            return BigDecimal.valueOf(value).stripTrailingZeros().toPlainString();
        }
    }
}
