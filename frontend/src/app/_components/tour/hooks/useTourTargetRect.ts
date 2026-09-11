'use client';

import { useCallback, useEffect, useState } from 'react';
import { TOUR_MEASURE_DELAY } from '../constants/tour.constants';
import type { TourRect } from '../types/tour.types';
import { tourTargetSelector } from '../utils/tour.utils';

/**
 * Прямоугольник подсвечиваемого элемента шага.
 * При смене шага прокручивает элемент в видимую область и пересчитывает координаты
 * при скролле и изменении размеров окна. Если элемента нет в DOM — возвращает null
 * (карточка шага в этом случае показывается по центру экрана).
 */
export function useTourTargetRect(targetKey: string | null, active: boolean): TourRect | null {
  const [rect, setRect] = useState<TourRect | null>(null);

  const measure = useCallback(() => {
    if (!targetKey) {
      setRect(null);
      return;
    }
    const element = document.querySelector(tourTargetSelector(targetKey));
    if (!element) {
      setRect(null);
      return;
    }
    const { top, left, width, height } = element.getBoundingClientRect();
    setRect({ top, left, width, height });
  }, [targetKey]);

  // Скролл к элементу шага и первичный замер (повторный — после плавного скролла).
  useEffect(() => {
    if (!active) return;
    const element = targetKey ? document.querySelector(tourTargetSelector(targetKey)) : null;
    element?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    // Первый замер — в ближайшем кадре (после layout), повторный — когда плавный скролл завершится.
    const frame = requestAnimationFrame(measure);
    const timer = setTimeout(measure, TOUR_MEASURE_DELAY);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [active, targetKey, measure]);

  // Пересчёт при скролле любого контейнера и ресайзе окна.
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    const handleChange = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    window.addEventListener('resize', handleChange);
    window.addEventListener('scroll', handleChange, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleChange);
      window.removeEventListener('scroll', handleChange, true);
    };
  }, [active, measure]);

  return rect;
}
