import type { EkRiskLevel, EkRiskStyle, EkRiskThresholds, EkSortKey, EkSortState } from '../types/ek.types';

export const EK_API_PATH = '/api/overview/ek';

/** Пороги риска по доле ЕК (по сумме), % */
export const EK_RISK_THRESHOLDS: EkRiskThresholds = { lowMax: 15, highMin: 30 };

/** Цвета уровней риска: высокая доля ЕК — плохо, поэтому без «позитивного» зелёного */
export const EK_RISK_STYLES: Record<EkRiskLevel, EkRiskStyle> = {
  low: { bar: '#64748b', text: '#475569', bg: '#f1f5f9', label: 'Низкая' },
  mid: { bar: '#f59e0b', text: '#b45309', bg: '#fffbeb', label: 'Средняя' },
  high: { bar: '#dc2626', text: '#b91c1c', bg: '#fef2f2', label: 'Высокая' },
  none: { bar: 'transparent', text: '#9ca3af', bg: '#f9fafb', label: 'Нет заявок' },
};

/** Заливка бара доли по количеству — не рисковая шкала */
export const EK_COUNT_BAR_COLOR = '#94a3b8';

/** Непокрытая часть бара */
export const EK_BAR_TRACK_COLOR = '#eceff3';

/** Сколько ЦФО показывать в структуре суммы ЕК до «Остальных» */
export const EK_CONCENTRATION_TOP = 5;

/** Цвета сегментов структуры суммы ЕК по порядку; последний — «Остальные» */
export const EK_CONCENTRATION_COLORS = ['#1e3a8a', '#1d4ed8', '#3b82f6', '#93c5fd', '#c7d2fe'];
export const EK_CONCENTRATION_REST_COLOR = '#d1d5db';

export const EK_DEFAULT_SORT: EkSortState = { key: 'pct', dir: -1 };

/** Колонки таблицы по ЦФО */
export const EK_TABLE_COLUMNS: { key: EkSortKey; label: string; align: 'left' | 'right' }[] = [
  { key: 'cfo', label: 'ЦФО', align: 'left' },
  { key: 'pct', label: 'Доля ЕК по сумме', align: 'left' },
  { key: 'pctCnt', label: 'Доля ЕК по количеству', align: 'left' },
  { key: 'ekCount', label: 'Заявки ЕК / всего', align: 'right' },
  { key: 'ekAmount', label: 'Сумма ЕК / всего', align: 'right' },
];

/** Сколько лет назад и вперёд от текущего доступно в выборе года */
export const EK_YEARS_BACK = 2;
export const EK_YEARS_TOTAL = 8;

export const EK_MODE_ASSIGNMENT_TITLE = 'Год назначения заявки на закупщика (этап «Утверждение заявки на ЗП»)';
export const EK_MODE_CREATION_TITLE =
  'За выбранный год нет дат назначения на закупщика — заявки отобраны по году создания';

export const EK_SELECTION_RULES =
  'Учитываются заявки типа «закупка» вне статусов «Проект», «Не согласована», «Не утверждена» и не скрытые из раздела «В работе».';

export const EK_TABLE_HINT =
  'Две полоски: доля ЕК от суммы заявок (цвет — риск) и от количества заявок (серая). Сортировка кликом по заголовку.';

export const EK_SKELETON_ROWS = 9;
