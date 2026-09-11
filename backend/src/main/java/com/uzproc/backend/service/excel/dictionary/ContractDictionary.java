package com.uzproc.backend.service.excel.dictionary;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Справочник договоров для сопоставления при загрузке Excel. Только чтение: договоры создаёт загрузка docs.xlsx,
 * которая идёт раньше остальных, поэтому промах означает, что такого договора в БД нет, — повторно в БД не ищем.
 * Если ключ совпадает у нескольких договоров, берётся договор с меньшим id.
 */
public final class ContractDictionary {

    /** Договор: id и поля, по которым его сопоставляют. */
    public record ContractRef(long id, String title, String name) {
    }

    private final Map<String, ContractRef> byTitle;
    private final Map<String, ContractRef> byNormalizedTitle;
    private final Map<String, ContractRef> byName;
    private final Map<Long, List<ContractRef>> byPurchaseRequestId = new HashMap<>();
    private int size;

    ContractDictionary(int expectedSize) {
        int capacity = StagedIndex.capacity(expectedSize);
        this.byTitle = new HashMap<>(capacity);
        this.byNormalizedTitle = new HashMap<>(capacity);
        this.byName = new HashMap<>(capacity);
    }

    /** Строка снимка БД (по возрастанию id); normalizedTitleLower посчитан в SQL тем же выражением, что и в запросе. */
    void add(long id, String title, String normalizedTitleLower, String name, Long purchaseRequestId) {
        ContractRef ref = new ContractRef(id, title, name);
        if (title != null) byTitle.putIfAbsent(title, ref);
        if (normalizedTitleLower != null) byNormalizedTitle.putIfAbsent(normalizedTitleLower, ref);
        if (name != null) byName.putIfAbsent(name, ref);
        if (purchaseRequestId != null) {
            byPurchaseRequestId.computeIfAbsent(purchaseRequestId, k -> new ArrayList<>(2)).add(ref);
        }
        size++;
    }

    /** Точное совпадение title — как findFirstByTitle. */
    public ContractRef byTitle(String title) {
        return title == null ? null : byTitle.get(title);
    }

    /**
     * Совпадение по нормализованному title — как findFirstByNormalizedTitle:
     * LOWER(TRIM(REGEXP_REPLACE(title, '\s+', ' ', 'g'))) = LOWER(:normalizedTitle).
     */
    public ContractRef byNormalizedTitle(String normalizedTitle) {
        return normalizedTitle == null ? null : byNormalizedTitle.get(normalizedTitle.toLowerCase(Locale.ROOT));
    }

    /** Точное совпадение name — как findByName. */
    public ContractRef byName(String name) {
        return name == null ? null : byName.get(name);
    }

    /** Договоры заявки: contracts.purchase_request_id хранит номер заявки (id_purchase_request); по возрастанию id. */
    public List<ContractRef> byPurchaseRequestId(Long idPurchaseRequest) {
        if (idPurchaseRequest == null) return List.of();
        return byPurchaseRequestId.getOrDefault(idPurchaseRequest, List.of());
    }

    public int size() {
        return size;
    }
}
