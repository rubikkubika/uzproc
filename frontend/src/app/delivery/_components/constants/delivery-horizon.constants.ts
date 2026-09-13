import type { HorizonKey } from '../types/delivery-query.types';

interface HorizonMeta {
  key: HorizonKey;
  /** Карточка: фон, рамка, верхняя полоска 3px */
  cardClass: string;
  /** Обводка выбранной карточки */
  selectedClass: string;
  /** Число и название */
  textClass: string;
  /** Рамка чипа дня */
  chipBorderClass: string;
}

/** Группы горизонта в порядке показа: от «горит» к «не срочно» */
export const HORIZON_META: HorizonMeta[] = [
  {
    key: 'over',
    cardClass: 'bg-red-100 border-red-300 shadow-[inset_0_3px_0_#dc2626]',
    selectedClass: 'outline outline-2 outline-offset-1 outline-red-600',
    textClass: 'text-red-700',
    chipBorderClass: 'border-red-300',
  },
  {
    key: 'today',
    cardClass: 'bg-orange-100 border-orange-300 shadow-[inset_0_3px_0_#ea580c]',
    selectedClass: 'outline outline-2 outline-offset-1 outline-orange-600',
    textClass: 'text-orange-700',
    chipBorderClass: 'border-orange-300',
  },
  {
    key: 'week',
    cardClass: 'bg-blue-100 border-blue-300 shadow-[inset_0_3px_0_#2563eb]',
    selectedClass: 'outline outline-2 outline-offset-1 outline-blue-600',
    textClass: 'text-blue-800',
    chipBorderClass: 'border-blue-300',
  },
  {
    key: 'later',
    cardClass: 'bg-slate-100 border-slate-300 shadow-[inset_0_3px_0_#94a3b8]',
    selectedClass: 'outline outline-2 outline-offset-1 outline-slate-400',
    textClass: 'text-slate-700',
    chipBorderClass: 'border-slate-300',
  },
  {
    key: 'nodate',
    cardClass: 'bg-slate-50 border-slate-200 shadow-[inset_0_3px_0_#cbd5e1]',
    selectedClass: 'outline outline-2 outline-offset-1 outline-slate-300',
    textClass: 'text-slate-700',
    chipBorderClass: 'border-slate-200',
  },
];

/** Короткие названия месяцев в родительном падеже: «13 сен», «с 21 сен» */
export const MONTH_SHORT_GENITIVE = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'] as const;

/** Названия групп горизонта для чипа активного среза */
export const HORIZON_CHIP_LABELS: Record<HorizonKey, string> = {
  over: 'Просрочено',
  today: 'Сегодня',
  week: 'Ближайшие 7 дней',
  later: 'Позже',
  nodate: 'Без даты',
};
