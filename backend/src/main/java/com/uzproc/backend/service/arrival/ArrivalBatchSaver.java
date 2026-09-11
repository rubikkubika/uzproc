package com.uzproc.backend.service.arrival;

import com.uzproc.backend.entity.arrival.Arrival;
import com.uzproc.backend.entity.arrival.ArrivalCurrency;
import com.uzproc.backend.entity.supplier.Supplier;
import com.uzproc.backend.entity.user.User;
import com.uzproc.backend.repository.arrival.ArrivalRepository;
import com.uzproc.backend.repository.supplier.SupplierRepository;
import com.uzproc.backend.service.excel.dictionary.ImportDictionaries;
import com.uzproc.backend.service.excel.dictionary.ImportUserResolver;
import com.uzproc.backend.service.excel.dictionary.SupplierDictionary;
import com.uzproc.backend.service.excel.dictionary.SupplierDictionary.SupplierRef;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Сохраняет батч arrival-строк в отдельной транзакции.
 * Если батч падает — остальные батчи продолжают обрабатываться.
 * Поставщики и ответственные ищутся по справочникам загрузки ({@link ImportDictionaries}),
 * существующие поступления батча — одним запросом по номерам.
 */
@Service
public class ArrivalBatchSaver {

    private static final Logger logger = LoggerFactory.getLogger(ArrivalBatchSaver.class);

    private final ArrivalRepository arrivalRepository;
    private final SupplierRepository supplierRepository;
    private final ImportUserResolver userResolver;

    @PersistenceContext
    private EntityManager entityManager;

    public ArrivalBatchSaver(ArrivalRepository arrivalRepository,
                             SupplierRepository supplierRepository,
                             ImportUserResolver userResolver) {
        this.arrivalRepository = arrivalRepository;
        this.supplierRepository = supplierRepository;
        this.userResolver = userResolver;
    }

    /**
     * Быстрый путь: сохраняет весь батч в одной транзакции.
     * При любой ошибке исключение пробрасывается, транзакция (REQUIRES_NEW) откатывается целиком,
     * а вызывающий код повторяет батч построчно через {@link #saveRowIsolated}.
     * Здесь НЕТ построчного try/catch — иначе первая же ошибка портит Hibernate-сессию
     * и все последующие строки в батче падают с "don't flush the Session".
     * @return количество сохранённых/обновлённых записей
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int saveBatch(List<ArrivalRowData> batch, ImportDictionaries dictionaries) {
        // Существующие поступления батча — одним запросом вместо запроса на каждую строку
        Map<String, Arrival> existingByNumber = new HashMap<>();
        for (Arrival arrival : arrivalRepository.findByNumberIn(batch.stream().map(data -> data.number).toList())) {
            existingByNumber.putIfAbsent(arrival.getNumber(), arrival);
        }
        int saved = 0;
        for (ArrivalRowData data : batch) {
            if (saveRow(data, existingByNumber.get(data.number), dictionaries)) {
                saved++;
            }
        }
        entityManager.flush();
        entityManager.clear();
        return saved;
    }

    /**
     * Медленный путь (fallback): сохраняет одну строку в собственной транзакции.
     * Вызывается из {@link com.uzproc.backend.service.arrival.ArrivalExcelLoadService}
     * (через прокси, поэтому REQUIRES_NEW честно открывает новую транзакцию),
     * когда быстрый батч упал. Ошибка одной строки откатывает только её,
     * остальные строки батча сохраняются.
     * @return 1 если строка сохранена/обновлена, иначе 0
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int saveRowIsolated(ArrivalRowData data, ImportDictionaries dictionaries) {
        Arrival existing = arrivalRepository.findFirstByNumber(data.number).orElse(null);
        int saved = saveRow(data, existing, dictionaries) ? 1 : 0;
        entityManager.flush();
        entityManager.clear();
        return saved;
    }

    private boolean saveRow(ArrivalRowData data, Arrival existing, ImportDictionaries dictionaries) {
        Arrival arrival = new Arrival();

        if (data.date != null) arrival.setDate(data.date);
        arrival.setNumber(data.number);
        if (data.invoice != null) arrival.setInvoice(data.invoice);
        if (data.warehouse != null) arrival.setWarehouse(data.warehouse);
        if (data.operationType != null) arrival.setOperationType(data.operationType);
        if (data.department != null) arrival.setDepartment(data.department);
        if (data.incomingDate != null) arrival.setIncomingDate(data.incomingDate);
        if (data.incomingNumber != null) arrival.setIncomingNumber(data.incomingNumber);
        if (data.amount != null) arrival.setAmount(data.amount);
        if (data.currency != null) {
            ArrivalCurrency cur = ArrivalCurrency.fromString(data.currency);
            if (cur != null) arrival.setCurrency(cur);
        }
        if (data.comment != null) arrival.setComment(data.comment);

        // Поставщик по ИНН
        if (data.inn != null && !data.inn.isEmpty()) {
            arrival.setSupplier(findOrCreateSupplier(data.inn, dictionaries.suppliers()));
        }

        // Ответственный
        if (data.responsible != null && !data.responsible.isEmpty()) {
            User user = userResolver.findOrCreate(data.responsible, dictionaries.users());
            if (user != null) arrival.setResponsible(user);
        }

        // Дедупликация по номеру
        if (existing != null) {
            boolean updated = updateArrivalFields(existing, arrival);
            if (updated) {
                arrivalRepository.save(existing);
                return true;
            }
            return false;
        } else {
            arrivalRepository.save(arrival);
            return true;
        }
    }

    /**
     * Находит существующего поставщика или создаёт нового.
     * Ищем сначала по ИНН, затем по {@code code} — у поставщика на колонке {@code code}
     * висит УНИКАЛЬНЫЙ индекс (idx_suppliers_code), а новый поставщик создаётся с {@code code = inn}.
     * Раньше поиск шёл только по {@code inn}: если поставщик с таким {@code code} уже существовал,
     * но с другим/пустым {@code inn}, вставлялся дубликат {@code code} → duplicate key,
     * что портило весь батч. Поиск по {@code code} устраняет причину в корне.
     * Поиск идёт по справочнику; при промахе проверяется БД (поставщика мог создать другой загрузчик).
     */
    private Supplier findOrCreateSupplier(String inn, SupplierDictionary suppliers) {
        SupplierRef ref = suppliers.byInn(inn);
        if (ref == null) {
            ref = suppliers.byCode(inn);
        }
        if (ref == null) {
            Supplier fromDb = supplierRepository.findFirstByInn(inn).orElse(null);
            if (fromDb == null) {
                fromDb = supplierRepository.findByCode(inn).orElse(null);
            }
            if (fromDb != null) {
                ref = SupplierRef.of(fromDb);
                suppliers.putExisting(ref);
            }
        }
        if (ref != null) {
            return entityManager.getReference(Supplier.class, ref.id());
        }
        Supplier supplier = new Supplier(inn); // code = inn
        supplier.setInn(inn);
        supplier.setName(inn);
        supplier = supplierRepository.save(supplier);
        suppliers.stage(SupplierRef.of(supplier));
        logger.debug("Created supplier with INN/code={}", inn);
        return supplier;
    }

