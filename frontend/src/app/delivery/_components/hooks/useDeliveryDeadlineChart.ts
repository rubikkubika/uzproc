'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getBackendUrl } from '@/utils/api';
import type { DeliveryDeadlineHistogram, RibbonDayView, RibbonLegend } from '../types/delivery-deadline-chart.types';
import type { DeliveryQuery } from '../types/delivery-query.types';
import { buildDeliveryQueryParams } from '../utils/delivery-query.utils';
import { parseIsoDate, startOfToday, toIsoDate } from '../utils/date.utils';
import { MONTH_NOMINATIVE_LABELS, WEEKDAY_SHORT_LABELS } from '../constants/delivery-deadline-chart.constants';

interface Params {
  query: DeliveryQuery;
  reloadKey: number;
  /** Выбранный день (ISO) — хранится в таблице, т.к. фильтрует список */
  selectedDate: string | null;
  onSelectDate: (date: string | null) => void;
}

/**
 * Лента месяца в блоке «По дням»: по каждому дню — сколько ожидалось по плану и ещё не поставлено
 * и сколько поставлено по факту. Месяц переключается стрелками (с переходом через год),
 * фильтры таблицы передаются в запрос, кроме вкладки: лента показывает все поставки независимо от неё.
 */
export function useDeliveryDeadlineChart({ query, reloadKey, selectedDate, onSelectDate }: Params) {
  const today = useMemo(() => startOfToday(), []);
  // Лента открывается на месяце выбранного дня (например, после возврата со страницы договора), иначе — на текущем
  const [cursor, setCursor] = useState(() => {
    const start = parseIsoDate(selectedDate) ?? today;
    return { year: start.getFullYear(), month: start.getMonth() + 1 };
  });
  const [histogram, setHistogram] = useState<DeliveryDeadlineHistogram | null>(null);

  // Выбран конкретный год в фильтре дат — лента переходит в него (месяц сохраняется).
  // Корректировка состояния при рендере вместо эффекта: лишнего прохода рендера не будет.
  const [syncedYear, setSyncedYear] = useState(query.year);
  if (syncedYear !== query.year) {
    setSyncedYear(query.year);
    if (query.year !== null && query.year !== cursor.year) setCursor(c => ({ ...c, year: query.year as number }));
  }

  const shiftMonth = useCallback((delta: number) => {
    setCursor(({ year, month }) => {
      const index = year * 12 + (month - 1) + delta;
      return { year: Math.floor(index / 12), month: (index % 12) + 1 };
    });
    // Выбранный день относился к прежнему месяцу
    if (selectedDate) onSelectDate(null);
  }, [selectedDate, onSelectDate]);

  const goToPrevMonth = useCallback(() => shiftMonth(-1), [shiftMonth]);
  const goToNextMonth = useCallback(() => shiftMonth(1), [shiftMonth]);

  const selected = parseIsoDate(selectedDate);
  const selectedDay = selected && selected.getFullYear() === cursor.year && selected.getMonth() + 1 === cursor.month
    ? selected.getDate()
    : null;

  /** Повторный клик по тому же дню снимает фильтр */
  const toggleDay = useCallback((day: number) => {
    onSelectDate(selectedDay === day ? null : toIsoDate(new Date(cursor.year, cursor.month - 1, day)));
  }, [selectedDay, cursor, onSelectDate]);

  const paramsStr = buildDeliveryQueryParams(query, { includeDaySelection: false, includeTab: false }).toString();

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(paramsStr);
    params.append('year', String(cursor.year));
    params.append('month', String(cursor.month));
    fetch(`${getBackendUrl()}/api/deliveries/deadline-histogram?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<DeliveryDeadlineHistogram>;
      })
      .then(data => { if (!cancelled) setHistogram(data); })
      .catch(err => {
        console.error('Не удалось загрузить распределение поставок по дням:', err);
        if (!cancelled) setHistogram(null);
      });
    return () => { cancelled = true; };
  }, [cursor, paramsStr, reloadKey]);

  const days: RibbonDayView[] = useMemo(() => (histogram?.days ?? []).map(({ day, count, deliveredCount }) => {
    const date = new Date(cursor.year, cursor.month - 1, day);
    const weekday = date.getDay();
    return {
      day,
      weekday: WEEKDAY_SHORT_LABELS[weekday],
      isToday: date.getTime() === today.getTime(),
      isPast: date < today,
      isWeekend: weekday === 0 || weekday === 6,
      isSelected: selectedDay === day,
      plan: count,
      fact: deliveredCount,
    };
  }), [histogram, cursor, today, selectedDay]);

  const legend: RibbonLegend = useMemo(() => days.reduce(
    (acc, d) => ({
      overdue: acc.overdue + (d.isPast ? d.plan : 0),
      expected: acc.expected + (d.isPast ? 0 : d.plan),
      delivered: acc.delivered + d.fact,
    }),
    { overdue: 0, expected: 0, delivered: 0 },
  ), [days]);

  return {
    month: cursor.month,
    monthLabel: `${MONTH_NOMINATIVE_LABELS[cursor.month - 1]} ${cursor.year}`,
    days,
    legend,
    toggleDay,
    goToPrevMonth,
    goToNextMonth,
  };
}
