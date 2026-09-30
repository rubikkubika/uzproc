import type { PurchaserSummaryStatusGroup } from '../types/purchase-plan-items.types';

/**
 * Группы разбивки свода по закупщикам по статусу позиции (количество и сумма бюджета по каждой).
 * Считаются на бэкенде (/purchase-plan-items/purchaser-summary) без учёта фильтра «Статус».
 */
export const PURCHASER_SUMMARY_STATUS_GROUPS: PurchaserSummaryStatusGroup[] = [
  {
    key: 'inPlan',
    label: 'В плане',
    title: 'Позиции со статусом «В плане» без связанной заявки (без учёта фильтра «Статус»)',
    countField: 'inPlanCount',
    budgetField: 'inPlanBudget',
  },
  {
    key: 'linkedToRequest',
    label: 'Связано с заявкой',
    title: 'Позиции, связанные с заявкой на закупку, кроме исключённых (без учёта фильтра «Статус»)',
    countField: 'linkedToRequestCount',
    budgetField: 'linkedToRequestBudget',
  },
  {
    key: 'excluded',
    label: 'Исключено',
    title: 'Позиции со статусом «Исключена» (без учёта фильтра «Статус»)',
    countField: 'excludedCount',
    budgetField: 'excludedBudget',
  },
];

/** Классы ячеек сводной таблицы по закупщикам */
export const SUMMARY_TH_CLASS = 'px-2 py-1 text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300 whitespace-nowrap';
export const SUMMARY_TD_CLASS = 'px-2 py-1 text-xs text-gray-900 border-r border-gray-200 whitespace-nowrap';
export const SUMMARY_TOTAL_TD_CLASS = 'px-2 py-1 text-xs font-semibold text-gray-700 border-r border-gray-200 whitespace-nowrap';
/** Левая граница, отделяющая группы статусов от итоговых колонок */
export const SUMMARY_GROUP_START_CLASS = 'border-l border-l-gray-300';
