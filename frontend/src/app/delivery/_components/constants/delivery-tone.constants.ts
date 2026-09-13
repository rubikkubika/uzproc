import type { Tone } from '../types/delivery-view.types';

/** Бейдж статуса: фон + текст */
export const TONE_BADGE: Record<Tone, string> = {
  red: 'bg-red-100 text-red-700',
  orange: 'bg-orange-100 text-orange-700',
  green: 'bg-green-100 text-green-700',
  blue: 'bg-blue-100 text-blue-800',
  slate: 'bg-slate-100 text-slate-600',
};

/** Только цвет текста */
export const TONE_TEXT: Record<Tone, string> = {
  red: 'text-red-700',
  orange: 'text-orange-700',
  green: 'text-green-700',
  blue: 'text-blue-800',
  slate: 'text-slate-400',
};

/** Точка в ярлыке сигнала */
export const TONE_DOT: Record<Tone, string> = {
  red: 'bg-red-600',
  orange: 'bg-orange-600',
  green: 'bg-green-600',
  blue: 'bg-blue-600',
  slate: 'bg-slate-400',
};

/** Полоска 3px слева у строки с сигналом */
export const TONE_STRIPE: Record<Tone, string> = {
  red: 'shadow-[inset_3px_0_0_#dc2626]',
  orange: 'shadow-[inset_3px_0_0_#ea580c]',
  green: 'shadow-[inset_3px_0_0_#16a34a]',
  blue: 'shadow-[inset_3px_0_0_#2563eb]',
  slate: 'shadow-[inset_3px_0_0_#94a3b8]',
};

/** Статус поставки (название из DTO) → цвет */
export const SHIPMENT_TONE: Record<string, Tone> = {
  'Ожидает поставку': 'blue',
  'Ожидает оплаты аванса': 'slate',
  'Поставлено': 'green',
  'Просрочено': 'red',
};

/** Статус оплаты (название из DTO) → цвет */
export const PAYMENT_STATUS_TONE: Record<string, Tone> = {
  'Оплачено': 'green',
  'Проект': 'slate',
  'Не оплачено': 'slate',
  'Оплата аванса': 'blue',
  'Аванс оплачен': 'blue',
  'Ожидает доплаты': 'blue',
};
