package com.uzproc.backend.service.contract;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Лёгкое представление одной строки согласования договора из Excel.
 * Парсится без обращений к БД: contractId и cfoId резолвятся из предзагруженных кэшей в памяти,
 * исполнитель (executorId) проставляется отдельной фазой резолва пользователей.
 * Это позволяет сохранять согласования батчами (см. {@link ContractApprovalBatchSaver})
 * вместо медленного построчного save() в одной гигантской транзакции.
 */
public class ContractApprovalRowData {

    public Long contractId;
    public Long cfoId;
    public UUID guid;
    public String documentForm;
    public String stage;
    public String role;

    /** Сырые данные исполнителя из Excel; в Long-id превращаются в фазе резолва пользователей. */
    public String executorFullName;
    public String executorEmail;
    public Long executorId;

    public LocalDateTime assignmentDate;
    public LocalDateTime plannedCompletionDate;
    public LocalDateTime completionDate;
    public String completionResult;
    public String commentText;
    public Boolean isWaiting;

    /** Номер строки в Excel (1-based) — для диагностики при пропуске. */
    public int excelRowNum;

    /**
     * Ключ исполнителя для кэша «человек → userId».
     * Детерминирован по ФИО + email (как в исходной логике поиска/создания пользователя).
     * Возвращает null, если данных исполнителя нет.
     */
    public String executorKey() {
        boolean hasName = executorFullName != null && !executorFullName.trim().isEmpty();
        boolean hasEmail = executorEmail != null && !executorEmail.trim().isEmpty();
        if (!hasName && !hasEmail) {
            return null;
        }
        String namePart = hasName ? executorFullName.trim().toLowerCase() : "";
        String emailPart = hasEmail ? executorEmail.trim().toLowerCase() : "";
        return namePart + "" + emailPart;
    }
}
