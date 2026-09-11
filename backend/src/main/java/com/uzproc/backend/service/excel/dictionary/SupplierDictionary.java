package com.uzproc.backend.service.excel.dictionary;

import com.uzproc.backend.entity.supplier.Supplier;

import java.util.Locale;

/**
 * Справочник поставщиков для «найти или создать» при загрузке Excel. Поставщиков пополняют несколько загрузчиков,
 * поэтому справочник только ускоряет поиск: при промахе загрузчик проверяет БД, а созданные в порции записи
 * попадают в справочник после её коммита.
 */
public final class SupplierDictionary {

    /** Поставщик: id, ключи поиска и поля, которые загрузки сравнивают и дозаполняют. */
    public record SupplierRef(long id, String inn, String code, String name, String type, String kpp) {
        public static SupplierRef of(Supplier supplier) {
            return new SupplierRef(supplier.getId(), supplier.getInn(), supplier.getCode(), supplier.getName(),
                    supplier.getType(), supplier.getKpp());
        }
    }

    private final StagedIndex<SupplierRef> byInn;
    private final StagedIndex<SupplierRef> byCode;
    private final StagedIndex<SupplierRef> byUpperName;

    SupplierDictionary(int expectedSize) {
        this.byInn = new StagedIndex<>(expectedSize, SupplierRef::id);
        this.byCode = new StagedIndex<>(expectedSize, SupplierRef::id);
        this.byUpperName = new StagedIndex<>(expectedSize, SupplierRef::id);
    }

    /** Строка снимка БД; upperName посчитан в SQL (UPPER(name)) — как в findFirstByNameIgnoreCase. */
    void load(SupplierRef ref, String upperName) {
        byInn.loadCommitted(ref.inn(), ref);
        byCode.loadCommitted(ref.code(), ref);
        byUpperName.loadCommitted(upperName, ref);
    }

    /** Как findFirstByInn. */
    public SupplierRef byInn(String inn) {
        return byInn.get(inn);
    }

    /** Как findByCode. */
    public SupplierRef byCode(String code) {
        return byCode.get(code);
    }

    /** Как findFirstByNameIgnoreCase. */
    public SupplierRef byName(String name) {
        return byUpperName.get(upper(name));
    }

    /** Поставщик уже есть в БД (найден запросом при промахе справочника). */
    public void putExisting(SupplierRef ref) {
        byInn.putCommitted(ref.inn(), ref);
        byCode.putCommitted(ref.code(), ref);
        byUpperName.putCommitted(upper(ref.name()), ref);
    }

    /** Поставщик создан или изменён в текущей порции. */
    public void stage(SupplierRef ref) {
        byInn.stage(ref.inn(), ref);
        byCode.stage(ref.code(), ref);
        byUpperName.stage(upper(ref.name()), ref);
    }

    void commit() {
        byInn.commit();
        byCode.commit();
        byUpperName.commit();
    }

    void discard() {
        byInn.discard();
        byCode.discard();
        byUpperName.discard();
    }

    public int size() {
        return byCode.size();
    }

    private static String upper(String value) {
        return value == null ? null : value.toUpperCase(Locale.ROOT);
    }
}
