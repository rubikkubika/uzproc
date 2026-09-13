import type { HorizonKey } from './delivery-query.types';

/** Количество непоставленных поставок с плановой датой в этот день. */
export interface DeliveryHorizonDay {
  /** ISO-дата */
  date: string;
  count: number;
}

export interface DeliveryHorizonGroup {
  key: HorizonKey;
  count: number;
  /** Разбивка по плановым датам (по возрастанию); у «Без даты» пустая */
  days: DeliveryHorizonDay[];
}

/** Ответ API горизонта */
export interface DeliveryHorizon {
  /** Сегодняшняя дата сервера (ISO) */
  today: string;
  /** Граница «Ближайших дней» в днях от сегодня */
  weekDays: number;
  groups: DeliveryHorizonGroup[];
}

/** Карточка горизонта, готовая к отображению */
export interface HorizonCardView {
  key: HorizonKey;
  label: string;
  hint: string;
  count: number;
  chips: Array<{ label: string; count: number }>;
  /** Сколько дней не поместилось в чипы */
  hiddenChips: number;
  selected: boolean;
}
