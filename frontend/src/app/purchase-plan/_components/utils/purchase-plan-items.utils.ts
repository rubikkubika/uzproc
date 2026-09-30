import { DEFAULT_COLUMN_WIDTHS } from '../constants/purchase-plan-items.constants';
import type { PurchaserSummaryItem } from '../types/purchase-plan-items.types';

// Функция для получения пути к логотипу компании
export const getCompanyLogoPath = (companyName: string | null): string | null => {
  if (!companyName) return null;
  
  const logoMap: Record<string, string> = {
    'Market': '/images/company logo/market.png',
    'Holding': '/images/company logo/technologies.svg',
    'Tezkor': '/images/company logo/tezkor.png',
    // Старые названия для обратной совместимости
    'Uzum Market': '/images/company logo/market.png',
    'Uzum Technologies': '/images/company logo/technologies.svg',
    'Uzum Tezkor': '/images/company logo/tezkor.png',
    // Дополнительные компании на случай расширения enum
    'Uzum Bank': '/images/company logo/bank.png',
    'Uzum Business': '/images/company logo/business.png',
    'Uzum Avto': '/images/company logo/avto.png',
    'Uzum Nasiya': '/images/company logo/nasiya.png',
  };
  
  return logoMap[companyName] || null;
};

// Функция для определения цвета группы статуса заявки
export const getPurchaseRequestStatusColor = (statusGroup: string | null): string => {
  if (!statusGroup) return 'bg-gray-100 text-gray-800';
  
  // Серый: не установлен
  if (statusGroup === 'Не установлен') {
    return 'bg-gray-100 text-gray-600';
  }
  
  // Зеленые: завершенные группы статусов
  if (statusGroup === 'Спецификация подписана' || statusGroup === 'Договор подписан') {
    return 'bg-green-100 text-green-800';
  }
  
  // Серый (архив)
  if (statusGroup === 'Спецификация создана - Архив') {
    return 'bg-gray-200 text-gray-700';
  }
  
  // Желтый: в процессе
  if (statusGroup === 'Заявка у закупщика' || statusGroup === 'Спецификация в работе' || 
      statusGroup === 'Договор в работе' || statusGroup === 'Заявка на согласовании') {
    return 'bg-yellow-100 text-yellow-800';
  }
  
  // Красный: не согласовано / не утверждено
  if (statusGroup === 'Заявка не согласована' || statusGroup === 'Заявка не утверждена' || 
      statusGroup === 'Закупка не согласована' || statusGroup === 'Спецификация не согласована') {
    return 'bg-red-100 text-red-800';
  }
  
  // Синий: проект
  if (statusGroup === 'Проект') {
    return 'bg-blue-100 text-blue-800';
  }
  
  // Серый по умолчанию
  return 'bg-gray-100 text-gray-800';
};

// Функция для получения дефолтной ширины колонки
export const getDefaultColumnWidth = (columnKey: string): number => {
  return DEFAULT_COLUMN_WIDTHS[columnKey] || 120;
};

/** Приводит значение из JSON (число / строка BigDecimal / null) к числу */
const toSummaryNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(String(value ?? ''));
  return isNaN(parsed) ? 0 : parsed;
};

/** Нормализует строку ответа эндпоинта /purchaser-summary в PurchaserSummaryItem */
export const normalizePurchaserSummaryItem = (item: Record<string, unknown>): PurchaserSummaryItem => ({
  purchaser: typeof item.purchaser === 'string' && item.purchaser ? item.purchaser : 'Не назначен',
  count: toSummaryNumber(item.count),
  totalBudget: toSummaryNumber(item.totalBudget),
  totalComplexity: toSummaryNumber(item.totalComplexity),
  inPlanCount: toSummaryNumber(item.inPlanCount),
  inPlanBudget: toSummaryNumber(item.inPlanBudget),
  linkedToRequestCount: toSummaryNumber(item.linkedToRequestCount),
  linkedToRequestBudget: toSummaryNumber(item.linkedToRequestBudget),
  excludedCount: toSummaryNumber(item.excludedCount),
  excludedBudget: toSummaryNumber(item.excludedBudget),
});

/** Сумма бюджета в своде: без дробной части, с разделителями разрядов */
export const formatSummaryBudget = (value: number): string =>
  value.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** Сложность в своде: до 2 знаков после запятой, «-» для нуля */
export const formatSummaryComplexity = (value: number): string =>
  value > 0 ? value.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '-';

/** Значение разбивки свода по статусу (количество / сумма): «-» для нуля */
export const formatSummaryBreakdownValue = (value: number, isBudget: boolean): string => {
  if (!value) return '-';
  return isBudget ? formatSummaryBudget(value) : String(value);
};
