package com.uzproc.backend.service.excel.dictionary;

import java.util.StringJoiner;

/**
 * Снимок справочников на время загрузки одного файла ({@link ImportDictionaryService#load}).
 * Загрузчик, сохраняющий порциями, после каждой порции вызывает {@link #commit()} (порция сохранена —
 * созданные в ней записи становятся частью справочников) или {@link #discard()} (порция откатилась).
 */
public final class ImportDictionaries {

    private final ContractDictionary contracts;
    private final PurchaseRequestDictionary purchaseRequests;
    private final SupplierDictionary suppliers;
    private final UserDictionary users;
    private final CfoDictionary cfos;

    ImportDictionaries(ContractDictionary contracts, PurchaseRequestDictionary purchaseRequests,
                       SupplierDictionary suppliers, UserDictionary users, CfoDictionary cfos) {
        this.contracts = contracts;
        this.purchaseRequests = purchaseRequests;
        this.suppliers = suppliers;
        this.users = users;
        this.cfos = cfos;
    }

    public ContractDictionary contracts() {
        return require(contracts, "contracts");
    }

    public PurchaseRequestDictionary purchaseRequests() {
        return require(purchaseRequests, "purchaseRequests");
    }

    public SupplierDictionary suppliers() {
        return require(suppliers, "suppliers");
    }

    public UserDictionary users() {
        return require(users, "users");
    }

    public CfoDictionary cfos() {
        return require(cfos, "cfos");
    }

    /** Порция сохранена: созданные и изменённые в ней записи переходят в справочники. */
    public void commit() {
        if (suppliers != null) suppliers.commit();
        if (users != null) users.commit();
        if (cfos != null) cfos.commit();
    }

    /** Порция откатилась: созданные в ней записи выбрасываются из справочников. */
    public void discard() {
        if (suppliers != null) suppliers.discard();
        if (users != null) users.discard();
        if (cfos != null) cfos.discard();
    }

    /** Размеры загруженных справочников — для лога. */
    public String summary() {
        StringJoiner joiner = new StringJoiner(", ");
        if (contracts != null) joiner.add("contracts=" + contracts.size());
        if (purchaseRequests != null) joiner.add("purchaseRequests=" + purchaseRequests.size());
        if (suppliers != null) joiner.add("suppliers=" + suppliers.size());
        if (users != null) joiner.add("users=" + users.size());
        if (cfos != null) joiner.add("cfo=" + cfos.size());
        return joiner.toString();
    }

    private static <T> T require(T dictionary, String name) {
        if (dictionary == null) {
            throw new IllegalStateException("Import dictionary '" + name + "' is not loaded");
        }
        return dictionary;
    }
}
