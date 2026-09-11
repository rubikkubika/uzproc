package com.uzproc.backend.service.excel;

import com.uzproc.backend.service.excel.dictionary.ImportDictionaries;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.Function;
import java.util.function.Predicate;

/**
 * Сохраняет порцию строк загрузки Excel: быстрый путь — вся порция одной транзакцией
 * ({@link ImportBatchSaver#saveBatch}); при сбое (например, одна строка испортила сессию) порция
 * повторяется построчно — теряется только плохая строка. Записи справочников, созданные в порции,
 * остаются в справочниках, только если порция (или строка) сохранилась.
 */
@Component
public class ImportBatchRunner {

    private static final Logger logger = LoggerFactory.getLogger(ImportBatchRunner.class);

    private final ImportBatchSaver batchSaver;

    public ImportBatchRunner(ImportBatchSaver batchSaver) {
        this.batchSaver = batchSaver;
    }

    /**
     * @param logPrefix    префикс для лога («Payments», «Suppliers»)
     * @param dictionaries справочники загрузки или null, если загрузчик их не пополняет
     * @param rowLabel     как назвать строку в логе при её пропуске (обычно номер строки Excel)
     * @return сколько строк создали или обновили запись
     */
    public <T> int save(String logPrefix, List<T> batch, Predicate<T> rowSaver,
                        ImportDictionaries dictionaries, Function<T, String> rowLabel) {
        if (batch.isEmpty()) return 0;
        try {
            int saved = batchSaver.saveBatch(batch, rowSaver);
            commit(dictionaries);
            return saved;
        } catch (Exception e) {
            discard(dictionaries);
            logger.warn("{}: batch save failed ({}), retrying row-by-row for {} rows", logPrefix, e.getMessage(), batch.size());
        }
        int saved = 0;
        for (T row : batch) {
            try {
                saved += batchSaver.saveRowIsolated(row, rowSaver);
                commit(dictionaries);
            } catch (Exception e) {
                discard(dictionaries);
                logger.warn("{}: skipping row {}: {}", logPrefix, rowLabel.apply(row), e.getMessage());
            }
        }
        return saved;
    }

    private static void commit(ImportDictionaries dictionaries) {
        if (dictionaries != null) dictionaries.commit();
    }

    private static void discard(ImportDictionaries dictionaries) {
        if (dictionaries != null) dictionaries.discard();
    }
}
