import type { DeliveryHorizon, HorizonCardView } from '../types/delivery-horizon.types';
import type { HorizonKey } from '../types/delivery-query.types';
import { HORIZON_CHIPS_LIMIT } from '../constants/delivery.constants';
import { HORIZON_META, MONTH_SHORT_GENITIVE } from '../constants/delivery-horizon.constants';
import { parseIsoDate } from './date.utils';

const dayMonth = (date: Date) => `${date.getDate()} ${MONTH_SHORT_GENITIVE[date.getMonth()]}`;

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Названия и подсказки групп относительно сегодняшней даты сервера */
function describe(key: HorizonKey, today: Date, weekDays: number): { label: string; hint: string } {
  switch (key) {
    case 'over': return { label: 'Просрочено', hint: 'план прошёл, факта нет' };
    case 'today': return { label: `Сегодня, ${dayMonth(today)}`, hint: 'плановая дата сегодня' };
    case 'week': {
      const from = addDays(today, 1);
      const to = addDays(today, weekDays);
      const range = from.getMonth() === to.getMonth()
        ? `${from.getDate()}–${to.getDate()} ${MONTH_SHORT_GENITIVE[to.getMonth()]}`
        : `${dayMonth(from)} – ${dayMonth(to)}`;
      return { label: `Ближайшие ${weekDays} дней`, hint: range };
    }
    case 'later': return { label: 'Позже', hint: `с ${dayMonth(addDays(today, weekDays + 1))}` };
    case 'nodate': return { label: 'Без даты', hint: 'срок не определён' };
  }
}

/**
 * Карточки горизонта. Чипы дней ограничены: у просрочки — ближайшие к сегодня даты,
 * у будущих групп — самые ранние.
 */
export function toHorizonCards(horizon: DeliveryHorizon | null, selected: HorizonKey | null): HorizonCardView[] {
  const today = parseIsoDate(horizon?.today) ?? new Date();
  const weekDays = horizon?.weekDays ?? 7;

  return HORIZON_META.map(({ key }) => {
    const group = horizon?.groups.find((g) => g.key === key);
    const days = group?.days ?? [];
    const visible = key === 'over' ? days.slice(-HORIZON_CHIPS_LIMIT) : days.slice(0, HORIZON_CHIPS_LIMIT);
    return {
      key,
      ...describe(key, today, weekDays),
      count: group?.count ?? 0,
      chips: visible.map((day) => ({ label: day.date.slice(8, 10) + '.' + day.date.slice(5, 7), count: day.count })),
      hiddenChips: days.length - visible.length,
      selected: selected === key,
    };
  });
}
