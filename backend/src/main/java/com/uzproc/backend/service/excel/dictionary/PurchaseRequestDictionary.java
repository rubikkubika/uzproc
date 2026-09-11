package com.uzproc.backend.service.excel.dictionary;

import java.util.HashMap;
import java.util.Map;

/**
 * Справочник заявок на закупку для сопоставления при загрузке Excel. Только чтение: заявки создаёт загрузка
 * docs.xlsx, которая идёт раньше остальных. Если ключ совпадает у нескольких заявок, берётся заявка с меньшим id.
 */
public final class PurchaseRequestDictionary {

    /** Заявка: id и номер заявки (id_purchase_request), по которому с ней связаны договоры. */
    public record PurchaseRequestRef(long id, Long idPurchaseRequest) {
    }

    private final Map<String, PurchaseRequestRef> byInnerId;
    private final Map<Long, PurchaseRequestRef> byIdPurchaseRequest;
    private int size;

    PurchaseRequestDictionary(int expectedSize) {
        int capacity = StagedIndex.capacity(expectedSize);
        this.byInnerId = new HashMap<>(capacity);
        this.byIdPurchaseRequest = new HashMap<>(capacity);
    }

    void add(long id, String innerId, Long idPurchaseRequest) {
        PurchaseRequestRef ref = new PurchaseRequestRef(id, idPurchaseRequest);
        if (innerId != null) byInnerId.putIfAbsent(innerId, ref);
        if (idPurchaseRequest != null) byIdPurchaseRequest.putIfAbsent(idPurchaseRequest, ref);
        size++;
    }

    /** Как findByInnerId. */
    public PurchaseRequestRef byInnerId(String innerId) {
        return innerId == null ? null : byInnerId.get(innerId);
    }

    /** Как findByIdPurchaseRequest. */
    public PurchaseRequestRef byIdPurchaseRequest(Long idPurchaseRequest) {
        return idPurchaseRequest == null ? null : byIdPurchaseRequest.get(idPurchaseRequest);
    }

    public int size() {
        return size;
    }
}
