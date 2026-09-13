'use client';

import { useCallback, useEffect, useState, type RefObject } from 'react';
import { formatShortDate } from '../utils/date.utils';

/**
 * Выпадающий фильтр диапазона плановой даты в шапке колонки «Даты поставки».
 * containerRef передаётся вызывающим компонентом: ref нельзя возвращать из хука вместе с данными для рендера.
 */
export function usePlannedRangeFilter(
  containerRef: RefObject<HTMLDivElement | null>,
  from: string,
  to: string,
  onChange: (from: string, to: string) => void,
) {
  const [open, setOpen] = useState(false);

  // Клик вне выпадашки закрывает её
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, containerRef]);

  const active = Boolean(from || to);
  const label = active
    ? `План ${from ? formatShortDate(from) : '…'} — ${to ? formatShortDate(to) : '…'}`
    : 'План: дд.мм — дд.мм';

  return {
    open,
    toggle: useCallback(() => setOpen((v) => !v), []),
    active,
    label,
    setFrom: useCallback((value: string) => onChange(value, to), [onChange, to]),
    setTo: useCallback((value: string) => onChange(from, value), [onChange, from]),
    clear: useCallback(() => {
      onChange('', '');
      setOpen(false);
    }, [onChange]),
  };
}
