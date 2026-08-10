package com.uzproc.backend.service.contract;

/**
 * Плановые сроки (SLA) этапов договорного документа в рабочих днях.
 * День начала этапа не считается — отсчёт идёт со следующего рабочего дня.
 *
 * <p>Матрица сроков (подготовка / согласование / подписание):
 * <ul>
 *   <li>Договор типовой (внедрённый шаблон): 2 / 3 / 2;</li>
 *   <li>Договор нетиповой: 4 / 5 / 2 (импортный пока считается как нетиповой);</li>
 *   <li>Дополнительное соглашение: 2 (типовое) или 4 (нетиповое) / 5 / 2;</li>
 *   <li>Спецификация типовая (позиции из прайс-листа): 1 / 1 / 1;</li>
 *   <li>Спецификация нетиповая: 3 / 1 / 1.</li>
 * </ul>
 *
 * <p>Согласование с контрагентом (КА) идёт до запуска согласования в 1С ДО, поэтому учтено
 * в сроке подготовки; срок этапа «Согласование» — это согласование в 1С ДО.
 * Для остальных форм документа плановые сроки не заданы (null) — отклонение не рассчитывается.
 */
public final class ContractSlaPlan {

    private static final String FORM_CONTRACT = "Договор";
    private static final String FORM_ADDITIONAL_AGREEMENT = "Дополнительное соглашение";
    private static final String FORM_SPECIFICATION = "Спецификация";

    private ContractSlaPlan() {
    }

    /** Плановый SLA этапа «Подготовка» (подготовка документа и согласование с КА). */
    public static Integer preparationDays(String documentForm, Boolean isTypicalForm) {
        String form = normalizeForm(documentForm);
        if (form == null) return null;
        boolean typical = Boolean.TRUE.equals(isTypicalForm);
        return switch (form) {
            case FORM_CONTRACT, FORM_ADDITIONAL_AGREEMENT -> typical ? 2 : 4;
            case FORM_SPECIFICATION -> typical ? 1 : 3;
            default -> null;
        };
    }

    /** Плановый SLA этапа «Согласование» (согласование в 1С ДО). */
    public static Integer approvalDays(String documentForm, Boolean isTypicalForm) {
        String form = normalizeForm(documentForm);
        if (form == null) return null;
        boolean typical = Boolean.TRUE.equals(isTypicalForm);
        return switch (form) {
            case FORM_CONTRACT -> typical ? 3 : 5;
            case FORM_ADDITIONAL_AGREEMENT -> 5;
            case FORM_SPECIFICATION -> 1;
            default -> null;
        };
    }

    /** Плановый SLA этапа «Подписание» (подписание в 1С ДО: регистрация, для спецификаций — синхронизация). */
    public static Integer signingDays(String documentForm) {
        String form = normalizeForm(documentForm);
        if (form == null) return null;
        return switch (form) {
            case FORM_CONTRACT, FORM_ADDITIONAL_AGREEMENT -> 2;
            case FORM_SPECIFICATION -> 1;
            default -> null;
        };
    }

    private static String normalizeForm(String documentForm) {
        if (documentForm == null || documentForm.trim().isEmpty()) {
            return null;
        }
        return documentForm.trim();
    }
}
