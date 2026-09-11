package com.uzproc.backend.service.excel.dictionary;

import java.util.Locale;

/**
 * Справочник ЦФО для «найти или создать» при загрузке Excel. ЦФО пополняют несколько загрузчиков,
 * поэтому при промахе загрузчик проверяет БД, а созданные в порции записи попадают в справочник после её коммита.
 */
public final class CfoDictionary {

    public record CfoRef(long id, String name) {
    }

    private final StagedIndex<CfoRef> byUpperName;

    CfoDictionary(int expectedSize) {
        this.byUpperName = new StagedIndex<>(expectedSize, CfoRef::id);
    }

    /** Строка снимка БД; upperName посчитан в SQL (UPPER(name)) — как в findByNameIgnoreCase. */
    void load(CfoRef ref, String upperName) {
        byUpperName.loadCommitted(upperName, ref);
    }

    /** Как findByNameIgnoreCase. */
    public CfoRef byName(String name) {
        return byUpperName.get(upper(name));
    }

    /** ЦФО уже есть в БД (найден запросом при промахе справочника). */
    public void putExisting(CfoRef ref) {
        byUpperName.putCommitted(upper(ref.name()), ref);
    }

    /** ЦФО создан в текущей порции. */
    public void stage(CfoRef ref) {
        byUpperName.stage(upper(ref.name()), ref);
    }

    void commit() {
        byUpperName.commit();
    }

    void discard() {
        byUpperName.discard();
    }

    public int size() {
        return byUpperName.size();
    }

    private static String upper(String value) {
        return value == null ? null : value.toUpperCase(Locale.ROOT);
    }
}
