package com.uzproc.backend.service.excel.dictionary;

import java.util.HashMap;
import java.util.Map;
import java.util.function.ToLongFunction;

/**
 * Индекс справочника «ключ → запись» с учётом порций. Записи, созданные или изменённые в текущей порции,
 * лежат отдельно (pending) и видны сразу, а в основной индекс попадают только после коммита порции.
 * При откате порции pending выбрасывается — в справочнике не остаётся id записей, которых нет в БД.
 * Если один ключ у нескольких записей, остаётся запись с меньшим id (снимок грузится по возрастанию id).
 */
final class StagedIndex<V> {

    private final Map<String, V> committed;
    private final Map<String, V> pending = new HashMap<>();
    private final ToLongFunction<V> idOf;

    StagedIndex(int expectedSize, ToLongFunction<V> idOf) {
        this.committed = new HashMap<>(capacity(expectedSize));
        this.idOf = idOf;
    }

    V get(String key) {
        if (key == null) return null;
        V value = pending.get(key);
        return value != null ? value : committed.get(key);
    }

    /** Запись из снимка БД; при повторе ключа остаётся первая (с меньшим id). */
    void loadCommitted(String key, V value) {
        if (key != null && !key.isEmpty()) {
            committed.putIfAbsent(key, value);
        }
    }

    /** Запись, которая уже есть в БД (найдена запросом при промахе справочника). */
    void putCommitted(String key, V value) {
        if (canPut(key, value)) {
            committed.put(key, value);
        }
    }

    /** Запись, созданная или изменённая в текущей порции. */
    void stage(String key, V value) {
        if (canPut(key, value)) {
            pending.put(key, value);
        }
    }

    void commit() {
        committed.putAll(pending);
        pending.clear();
    }

    void discard() {
        pending.clear();
    }

    int size() {
        return committed.size();
    }

    static int capacity(int expectedSize) {
        return Math.max(16, (int) (expectedSize / 0.75f) + 1);
    }

    /** Ключ свободен или уже указывает на эту же запись (например, обновлённую). */
    private boolean canPut(String key, V value) {
        if (key == null || key.isEmpty()) return false;
        V current = get(key);
        return current == null || idOf.applyAsLong(current) == idOf.applyAsLong(value);
    }
}
