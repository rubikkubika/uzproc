'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getBackendUrl } from '@/utils/api';
import type {
  DeliveryDeadlineHistogram,
  DeliveryDeadlineChartFilters,
} from '../types/delivery-deadline-chart.types';

/**
 * Данные столбчатой диаграммы над таблицей поставок: распределение поставок
 * по дням выбранного месяца по плановой дате поставки.
 * Месяц переключается стрелками, год берётся из фильтра дат таблицы
 * (если выбран режим «Все», используется текущий год).
 * Фильтры таблицы передаются в запрос, поэтому диаграмма показывает те же записи.
 */
export function useDeliveryDeadlineChart({
  filters,
  paymentSchemeFilter,
  shipmentStatusFilter,
  dateYear,
  showNoDate,
  tab,
  onSelectedDateChange,
}: DeliveryDeadlineChartFilters) {
  const currentDate = useMemo(() => new Date(), []);
  const year = dateYear ?? currentDate.getFullYear();

  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
  const [histogram, setHistogram] = useState<DeliveryDeadlineHistogram | null>(null);
  const [loading, setLoading] = useState(false);

  // Выбранный кликом день месяца: выделяет столбец и фильтрует таблицу по этой плановой дате
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const goToPrevMonth = useCallback(() => setMonth(m => (m <= 1 ? 12 : m - 1)), []);
  const goToNextMonth = useCallback(() => setMonth(m => (m >= 12 ? 1 : m + 1)), []);
  const selectMonth = useCallback((value: number) => setMonth(value), []);

  /** Повторный клик по тому же столбцу снимает фильтр */
  const toggleDay = useCallback((day: number) => {
    setSelectedDay(prev => (prev === day ? null : day));
  }, []);

  // Смена месяца или года снимает выбор: выбранный день относился к прежнему месяцу
  useEffect(() => {
    setSelectedDay(null);
  }, [month, year]);

  // Сообщаем таблице выбранную плановую дату (или снятие фильтра)
  useEffect(() => {
    const pad = (value: number) => String(value).padStart(2, '0');
    onSelectedDateChange(
      selectedDay !== null ? `${year}-${pad(month)}-${pad(selectedDay)}` : null
    );
  }, [selectedDay, year, month, onSelectedDateChange]);

  // Стабилизируем объекты фильтров, чтобы запрос уходил только при их реальном изменении
  const filtersStr = JSON.stringify(filters);

  useEffect(() => {
    let cancelled = false;

    const fetchHistogram = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('year', String(year));
        params.append('month', String(month));

        const parsedFilters: Record<string, string> = JSON.parse(filtersStr);
        Object.entries(parsedFilters).forEach(([key, value]) => {
          if (value && value.trim() !== '') params.append(key, value.trim());
        });
        if (paymentSchemeFilter) params.append('paymentScheme', paymentSchemeFilter);
        if (shipmentStatusFilter) params.append('shipmentStatus', shipmentStatusFilter);
        if (showNoDate) {
          params.append('dateNull', 'true');
        } else if (dateYear !== null) {
          params.append('dateYear', String(dateYear));
        }
        // 'all' — вкладка «Все»: фильтра по состоянию нет, параметр не отправляем
        if (tab && tab !== 'all') params.append('tab', tab);

        const res = await fetch(`${getBackendUrl()}/api/deliveries/deadline-histogram?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as DeliveryDeadlineHistogram;
        if (!cancelled) setHistogram(data);
      } catch (err) {
        console.error('Не удалось загрузить распределение поставок по дням:', err);
        if (!cancelled) setHistogram(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchHistogram();
    return () => { cancelled = true; };
  }, [year, month, filtersStr, paymentSchemeFilter, shipmentStatusFilter, dateYear, showNoDate, tab]);

  /** Максимум по дням — от него считается высота столбцов */
  const maxCount = useMemo(() => {
    if (!histogram || histogram.days.length === 0) return 0;
    return Math.max(...histogram.days.map(d => d.count));
  }, [histogram]);

  return {
    year,
    month,
    histogram,
    maxCount,
    loading,
    selectedDay,
    toggleDay,
    goToPrevMonth,
    goToNextMonth,
    selectMonth,
  };
}
