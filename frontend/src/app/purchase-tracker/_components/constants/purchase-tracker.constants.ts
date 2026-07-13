import type { StageState } from '../types/purchase-tracker.types';

/** Палитра состояний этапов/шагов */
export const STATE_PALETTE: Record<StageState, { dot: string; bg: string; fg: string }> = {
  done: { dot: '#16A34A', bg: '#E8F7EE', fg: '#15803D' },
  current: { dot: '#D97706', bg: '#FEF3C7', fg: '#B45309' },
  wait: { dot: '#C9CFDA', bg: '#F1F2F6', fg: '#8A92A3' },
};

/** Подписи состояний этапа */
export const STATE_LABELS: Record<StageState, string> = {
  done: 'Готово',
  current: 'Сейчас здесь',
  wait: 'Ожидает',
};

/** Статус-пилюли по индексу текущего этапа (для незавершённых закупок) */
export const STATUS_PILLS = [
  { bg: '#F2F4F7', fg: '#475467', label: 'Заявка создана' },
  { bg: '#EDE9FE', fg: '#6D28D9', label: 'Согласование заявки' },
  { bg: '#FEF3C7', fg: '#B45309', label: 'Выбор поставщика' },
  { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Договор в работе' },
];

/** Статус-пилюля завершённой закупки */
export const DONE_PILL = { bg: '#DCFCE7', fg: '#15803D', label: 'Договор подписан' };

/** Статус-пилюли для заказов (прямой заказ → спецификация вместо договора) */
export const SPEC_IN_WORK_PILL = { bg: '#DBEAFE', fg: '#1D4ED8', label: 'Спецификация в работе' };
export const SPEC_DONE_PILL = { bg: '#DCFCE7', fg: '#15803D', label: 'Спецификация подписана' };

/** Серая пилюля для группы «Архив» (терминальные/скрытые заявки) */
export const ARCHIVE_PILL = { bg: '#E5E7EB', fg: '#6B7280', label: 'Архив' };

/** Чипы-примеры под строкой поиска */
export const SEARCH_CHIPS = ['2666', '2549', 'Марина Тен'];

/** Плейсхолдер строки поиска */
export const SEARCH_PLACEHOLDER = 'Номер заявки, название или ФИО инициатора';

/** Текст пустого результата */
export const EMPTY_TEXT = 'Ничего не найдено. Проверьте номер заявки или напишите закупщику.';