    private boolean updateArrivalFields(Arrival existing, Arrival newData) {
        boolean updated = false;
        if (newData.getDate() != null && !newData.getDate().equals(existing.getDate())) {
            existing.setDate(newData.getDate()); updated = true;
        }
        if (newData.getSupplier() != null && (existing.getSupplier() == null || !newData.getSupplier().getId().equals(existing.getSupplier().getId()))) {
            existing.setSupplier(newData.getSupplier()); updated = true;
        }
        if (newData.getInvoice() != null && !newData.getInvoice().equals(existing.getInvoice())) {
            existing.setInvoice(newData.getInvoice()); updated = true;
        }
        if (newData.getWarehouse() != null && !newData.getWarehouse().equals(existing.getWarehouse())) {
            existing.setWarehouse(newData.getWarehouse()); updated = true;
        }
        if (newData.getOperationType() != null && !newData.getOperationType().equals(existing.getOperationType())) {
            existing.setOperationType(newData.getOperationType()); updated = true;
        }
        if (newData.getDepartment() != null && !newData.getDepartment().equals(existing.getDepartment())) {
            existing.setDepartment(newData.getDepartment()); updated = true;
        }
        if (newData.getIncomingDate() != null && !newData.getIncomingDate().equals(existing.getIncomingDate())) {
            existing.setIncomingDate(newData.getIncomingDate()); updated = true;
        }
        if (newData.getIncomingNumber() != null && !newData.getIncomingNumber().equals(existing.getIncomingNumber())) {
            existing.setIncomingNumber(newData.getIncomingNumber()); updated = true;
        }
        if (newData.getAmount() != null && (existing.getAmount() == null || newData.getAmount().compareTo(existing.getAmount()) != 0)) {
            existing.setAmount(newData.getAmount()); updated = true;
        }
        if (newData.getCurrency() != null && !newData.getCurrency().equals(existing.getCurrency())) {
            existing.setCurrency(newData.getCurrency()); updated = true;
        }
        if (newData.getComment() != null && !newData.getComment().equals(existing.getComment())) {
            existing.setComment(newData.getComment()); updated = true;
        }
        if (newData.getResponsible() != null && (existing.getResponsible() == null || !newData.getResponsible().getId().equals(existing.getResponsible().getId()))) {
            existing.setResponsible(newData.getResponsible()); updated = true;
        }
        return updated;
    }
}
