package com.uzproc.backend.service.excel;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.function.Predicate;

/**
 * Сохраняет порцию строк загрузки Excel в отдельной транзакции (REQUIRES_NEW) с flush/clear в конце —
 * сессия Hibernate не разрастается на весь файл (как ArrivalBatchSaver и ContractApprovalBatchSaver).
 * Обработка строки передаётся функцией; отдельный бин нужен, чтобы REQUIRES_NEW шёл через прокси
 * и каждая порция коммитилась независимо. Порции с построчным повтором при сбое — {@link ImportBatchRunner}.
 */
@Service
public class ImportBatchSaver {

    @PersistenceContext
    private EntityManager entityManager;

    /**
     * Быстрый путь: вся порция в одной транзакции. Построчного try/catch здесь нет: первая же ошибка
     * портит сессию, поэтому исключение откатывает порцию, а вызывающий код повторяет её построчно.
     *
     * @return сколько строк создали или обновили запись
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public <T> int saveBatch(List<T> batch, Predicate<T> rowSaver) {
        int saved = 0;
        for (T row : batch) {
            if (rowSaver.test(row)) {
                saved++;
            }
        }
        entityManager.flush();
        entityManager.clear();
        return saved;
    }

    /**
     * Медленный путь (fallback): одна строка в собственной транзакции — ошибка откатывает только её.
     *
     * @return 1 если запись создана или обновлена, иначе 0
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public <T> int saveRowIsolated(T row, Predicate<T> rowSaver) {
        int saved = rowSaver.test(row) ? 1 : 0;
        entityManager.flush();
        entityManager.clear();
        return saved;
    }
}
