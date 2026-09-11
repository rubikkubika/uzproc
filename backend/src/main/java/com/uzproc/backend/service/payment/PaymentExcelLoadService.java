package com.uzproc.backend.service.payment;

import com.uzproc.backend.entity.Cfo;
import com.uzproc.backend.entity.payment.Payment;
import com.uzproc.backend.entity.payment.PaymentRequestStatus;
import com.uzproc.backend.entity.payment.PaymentStatus;
import com.uzproc.backend.entity.purchaserequest.PurchaseRequest;
import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.entity.contract.Contract;
import com.uzproc.backend.repository.CfoRepository;
import com.uzproc.backend.repository.contract.ContractRepository;
import com.uzproc.backend.repository.payment.PaymentRepository;
import com.uzproc.backend.repository.purchaserequest.PurchaseRequestRepository;
import com.uzproc.backend.repository.supplier.SupplierRepository;
import com.uzproc.backend.repository.user.UserRepository;
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
    private final PurchaseRequestRepository purchaseRequestRepository;
    private final ContractRepository contractRepository;
    private final UserRepository userRepository;
    private final SupplierRepository supplierRepository;
    private final PaymentBatchSaver batchSaver;

    public PaymentExcelLoadService(PaymentRepository paymentRepository, CfoRepository cfoRepository,
                                  PurchaseRequestRepository purchaseRequestRepository,
                                  ContractRepository contractRepository,
                                  UserRepository userRepository,
                                  SupplierRepository supplierRepository,
                                  PaymentBatchSaver batchSaver) {
        this.paymentRepository = paymentRepository;
        this.cfoRepository = cfoRepository;
        this.purchaseRequestRepository = purchaseRequestRepository;
        this.contractRepository = contractRepository;
        this.userRepository = userRepository;
        this.supplierRepository = supplierRepository;
        this.batchSaver = batchSaver;
    }

    /**
     * Загружает оплаты из Excel файла (папка payments).
     * Колонки: Сумма, ЦФО, Комментарий (Основание).
     * Каждая строка — новая запись (связь ЦФО по имени, при отсутствии — создаётся).
     * Файл читается построчно ({@link PaymentExcelRowReader}), лист не загружается в память целиком.
     * Без @Transactional на уровне метода: строки сохраняются порциями по BATCH_SIZE в отдельных
     * транзакциях через {@link PaymentBatchSaver} (как у согласований договоров и поступлений) —
     * сессия Hibernate не разрастается на весь файл, а ошибка одной строки не откатывает весь импорт.
     */
    public int loadPaymentsFromExcel(File excelFile) throws IOException {
        PaymentFileImport fileImport = new PaymentFileImport(excelFile.getName());
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
        private final Set<String> mainIdsSeenInFile = new HashSet<>();
        private final List<PaymentRow> batch = new ArrayList<>(BATCH_SIZE);
        private PaymentColumns columns;
        private int loadedCount;
        private int batchNumber;
        private int skippedNoMainId;
        private int skippedDuplicateMainId;

        PaymentFileImport(String fileName) {
            this.fileName = fileName;
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

        /**
         * Быстрый путь — вся порция одной транзакцией; при сбое (например, одна строка испортила сессию)
         * порция повторяется построчно — теряется только плохая строка. Список всегда очищается.
         */
        void flushBatch() {
            if (batch.isEmpty()) return;
            batchNumber++;
            try {
                loadedCount += batchSaver.saveBatch(batch, row -> savePaymentRow(row, columns));
            } catch (Exception e) {
                logger.warn("Payments: batch {} save failed ({}), retrying row-by-row for {} rows",
                        batchNumber, e.getMessage(), batch.size());
                for (PaymentRow row : batch) {
                    try {
                        loadedCount += batchSaver.saveRowIsolated(row, r -> savePaymentRow(r, columns));
                    } catch (Exception ex) {
                        logger.warn("Error processing payment row {}: {}", row.rowNum() + 1, ex.getMessage());
                    }
                }
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
    private boolean savePaymentRow(PaymentRow row, PaymentColumns columns) {
        Payment payment = parsePaymentRow(row.cells(), row.rowNum(), columns);
        Optional<Payment> existingOpt = paymentRepository.findFirstByMainId(row.mainId());
        if (existingOpt.isPresent()) {
            Payment existing = existingOpt.get();
            if (updatePaymentFields(existing, payment)) {
                paymentRepository.save(existing);
                return true;
            }
            return false;
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

    private Payment parsePaymentRow(Map<Integer, String> cells, int rowNum, PaymentColumns columns) {
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
            Cfo cfo = cfoRepository.findByNameIgnoreCase(cfoName)
                    .orElseGet(() -> cfoRepository.save(new Cfo(cfoName)));
            payment.setCfo(cfo);
        }

        String comment = cellValue(cells, columns.comment());
        if (comment != null) {
            payment.setComment(comment);
            linkPurchaseRequestFromComment(payment, comment);
            linkContractFromComment(payment, comment);
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
        Supplier supplier = findOrCreateSupplier(inn, counterpartyName);
        if (supplier != null) {
            payment.setSupplier(supplier);
        }

        String executorValue = cellValue(cells, columns.executor());
        if (executorValue != null) {
            User executor = findOrCreateUser(executorValue);
            if (executor != null) {
                payment.setExecutor(executor);
            }
        }

        String responsibleValue = cellValue(cells, columns.responsible());
        if (responsibleValue != null) {
            User responsible = findOrCreateUser(responsibleValue);
            if (responsible != null) {
                payment.setResponsible(responsible);
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
                logger.debug("Updated supplier for payment {}: inn={}", existing.getId(), newData.getSupplier().getInn());
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

        if (newData.getContract() != null) {
            if (existing.getContract() == null || !existing.getContract().getId().equals(newData.getContract().getId())) {
                existing.setContract(newData.getContract());
                updated = true;
                logger.debug("Updated contract for payment {}: {}", existing.getId(), newData.getContract().getTitle());
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
     * Находит контрагента в справочнике поставщиков по ИНН, при отсутствии — создаёт нового
     * (code = ИНН, как при разборе колонки "Контрагенты" в договорах).
     * Если ИНН в выгрузке нет, пробуем найти поставщика по наименованию (новый при этом не создаём).
     * code у поставщиков уникален: если code, равный этому ИНН, уже занят поставщиком с другим ИНН
     * (например, служебный ИНН «000000005» совпал с кодом из справочника 1С), новый не создаём,
     * а ищем по наименованию — иначе вставка нарушит уникальность и сломает загрузку всего файла.
     *
     * @return найденный или созданный поставщик, либо null, если сопоставить не по чему
     */
    private Supplier findOrCreateSupplier(String inn, String counterpartyName) {
        if (inn == null) {
            return findSupplierByName(counterpartyName);
        }
        Optional<Supplier> existingOpt = supplierRepository.findFirstByInn(inn);
        if (existingOpt.isPresent()) {
            Supplier existing = existingOpt.get();
            // Наименование в справочнике может быть пустым — заполняем из выгрузки оплат
            if ((existing.getName() == null || existing.getName().isBlank())
                    && counterpartyName != null && !counterpartyName.isBlank()) {
                existing.setName(counterpartyName);
                return supplierRepository.save(existing);
            }
            return existing;
        }
        Optional<Supplier> sameCodeOpt = supplierRepository.findByCode(inn);
        if (sameCodeOpt.isPresent()) {
            Supplier sameCode = sameCodeOpt.get();
            // Поставщик с code = ИНН, но без ИНН — тот же контрагент: дозаполняем ИНН
            if (sameCode.getInn() == null || sameCode.getInn().isBlank()) {
                sameCode.setInn(inn);
                return supplierRepository.save(sameCode);
            }
            logger.warn("Payments: supplier code '{}' is taken by supplier id={} with inn={}, not creating supplier for counterparty '{}'",
                    inn, sameCode.getId(), sameCode.getInn(), counterpartyName);
            return findSupplierByName(counterpartyName);
        }
        Supplier created = new Supplier();
        created.setCode(inn);
        created.setInn(inn);
        created.setName(counterpartyName);
        logger.info("Payments: creating supplier from payment row (inn={}, name={})", inn, counterpartyName);
        return supplierRepository.save(created);
    }

    private Supplier findSupplierByName(String counterpartyName) {
        if (counterpartyName == null || counterpartyName.isBlank()) {
            return null;
        }
        return supplierRepository.findFirstByNameIgnoreCase(counterpartyName).orElse(null);
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
            }
            if (existingUser == null) {
                existingUser = userRepository.findByUsername(username).orElse(null);
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
     * Из комментария извлекает заголовок договора/документа и связывает оплату с договором по полю title.
     * Формат 1: "Создана по документу 1С:Документооборот: Спецификация 86 по заявке: M - Maintenance N 2136 - ..."
     *   → заголовок = "Спецификация 86 по заявке: M - Maintenance N 2136 - ..."
     * Формат 2: "Создана по документу 1С:Документооборот: Договор 15-KZA от 15.01.2026 M-Construction 2013 \"KZA BINO\" MCHJ ( 686 от 09.02.2026)"
     *   → заголовок = "Договор 15-KZA от 15.01.2026 M-Construction 2013 \"KZA BINO\" MCHJ" (до " (")
     * Сначала ищется точное совпадение по title, затем по нормализованному title, затем по name.
     */
    private void linkContractFromComment(Payment payment, String comment) {
        if (comment == null || !comment.startsWith(COMMENT_PREFIX_1C)) return;
        String afterPrefix = comment.substring(COMMENT_PREFIX_1C.length()).replaceFirst("^[:\\s]+", "").trim();
        if (afterPrefix.isEmpty()) return;
        Matcher parenMatcher = SERVICE_PAREN_SUFFIX.matcher(afterPrefix);
        String title = parenMatcher.find() ? afterPrefix.substring(0, parenMatcher.start()).trim() : afterPrefix;
        if (title.length() > 500) {
            title = title.substring(0, 500);
        }
        String normalizedTitle = normalizeTitleForMatch(title);
        if (normalizedTitle.isEmpty()) return;

        Optional<Contract> contractOpt = contractRepository.findFirstByTitle(title);
        if (contractOpt.isEmpty()) {
            contractOpt = contractRepository.findFirstByNormalizedTitle(normalizedTitle);
        }
        if (contractOpt.isEmpty()) {
            contractOpt = contractRepository.findByName(normalizedTitle);
        }
        if (contractOpt.isEmpty() && !normalizedTitle.equals(title)) {
            contractOpt = contractRepository.findByName(title);
        }
        if (contractOpt.isPresent()) {
            payment.setContract(contractOpt.get());
            logger.info("Payment linked to contract by title: {}", title.length() > 80 ? title.substring(0, 80) + "..." : title);
        } else {
            // Fallback: if payment is already linked to purchase request, try contract lookup within that request.
            // This allows re-imports to link contracts later when direct title matching fails.
            linkContractByPurchaseRequest(payment, normalizedTitle, title);
            if (payment.getContract() == null) {
                logger.debug("Payment: no contract found for title (excerpt): '{}'", title.length() > 80 ? title.substring(0, 80) + "..." : title);
            }
        }
    }

    private void linkContractByPurchaseRequest(Payment payment, String normalizedTitle, String originalTitle) {
        if (payment.getPurchaseRequest() == null || payment.getPurchaseRequest().getIdPurchaseRequest() == null) {
            return;
        }

        Long purchaseRequestId = payment.getPurchaseRequest().getIdPurchaseRequest();
        List<Contract> contracts = contractRepository.findByPurchaseRequestId(purchaseRequestId);
        if (contracts == null || contracts.isEmpty()) {
            return;
        }

        if (contracts.size() == 1) {
            payment.setContract(contracts.get(0));
            logger.info("Payment linked to contract by purchaseRequestId={} (single contract)", purchaseRequestId);
            return;
        }

        for (Contract contract : contracts) {
            if (contract.getTitle() != null &&
                normalizeTitleForMatch(contract.getTitle()).equals(normalizedTitle)) {
                payment.setContract(contract);
                logger.info("Payment linked to contract by purchaseRequestId={} and normalized title", purchaseRequestId);
                return;
            }
        }

        for (Contract contract : contracts) {
            if (contract.getName() != null &&
                normalizeTitleForMatch(contract.getName()).equals(normalizedTitle)) {
                payment.setContract(contract);
                logger.info("Payment linked to contract by purchaseRequestId={} and normalized name", purchaseRequestId);
                return;
            }
        }

        logger.debug("Payment: {} contracts found for purchaseRequestId={}, but no exact title/name match for '{}'",
            contracts.size(),
            purchaseRequestId,
            originalTitle.length() > 80 ? originalTitle.substring(0, 80) + "..." : originalTitle);
    }

    /**
     * Из комментария извлекает номер заявки и связывает оплату с заявкой на закупку.
     * Формат 1: "N 2136" / "N 1898" в тексте → innerId 2136, 1898.
     * Формат 2: "Договор ... M-Construction 2013 ..." → 2013 — номер заявки (innerId или id_purchase_request).
     */
    private void linkPurchaseRequestFromComment(Payment payment, String comment) {
        if (comment == null || comment.isEmpty()) return;
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
        if (innerId == null || innerId.isEmpty()) return;
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
