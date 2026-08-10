/**
 * Типы дашборда «SLA договоров» (/api/overview/contract-sla).
 * Отклонение = план − факт: минус — просрочка, плюс — запас.
 */

/** Строка дашборда: подписанный документ с планом, фактом и отклонением по каждому этапу. */
export interface ContractSlaRow {
  id: number;
  innerId: string | null;
  name: string | null;
  documentForm: string | null;
  isTypicalForm: boolean | null;
  cfo: string | null;
  preparedBy: string | null;
  purchaseRequestSystemId: number | null;
  purchaseRequestInnerId: number | null;
  /** Дата подписания: регистрация (для спецификаций — синхронизация). */
  signingDate: string | null;
  preparationWorkingDays: number | null;
  plannedPreparationSlaDays: number | null;
  preparationSlaDelta: number | null;
  approvalWorkingDays: number | null;
  plannedApprovalSlaDays: number | null;
  approvalSlaDelta: number | null;
  signingWorkingDays: number | null;
  plannedSigningSlaDays: number | null;
  signingSlaDelta: number | null;
  totalWorkingDays: number | null;
  totalPlannedSlaDays: number | null;
  slaViolated: boolean;
}

/** Выполнение SLA по месяцу подписания. */
export interface ContractSlaMonth {
  month: number;
  totalSigned: number;
  metSla: number;
  percentage: number | null;
}

/** Выполнение SLA за год по договорному специалисту. */
export interface ContractSlaByPreparer {
  preparedBy: string;
  totalSigned: number;
  metSla: number;
  percentage: number | null;
}

/** Ответ API дашборда «SLA договоров». */
export interface ContractSlaData {
  year: number;
  currentMonth: number;
  slaByMonth: ContractSlaMonth[];
  slaByPreparer: ContractSlaByPreparer[];
  totalSigned: number;
  metSla: number;
  averagePercentage: number | null;
  documentsWithViolation: ContractSlaRow[];
  documentsWithoutViolation: ContractSlaRow[];
}
