package com.uzproc.backend.dto.contract;

import java.time.LocalDateTime;

/**
 * Строка дашборда SLA договоров: подписанный документ с фактом, планом и отклонением по каждому этапу.
 * Отклонение = план − факт: минус — просрочка, плюс — запас.
 */
public record ContractSlaRowDto(
        Long id,
        String innerId,
        String name,
        String documentForm,
        Boolean isTypicalForm,
        String cfo,
        String preparedBy,
        Long purchaseRequestSystemId,
        Long purchaseRequestInnerId,
        /** Дата подписания: дата регистрации (для спецификаций — синхронизации). */
        LocalDateTime signingDate,
        Integer preparationWorkingDays,
        Integer plannedPreparationSlaDays,
        Integer preparationSlaDelta,
        Integer approvalWorkingDays,
        Integer plannedApprovalSlaDays,
        Integer approvalSlaDelta,
        Integer signingWorkingDays,
        Integer plannedSigningSlaDays,
        Integer signingSlaDelta,
        /** Суммарный факт по этапам с заданным плановым сроком (рабочих дней). */
        Integer totalWorkingDays,
        /** Суммарный плановый срок по этапам с заданным планом (рабочих дней). */
        Integer totalPlannedSlaDays,
        /** true — хотя бы один этап просрочен (отклонение < 0). */
        boolean slaViolated
) {
}
