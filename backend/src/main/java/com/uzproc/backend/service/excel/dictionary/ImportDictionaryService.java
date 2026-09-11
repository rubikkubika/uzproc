package com.uzproc.backend.service.excel.dictionary;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

/**
 * Загружает справочники для загрузчиков Excel: вместо запросов на каждую строку файла загрузчик
 * один раз берёт снимок нужных справочников (id и ключи поиска, без сущностей) и ищет связи в памяти.
 * Снимок берётся перед каждым загрузчиком, поэтому видит всё, что создали загрузчики, отработавшие раньше.
 */
@Service
public class ImportDictionaryService {

    private static final Logger logger = LoggerFactory.getLogger(ImportDictionaryService.class);

    public enum Kind { CONTRACTS, PURCHASE_REQUESTS, SUPPLIERS, USERS, CFOS }

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(readOnly = true)
    public ImportDictionaries load(Set<Kind> kinds) {
        long start = System.currentTimeMillis();
        ImportDictionaries dictionaries = new ImportDictionaries(
                kinds.contains(Kind.CONTRACTS) ? loadContracts() : null,
                kinds.contains(Kind.PURCHASE_REQUESTS) ? loadPurchaseRequests() : null,
                kinds.contains(Kind.SUPPLIERS) ? loadSuppliers() : null,
                kinds.contains(Kind.USERS) ? loadUsers() : null,
                kinds.contains(Kind.CFOS) ? loadCfos() : null);
        logger.info("Import dictionaries loaded in {} ms: {}", System.currentTimeMillis() - start, dictionaries.summary());
        return dictionaries;
    }

    private ContractDictionary loadContracts() {
        // Нормализованный заголовок — тем же выражением, что в ContractRepository.findFirstByNormalizedTitle
        List<Object[]> rows = rows("SELECT id, title, LOWER(TRIM(REGEXP_REPLACE(title, '\\s+', ' ', 'g'))), name, purchase_request_id "
                + "FROM contracts ORDER BY id");
        ContractDictionary dictionary = new ContractDictionary(rows.size());
        for (Object[] r : rows) {
            dictionary.add(toLong(r[0]), str(r[1]), str(r[2]), str(r[3]), toLongOrNull(r[4]));
        }
        return dictionary;
    }

    private PurchaseRequestDictionary loadPurchaseRequests() {
        List<Object[]> rows = rows("SELECT id, inner_id, id_purchase_request FROM purchase_requests ORDER BY id");
        PurchaseRequestDictionary dictionary = new PurchaseRequestDictionary(rows.size());
        for (Object[] r : rows) {
            dictionary.add(toLong(r[0]), str(r[1]), toLongOrNull(r[2]));
        }
        return dictionary;
    }

    private SupplierDictionary loadSuppliers() {
        List<Object[]> rows = rows("SELECT id, inn, code, name, UPPER(name), type, kpp FROM suppliers ORDER BY id");
        SupplierDictionary dictionary = new SupplierDictionary(rows.size());
        for (Object[] r : rows) {
            dictionary.load(new SupplierDictionary.SupplierRef(toLong(r[0]), str(r[1]), str(r[2]), str(r[3]), str(r[5]), str(r[6])), str(r[4]));
        }
        return dictionary;
    }

    private UserDictionary loadUsers() {
        List<Object[]> rows = rows("SELECT id, surname, name, username, department, position FROM users ORDER BY id");
        UserDictionary dictionary = new UserDictionary(rows.size());
        for (Object[] r : rows) {
            dictionary.load(new UserDictionary.UserRef(toLong(r[0]), str(r[1]), str(r[2]), str(r[3]), str(r[4]), str(r[5])));
        }
        return dictionary;
    }

    private CfoDictionary loadCfos() {
        List<Object[]> rows = rows("SELECT id, name, UPPER(name) FROM cfo ORDER BY id");
        CfoDictionary dictionary = new CfoDictionary(rows.size());
        for (Object[] r : rows) {
            dictionary.load(new CfoDictionary.CfoRef(toLong(r[0]), str(r[1])), str(r[2]));
        }
        return dictionary;
    }

    @SuppressWarnings("unchecked")
    private List<Object[]> rows(String sql) {
        return entityManager.createNativeQuery(sql).getResultList();
    }

    private static long toLong(Object value) {
        return ((Number) value).longValue();
    }

    private static Long toLongOrNull(Object value) {
        return value == null ? null : ((Number) value).longValue();
    }

    private static String str(Object value) {
        return value == null ? null : value.toString();
    }
}
