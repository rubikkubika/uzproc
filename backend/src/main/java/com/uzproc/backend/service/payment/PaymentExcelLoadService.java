package com.uzproc.backend.service.payment;

import com.uzproc.backend.entity.Cfo;
import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.entity.payment.Payment;
import com.uzproc.backend.entity.payment.PaymentRequestStatus;
import com.uzproc.backend.entity.payment.PaymentStatus;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.CfoRepository;
import com.uzproc.backend.repository.payment.PaymentRepository;
import com.uzproc.backend.repository.supplier.SupplierRepository;
import com.uzproc.backend.service.excel.ImportBatchRunner;
import com.uzproc.backend.service.excel.dictionary.CfoDictionary.CfoRef;
import com.uzproc.backend.service.excel.dictionary.ContractDictionary;
import com.uzproc.backend.service.excel.dictionary.ContractDictionary.ContractRef;
import com.uzproc.backend.service.excel.dictionary.ImportDictionaries;
import com.uzproc.backend.service.excel.dictionary.ImportDictionaryService;
import com.uzproc.backend.service.excel.dictionary.ImportUserResolver;
import com.uzproc.backend.service.excel.dictionary.PurchaseRequestDictionary.PurchaseRequestRef;
import com.uzproc.backend.service.excel.dictionary.SupplierDictionary;
import com.uzproc.backend.service.excel.dictionary.SupplierDictionary.SupplierRef;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;
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
    private static final String COUNTERPARTY_COLUMN = "Контрагент";
    private static final String INN_COLUMN = "ИНН";
    private static final String EXECUTOR_COLUMN = "Исполнитель";
    private static final String RESPONSIBLE_COLUMN = "Ответственный";

    /** Строка заголовков ищется среди первых строк листа */
    private static final int HEADER_SEARCH_ROWS = 10;
    /** Размер порции: каждая порция сохраняется в отдельной транзакции */
    private static final int BATCH_SIZE = 500;

    /** Справочники, по которым сопоставляются строки оплат */
    private static final Set<ImportDictionaryService.Kind> DICTIONARIES = EnumSet.of(
            ImportDictionaryService.Kind.CONTRACTS, ImportDictionaryService.Kind.PURCHASE_REQUESTS,
            ImportDictionaryService.Kind.SUPPLIERS, ImportDictionaryService.Kind.USERS, ImportDictionaryService.Kind.CFOS);

    private static final DateTimeFormatter[] DATE_PARSERS = {
            DateTimeFormatter.ofPattern("dd.MM.yyyy"),
            DateTimeFormatter.ofPattern("d.M.yyyy"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd"),
            DateTimeFormatter.ISO_LOCAL_DATE
    };

    /** Префикс комментария 1С: после него идёт заголовок документа/договора (допускается пробел или ": " после слова) */
    private static final String COMMENT_PREFIX_1C = "Создана по документу 1С:Документооборот";
    /** Паттерн для служебной части в скобках: " ( ... от ...)" — номер/дата документа 1С, не часть названия договора */
    private static final Pattern SERVICE_PAREN_SUFFIX = Pattern.compile("\\s+\\([^)]*от[^)]*\\)\\s*$");

    /** Паттерн для извлечения номера заявки из комментария: "Создана по документу ... N 1898 - ..." или "N1898" */
    private static final Pattern REQUEST_NUMBER_IN_COMMENT = Pattern.compile("N\\s*(\\d+)");
    /** Паттерн для формата "Договор ... M-Construction 2013 ...": 2013 — номер заявки */
    private static final Pattern REQUEST_NUMBER_M_CONSTRUCTION = Pattern.compile("M-Construction\\s+(\\d+)");

    private final PaymentRepository paymentRepository;
    private final CfoRepository cfoRepository;
    private final SupplierRepository supplierRepository;
    private final ImportBatchRunner batchRunner;
    private final ImportDictionaryService dictionaryService;
    private final ImportUserResolver userResolver;

    @PersistenceContext
    private EntityManager entityManager;

    public PaymentExcelLoadService(PaymentRepository paymentRepository, CfoRepository cfoRepository,
                                   SupplierRepository supplierRepository,
                                   ImportBatchRunner batchRunner,
                                   ImportDictionaryService dictionaryService,
                                   ImportUserResolver userResolver) {
        this.paymentRepository = paymentRepository;
        this.cfoRepository = cfoRepository;
        this.supplierRepository = supplierRepository;
        this.batchRunner = batchRunner;
        this.dictionaryService = dictionaryService;
        this.userResolver = userResolver;
    }

    /**
     * Загружает оплаты из Excel файла (папка payments).
     * Колонки: Сумма, ЦФО, Комментарий (Основание).
     * Каждая строка — новая запись (связь ЦФО по имени, при отсутствии — создаётся).
     * Файл читается построчно ({@link PaymentExcelRowReader}), лист не загружается в память целиком.
     * Без @Transactional на уровне метода: строки сохраняются порциями по BATCH_SIZE в отдельных
     * транзакциях через {@link ImportBatchRunner} (как у согласований договоров и поступлений) —
     * сессия Hibernate не разрастается на весь файл, а ошибка одной строки не откатывает весь импорт.
     * Договоры, заявки, поставщики, пользователи и ЦФО сопоставляются по справочникам в памяти
     * ({@link ImportDictionaryService}), а не запросами на каждую строку.
     */
    public int loadPaymentsFromExcel(File excelFile) throws IOException {
        ImportDictionaries dictionaries = dictionaryService.load(DICTIONARIES);
        Set<String> existingMainIds = new HashSet<>(paymentRepository.findAllMainIds());

        PaymentFileImport fileImport = new PaymentFileImport(excelFile.getName(), dictionaries, existingMainIds);
        PaymentExcelRowReader.read(excelFile, fileImport::onRow);
        fileImport.flushBatch();

        if (fileImport.columns == null) {
            logger.warn("Payments: header row not found in file {} (checked first {} rows)", excelFile.getName(), HEADER_SEARCH_ROWS);
            return 0;
        }
        logger.info("Loaded {} payments from file {} in {} batches (batch size={}, skipped without mainId: {}, skipped duplicate mainId in file: {})",
                fileImport.loadedCount, excelFile.getName(), fileImport.batchNumber, BATCH_SIZE,
                fileImport.skippedNoMainId, fileImport.skippedDuplicateMainId);
        return fileImport.loadedCount;
    }

    /** Индексы колонок файла оплат (null — колонки в файле нет). */
    private record PaymentColumns(Integer number, Integer amount, Integer cfo, Integer comment,
                                  Integer paymentStatus, Integer requestStatus,
                                  Integer plannedExpenseDate, Integer paymentDate,
                                  Integer counterparty, Integer inn,
                                  Integer executor, Integer responsible) {
    }

    /** Строка файла, отобранная к сохранению: номер строки (с 0), номер оплаты и значения ячеек. */
    private record PaymentRow(int rowNum, String mainId, Map<Integer, String> cells) {
    }

    /**
     * Состояние загрузки одного файла: поиск строки заголовков, отбор строк с уникальным номером оплаты
     * (без обращений к БД) и сохранение их порциями.
     */
    private final class PaymentFileImport {
        private final String fileName;
        private final ImportDictionaries dictionaries;
        /** Номера оплат, которые уже есть в БД: для остальных строк оплата создаётся без поиска */
        private final Set<String> existingMainIds;
        private final Set<String> mainIdsSeenInFile = new HashSet<>();
        private final List<PaymentRow> batch = new ArrayList<>(BATCH_SIZE);
        private PaymentColumns columns;
        private int loadedCount;
        private int batchNumber;
        private int skippedNoMainId;
        private int skippedDuplicateMainId;

        PaymentFileImport(String fileName, ImportDictionaries dictionaries, Set<String> existingMainIds) {
            this.fileName = fileName;
            this.dictionaries = dictionaries;
            this.existingMainIds = existingMainIds;
        }

        void onRow(int rowNum, Map<Integer, String> cells) {
            if (columns == null) {
                if (rowNum < HEADER_SEARCH_ROWS) {
                    columns = detectColumns(cells, fileName);
                }
                return;
            }
            if (isRowEmpty(cells)) return;
            // Загружаем только строки с основным номером (Номер); строки без номера — мусор, пропускаем
            String mainId = extractMainId(cells, columns);
            if (mainId == null) {
                skippedNoMainId++;
                return;
            }
            // Повторений mainId в файле быть не должно — при повторном номере пропускаем строку
            if (!mainIdsSeenInFile.add(mainId)) {
                skippedDuplicateMainId++;
                logger.warn("Payments: duplicate mainId in file at row {} (mainId={}), skipping", rowNum + 1, mainId);
                return;
            }
            batch.add(new PaymentRow(rowNum, mainId, cells));
            if (batch.size() >= BATCH_SIZE) {
                flushBatch();
            }
        }

        /** Сохраняет накопленную порцию (с построчным повтором при сбое); список всегда очищается. */
        void flushBatch() {
            if (batch.isEmpty()) return;
            batchNumber++;
            try {
                loadedCount += batchRunner.save("Payments", batch, row -> savePaymentRow(row, this),
                        dictionaries, row -> String.valueOf(row.rowNum() + 1));
            } finally {
                batch.clear();
            }
            logger.debug("Payments: batch {} saved ({} payments so far)", batchNumber, loadedCount);
        }
    }

    /**
     * Сохраняет одну строку внутри транзакции порции: разбор со связями и upsert по mainId.
     * Сопоставление только по mainId (номер оплаты). Не ищем по комментарию:
     * к одной заявке может быть несколько оплат с одинаковым текстом в комментарии.
     *
     * @return true — оплата создана или обновлена
     */
    private boolean savePaymentRow(PaymentRow row, PaymentFileImport fileImport) {
        Payment payment = parsePaymentRow(row.cells(), row.rowNum(), fileImport.columns, fileImport.dictionaries);
        if (fileImport.existingMainIds.contains(row.mainId())) {
            Optional<Payment> existingOpt = paymentRepository.findFirstByMainId(row.mainId());
            if (existingOpt.isPresent()) {
                Payment existing = existingOpt.get();
                if (updatePaymentFields(existing, payment)) {
                    paymentRepository.save(existing);
                    return true;
                }
                return false;
            }
        }
        paymentRepository.save(payment);
        return true;
    }

    /** Номер оплаты из колонки «Номер»; null — если его нет. */
    private static String extractMainId(Map<Integer, String> cells, PaymentColumns columns) {
        String number = cellValue(cells, columns.number());
        // Если в ячейке число с дробной частью (например 12345.0 из Excel), оставляем целую часть для mainId
        if (number != null && number.matches("\\d+\\.0+")) {
            number = number.replaceAll("\\.0+$", "");
        }
        return number;
    }

    /**
     * Если строка — заголовок (есть колонка «Сумма» или «ЦФО»), возвращает индексы колонок;
     * иначе null.
     */
    private PaymentColumns detectColumns(Map<Integer, String> cells, String fileName) {
        Map<String, Integer> columnIndexMap = buildColumnIndexMap(cells);
        Integer amountColumnIndex = findColumnIndex(columnIndexMap, AMOUNT_COLUMN);
        Integer cfoColumnIndex = findColumnIndex(columnIndexMap, CFO_COLUMN);
        if (amountColumnIndex == null && cfoColumnIndex == null) {
            return null;
        }

        Integer numberColumnIndex = findColumnIndex(columnIndexMap, NUMBER_COLUMN);
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
        Integer counterpartyColumnIndex = findColumnIndex(columnIndexMap, COUNTERPARTY_COLUMN);
        Integer innColumnIndex = findColumnIndex(columnIndexMap, INN_COLUMN);
        Integer executorColumnIndex = findColumnIndex(columnIndexMap, EXECUTOR_COLUMN);
        Integer responsibleColumnIndex = findColumnIndex(columnIndexMap, RESPONSIBLE_COLUMN);
        if (numberColumnIndex == null) {
            logger.warn("Payments: column 'Номер' not found in file {}; headers checked: {}", fileName, columnIndexMap.keySet());
        }
        logger.info("Payments: file {} columns -> Номер={}, Сумма={}, ЦФО={}, Комментарий={}, Статус оплаты={}, Статус заявки={}, Дата расхода (план)={}, Дата оплаты={}, Контрагент={}, ИНН={}, Исполнитель={}, Ответственный={}", fileName, numberColumnIndex, amountColumnIndex, cfoColumnIndex, commentColumnIndex, paymentStatusColumnIndex, requestStatusColumnIndex, plannedExpenseDateColumnIndex, paymentDateColumnIndex, counterpartyColumnIndex, innColumnIndex, executorColumnIndex, responsibleColumnIndex);

        return new PaymentColumns(numberColumnIndex, amountColumnIndex, cfoColumnIndex, commentColumnIndex,
                paymentStatusColumnIndex, requestStatusColumnIndex, plannedExpenseDateColumnIndex, paymentDateColumnIndex,
                counterpartyColumnIndex, innColumnIndex, executorColumnIndex, responsibleColumnIndex);
    }

    private Payment parsePaymentRow(Map<Integer, String> cells, int rowNum, PaymentColumns columns,
                                    ImportDictionaries dictionaries) {
        Payment payment = new Payment();

        String mainId = extractMainId(cells, columns);
        if (mainId != null) {
            payment.setMainId(mainId);
        }

        BigDecimal amount = parseBigDecimal(cellValue(cells, columns.amount()));
        if (amount != null) {
            payment.setAmount(amount);
        }

        String cfoName = cellValue(cells, columns.cfo());
        if (cfoName != null) {
            payment.setCfo(findOrCreateCfo(cfoName, dictionaries));
        }

        String comment = cellValue(cells, columns.comment());
        if (comment != null) {
            payment.setComment(comment);
            PurchaseRequestRef purchaseRequest = findPurchaseRequest(comment, dictionaries);
            if (purchaseRequest != null) {
                payment.setPurchaseRequest(entityManager.getReference(PurchaseRequest.class, purchaseRequest.id()));
            }
            ContractRef contract = findContract(comment, purchaseRequest, dictionaries.contracts());
            if (contract != null) {
                payment.setContract(entityManager.getReference(Contract.class, contract.id()));
            }
        }

        String paymentStatusValue = cellValue(cells, columns.paymentStatus());
        if (paymentStatusValue != null) {
            PaymentStatus status = PaymentStatus.fromDisplayName(paymentStatusValue);
            if (status != null) {
                payment.setPaymentStatus(status);
            } else {
                logger.debug("Payment row {}: unknown 'Статус оплаты' value '{}', expected: К оплате, Оплата возвращена, Оплачена", rowNum + 1, paymentStatusValue);
            }
        }

        String requestStatusValue = cellValue(cells, columns.requestStatus());
        if (requestStatusValue != null) {
            PaymentRequestStatus status = PaymentRequestStatus.fromDisplayName(requestStatusValue);
            if (status != null) {
                payment.setRequestStatus(status);
            } else {
                logger.debug("Payment row {}: unknown 'Статус заявки' value '{}', expected: На согласовании, Отклонен, Утвержден, Черновик", rowNum + 1, requestStatusValue);
            }
        }

        LocalDate plannedExpenseDate = parseDate(cellValue(cells, columns.plannedExpenseDate()));
        if (plannedExpenseDate != null) {
            payment.setPlannedExpenseDate(plannedExpenseDate);
        }

        LocalDate paymentDate = parseDate(cellValue(cells, columns.paymentDate()));
        if (paymentDate != null) {
            payment.setPaymentDate(paymentDate);
        }

        String counterpartyName = cellValue(cells, columns.counterparty());
        if (counterpartyName != null) {
            payment.setCounterparty(counterpartyName);
        }

        // Связь с контрагентом из справочника: ищем по ИНН, при отсутствии — создаём
        String inn = normalizeInn(cellValue(cells, columns.inn()));
        Supplier supplier = findOrCreateSupplier(inn, counterpartyName, dictionaries.suppliers());
        if (supplier != null) {
            payment.setSupplier(supplier);
        }

        String executorValue = cellValue(cells, columns.executor());
        if (executorValue != null) {
            User executor = userResolver.findOrCreate(executorValue, dictionaries.users());
            if (executor != null) {
                payment.setExecutor(executor);
            }
        }

        String responsibleValue = cellValue(cells, columns.responsible());
        if (responsibleValue != null) {
            User responsible = userResolver.findOrCreate(responsibleValue, dictionaries.users());
            if (responsible != null) {
                payment.setResponsible(responsible);
            }
        }

        return payment;
    }

    /**
     * Обновляет поля существующей оплаты только если они отличаются (как у заявок/закупок).
     * Связи сравниваются по id: у ссылок из справочников (getReference) другие поля без запроса к БД недоступны.
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
                logger.debug("Updated cfo for payment {}: {}", existing.getId(), newData.getCfo().getId());
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

        if (newData.getCounterparty() != null) {
            String newCounterparty = newData.getCounterparty().trim();
            if (!newCounterparty.isEmpty() && !newCounterparty.equals(existing.getCounterparty())) {
                existing.setCounterparty(newCounterparty);
                updated = true;
                logger.debug("Updated counterparty for payment {}: {}", existing.getId(), newCounterparty);
            }
        }

        if (newData.getSupplier() != null) {
            if (existing.getSupplier() == null || !newData.getSupplier().getId().equals(existing.getSupplier().getId())) {
                existing.setSupplier(newData.getSupplier());
                updated = true;
                logger.debug("Updated supplier for payment {}: {}", existing.getId(), newData.getSupplier().getId());
            }
        }

        if (newData.getPurchaseRequest() != null) {
            Long newPrId = newData.getPurchaseRequest().getId();
            if (existing.getPurchaseRequest() == null || !existing.getPurchaseRequest().getId().equals(newPrId)) {
                existing.setPurchaseRequest(newData.getPurchaseRequest());
                updated = true;
                logger.debug("Updated purchaseRequest for payment {}: {}", existing.getId(), newPrId);
            }
        }

        if (newData.getContract() != null) {
            if (existing.getContract() == null || !existing.getContract().getId().equals(newData.getContract().getId())) {
                existing.setContract(newData.getContract());
                updated = true;
                logger.debug("Updated contract for payment {}: {}", existing.getId(), newData.getContract().getId());
            }
        } else if (newData.getContract() == null && existing.getContract() != null) {
            existing.setContract(null);
            updated = true;
            logger.debug("Cleared contract for payment {}", existing.getId());
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
     * Приводит ИНН из ячейки к строке цифр: убирает пробелы и хвост ".0" от числового формата Excel.
     *
     * @return нормализованный ИНН или null, если значения нет
     */
    private String normalizeInn(String rawInn) {
        if (rawInn == null) return null;
        String trimmed = rawInn.trim().replace(" ", "");
        if (trimmed.isEmpty()) return null;
        if (trimmed.matches("\\d+\\.0+")) {
            trimmed = trimmed.replaceAll("\\.0+$", "");
        }
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * ЦФО по названию без учёта регистра; при отсутствии — создаётся.
     * Нет в справочнике — проверяем БД (ЦФО мог создать другой загрузчик), затем создаём.
     */
    private Cfo findOrCreateCfo(String cfoName, ImportDictionaries dictionaries) {
        CfoRef ref = dictionaries.cfos().byName(cfoName);
        if (ref == null) {
            Optional<Cfo> existing = cfoRepository.findByNameIgnoreCase(cfoName);
            if (existing.isPresent()) {
                ref = new CfoRef(existing.get().getId(), existing.get().getName());
                dictionaries.cfos().putExisting(ref);
            } else {
                Cfo created = cfoRepository.save(new Cfo(cfoName));
                ref = new CfoRef(created.getId(), created.getName());
                dictionaries.cfos().stage(ref);
            }
        }
        return entityManager.getReference(Cfo.class, ref.id());
    }

    /**
     * Находит контрагента в справочнике поставщиков по ИНН, при отсутствии — создаёт нового
     * (code = ИНН, как при разборе колонки "Контрагенты" в договорах).
     * Если ИНН в выгрузке нет, пробуем найти поставщика по наименованию (новый при этом не создаём).
     * code у поставщиков уникален: если code, равный этому ИНН, уже занят поставщиком с другим ИНН
     * (например, служебный ИНН «000000005» совпал с кодом из справочника 1С), новый не создаём,
     * а ищем по наименованию — иначе вставка нарушит уникальность и сломает загрузку всего файла.
     * Поиск идёт по справочнику; при промахе по ИНН или коду проверяется БД (поставщика мог создать другой загрузчик).
     *
     * @return найденный или созданный поставщик, либо null, если сопоставить не по чему
     */
    private Supplier findOrCreateSupplier(String inn, String counterpartyName, SupplierDictionary suppliers) {
        if (inn == null) {
            return supplierReference(findSupplierByName(counterpartyName, suppliers));
        }
        SupplierRef byInn = suppliers.byInn(inn);
        if (byInn == null) {
            byInn = supplierRepository.findFirstByInn(inn).map(SupplierRef::of).orElse(null);
            if (byInn != null) suppliers.putExisting(byInn);
        }
        if (byInn != null) {
            // Наименование в справочнике может быть пустым — заполняем из выгрузки оплат
            if ((byInn.name() == null || byInn.name().isBlank()) && counterpartyName != null && !counterpartyName.isBlank()) {
                Supplier existing = supplierRepository.findById(byInn.id()).orElseThrow();
                existing.setName(counterpartyName);
                supplierRepository.save(existing);
                byInn = SupplierRef.of(existing);
                suppliers.stage(byInn);
            }
            return supplierReference(byInn);
        }
        SupplierRef sameCode = suppliers.byCode(inn);
        if (sameCode == null) {
            sameCode = supplierRepository.findByCode(inn).map(SupplierRef::of).orElse(null);
            if (sameCode != null) suppliers.putExisting(sameCode);
        }
        if (sameCode != null) {
            // Поставщик с code = ИНН, но без ИНН — тот же контрагент: дозаполняем ИНН
            if (sameCode.inn() == null || sameCode.inn().isBlank()) {
                Supplier existing = supplierRepository.findById(sameCode.id()).orElseThrow();
                existing.setInn(inn);
                supplierRepository.save(existing);
                sameCode = SupplierRef.of(existing);
                suppliers.stage(sameCode);
                return supplierReference(sameCode);
            }
            logger.warn("Payments: supplier code '{}' is taken by supplier id={} with inn={}, not creating supplier for counterparty '{}'",
                    inn, sameCode.id(), sameCode.inn(), counterpartyName);
            return supplierReference(findSupplierByName(counterpartyName, suppliers));
        }
        Supplier created = new Supplier();
        created.setCode(inn);
        created.setInn(inn);
        created.setName(counterpartyName);
        logger.info("Payments: creating supplier from payment row (inn={}, name={})", inn, counterpartyName);
        created = supplierRepository.save(created);
        suppliers.stage(SupplierRef.of(created));
        return created;
    }

    /** Поставщик по наименованию без учёта регистра (как findFirstByNameIgnoreCase); новый не создаётся. */
    private static SupplierRef findSupplierByName(String counterpartyName, SupplierDictionary suppliers) {
        if (counterpartyName == null || counterpartyName.isBlank()) {
            return null;
        }
        return suppliers.byName(counterpartyName);
    }

    private Supplier supplierReference(SupplierRef ref) {
        return ref == null ? null : entityManager.getReference(Supplier.class, ref.id());
    }

    /**
     * Парсит дату из значения ячейки: ячейки с форматом даты приходят как yyyy-MM-dd,
     * текстовые — в формате dd.MM.yyyy / d.M.yyyy / yyyy-MM-dd.
     */
    private LocalDate parseDate(String raw) {
        if (raw == null || "-".equals(raw) || "—".equals(raw)) {
            return null;
        }
        for (DateTimeFormatter formatter : DATE_PARSERS) {
            try {
                return LocalDate.parse(raw, formatter);
            } catch (DateTimeParseException ignored) {
            }
        }
        logger.debug("Cannot parse date from cell: {}", raw);
        return null;
    }

    /**
     * Нормализует строку заголовка для сравнения: trim и схлопывание повторяющихся пробелов в один.
     */
    private static String normalizeTitleForMatch(String s) {
        if (s == null) return "";
        return s.trim().replaceAll("\\s+", " ");
    }

    /**
     * Из комментария извлекает заголовок договора/документа и находит договор по полю title.
     * Формат 1: "Создана по документу 1С:Документооборот: Спецификация 86 по заявке: M - Maintenance N 2136 - ..."
     *   → заголовок = "Спецификация 86 по заявке: M - Maintenance N 2136 - ..."
     * Формат 2: "Создана по документу 1С:Документооборот: Договор 15-KZA от 15.01.2026 M-Construction 2013 \"KZA BINO\" MCHJ ( 686 от 09.02.2026)"
     *   → заголовок = "Договор 15-KZA от 15.01.2026 M-Construction 2013 \"KZA BINO\" MCHJ" (до " (")
     * Сначала ищется точное совпадение по title, затем по нормализованному title, затем по name,
     * затем среди договоров заявки оплаты.
     */
    private ContractRef findContract(String comment, PurchaseRequestRef purchaseRequest, ContractDictionary contracts) {
        if (comment == null || !comment.startsWith(COMMENT_PREFIX_1C)) return null;
        String afterPrefix = comment.substring(COMMENT_PREFIX_1C.length()).replaceFirst("^[:\\s]+", "").trim();
        if (afterPrefix.isEmpty()) return null;
        Matcher parenMatcher = SERVICE_PAREN_SUFFIX.matcher(afterPrefix);
        String title = parenMatcher.find() ? afterPrefix.substring(0, parenMatcher.start()).trim() : afterPrefix;
        if (title.length() > 500) {
            title = title.substring(0, 500);
        }
        String normalizedTitle = normalizeTitleForMatch(title);
        if (normalizedTitle.isEmpty()) return null;

        ContractRef contract = contracts.byTitle(title);
        if (contract == null) {
            contract = contracts.byNormalizedTitle(normalizedTitle);
        }
        if (contract == null) {
            contract = contracts.byName(normalizedTitle);
        }
        if (contract == null && !normalizedTitle.equals(title)) {
            contract = contracts.byName(title);
        }
        if (contract != null) {
            logger.info("Payment linked to contract by title: {}", title.length() > 80 ? title.substring(0, 80) + "..." : title);
            return contract;
        }
        // Fallback: if payment is linked to purchase request, try contract lookup within that request.
        // This allows re-imports to link contracts later when direct title matching fails.
        contract = findContractByPurchaseRequest(purchaseRequest, normalizedTitle, title, contracts);
        if (contract == null) {
            logger.debug("Payment: no contract found for title (excerpt): '{}'", title.length() > 80 ? title.substring(0, 80) + "..." : title);
        }
        return contract;
    }

    private ContractRef findContractByPurchaseRequest(PurchaseRequestRef purchaseRequest, String normalizedTitle,
                                                      String originalTitle, ContractDictionary contracts) {
        if (purchaseRequest == null || purchaseRequest.idPurchaseRequest() == null) {
            return null;
        }

        Long purchaseRequestId = purchaseRequest.idPurchaseRequest();
        List<ContractRef> requestContracts = contracts.byPurchaseRequestId(purchaseRequestId);
        if (requestContracts.isEmpty()) {
            return null;
        }

        if (requestContracts.size() == 1) {
            logger.info("Payment linked to contract by purchaseRequestId={} (single contract)", purchaseRequestId);
            return requestContracts.get(0);
        }

        for (ContractRef contract : requestContracts) {
            if (contract.title() != null && normalizeTitleForMatch(contract.title()).equals(normalizedTitle)) {
                logger.info("Payment linked to contract by purchaseRequestId={} and normalized title", purchaseRequestId);
                return contract;
            }
        }

        for (ContractRef contract : requestContracts) {
            if (contract.name() != null && normalizeTitleForMatch(contract.name()).equals(normalizedTitle)) {
                logger.info("Payment linked to contract by purchaseRequestId={} and normalized name", purchaseRequestId);
                return contract;
            }
        }

        logger.debug("Payment: {} contracts found for purchaseRequestId={}, but no exact title/name match for '{}'",
            requestContracts.size(),
            purchaseRequestId,
            originalTitle.length() > 80 ? originalTitle.substring(0, 80) + "..." : originalTitle);
        return null;
    }

    /**
     * Из комментария извлекает номер заявки и находит заявку на закупку.
     * Формат 1: "N 2136" / "N 1898" в тексте → innerId 2136, 1898.
     * Формат 2: "Договор ... M-Construction 2013 ..." → 2013 — номер заявки (innerId или id_purchase_request).
     */
    private PurchaseRequestRef findPurchaseRequest(String comment, ImportDictionaries dictionaries) {
        if (comment == null || comment.isEmpty()) return null;
        String innerId = null;
        Matcher mConstruction = REQUEST_NUMBER_M_CONSTRUCTION.matcher(comment);
        if (mConstruction.find()) {
            String last = null;
            do { last = mConstruction.group(1); } while (mConstruction.find());
            if (last != null) innerId = last.trim();
        }
        if (innerId == null) {
            Matcher matcher = REQUEST_NUMBER_IN_COMMENT.matcher(comment);
            String lastMatch = null;
            while (matcher.find()) lastMatch = matcher.group(1);
            if (lastMatch != null) innerId = lastMatch.trim();
        }
        if (innerId == null || innerId.isEmpty()) return null;
        PurchaseRequestRef purchaseRequest = dictionaries.purchaseRequests().byInnerId(innerId);
        if (purchaseRequest == null) {
            try {
                purchaseRequest = dictionaries.purchaseRequests().byIdPurchaseRequest(Long.parseLong(innerId));
            } catch (NumberFormatException ignored) { }
        }
        if (purchaseRequest != null) {
            logger.info("Payment linked to purchase request innerId={}", innerId);
        } else {
            logger.info("Payment: no purchase request found for innerId='{}' (comment excerpt: '{}')", innerId, comment.length() > 80 ? comment.substring(0, 80) + "..." : comment);
        }
        return purchaseRequest;
    }

    private Map<String, Integer> buildColumnIndexMap(Map<Integer, String> headerCells) {
        Map<String, Integer> map = new HashMap<>();
        // Слева направо: при повторяющемся заголовке остаётся самая правая колонка
        for (Map.Entry<Integer, String> e : new TreeMap<>(headerCells).entrySet()) {
            String value = e.getValue() != null ? e.getValue().trim() : "";
            if (!value.isEmpty()) {
                map.put(value, e.getKey());
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

    /** Значение ячейки без пробелов по краям; null — если колонки нет или ячейка пустая. */
    private static String cellValue(Map<Integer, String> cells, Integer columnIndex) {
        if (columnIndex == null) return null;
        String value = cells.get(columnIndex);
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    /**
     * Парсит сумму: числовые ячейки приходят без форматирования (1234567.89);
     * из текстовых убираются лишние символы, запятая считается десятичным разделителем.
     */
    private BigDecimal parseBigDecimal(String raw) {
        if (raw == null || "-".equals(raw) || "—".equals(raw)) {
            return null;
        }
        try {
            return new BigDecimal(raw);
        } catch (NumberFormatException ignored) {
        }
        try {
            String cleaned = raw.replaceAll("[^0-9.,]", "").replace(",", ".");
            if (cleaned.isEmpty()) return null;
            return new BigDecimal(cleaned);
        } catch (Exception e) {
            logger.debug("Cannot parse BigDecimal from cell: {}", raw);
            return null;
        }
    }

    private static boolean isRowEmpty(Map<Integer, String> cells) {
        return cells.values().stream().allMatch(v -> v == null || v.trim().isEmpty());
    }
}
