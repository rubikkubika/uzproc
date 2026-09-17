'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TourController, TourStep } from '../types/tour.types';

/**
 * Состояние ознакомительного тура по разделу.
 * Запуск — только вручную (кнопка «?»), автозапуска нет, прогресс не сохраняется.
 * Горячие клавиши: ← / → — шаги, Esc — выход.
 */
export function useTour(steps: TourStep[]): TourController {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const totalSteps = steps.length;
  const safeIndex = Math.min(stepIndex, Math.max(0, totalSteps - 1));
  const step = steps[safeIndex];

  const start = useCallback(() => {
    setStepIndex(0);
    setActive(true);
  }, []);

  const stop = useCallback(() => {
    setActive(false);
    setStepIndex(0);
  }, []);

  const next = useCallback(() => {
    setStepIndex((prev) => Math.min(prev + 1, totalSteps - 1));
  }, [totalSteps]);

  const prev = useCallback(() => {
    setStepIndex((current) => Math.max(current - 1, 0));
  }, []);

  const goTo = useCallback((index: number) => {
    setStepIndex(Math.max(0, Math.min(index, totalSteps - 1)));
  }, [totalSteps]);

  const isFirst = safeIndex === 0;
  const isLast = safeIndex === totalSteps - 1;

  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        stop();
        return;
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        if (isLast) stop();
        else next();
        return;
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        prev();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [active, isLast, next, prev, stop]);

  return useMemo(() => ({
    active,
    steps,
    step,
    stepIndex: safeIndex,
    totalSteps,
    isFirst,
    isLast,
    start,
    stop,
    next,
    prev,
    goTo,
  }), [active, steps, step, safeIndex, totalSteps, isFirst, isLast, start, stop, next, prev, goTo]);
}
