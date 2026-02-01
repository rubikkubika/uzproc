import type { MonthOption } from '../types/delivery-plan-table.types';

/** Опции месяцев для фильтра */
export const MONTH_OPTIONS: MonthOption[] = [
  { value: 0, label: 'Январь' },
  { value: 1, label: 'Февраль' },
  { value: 2, label: 'Март' },
  { value: 3, label: 'Апрель' },
  { value: 4, label: 'Май' },
  { value: 5, label: 'Июнь' },
  { value: 6, label: 'Июль' },
  { value: 7, label: 'Август' },
  { value: 8, label: 'Сентябрь' },
  { value: 9, label: 'Октябрь' },
  { value: 10, label: 'Ноябрь' },
  { value: 11, label: 'Декабрь' },
];

/** Текстовые поля для debounce фильтрации */
export const TEXT_FILTER_FIELDS = [
  'innerId',
  'name',
  'title',
  'cfo',
  'company',
  'category',
  'purchaseRequestId',
];

/** Ключ для сохранения фильтров в localStorage */
export const FILTERS_STORAGE_KEY = 'deliveryPlanTableFilters';

/** Размер страницы по умолчанию */
export const DEFAULT_PAGE_SIZE = 50;

/** Задержка debounce для фильтров (мс) */
export const DEBOUNCE_DELAY = 500;
