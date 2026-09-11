'use client';

import { TOUR_SPOTLIGHT_PADDING } from '../constants/tour.constants';
import type { TourRect } from '../types/tour.types';

interface TourSpotlightProps {
  rect: TourRect | null;
}

/**
 * Подсветка элемента шага: рамка вокруг него и затемнение всего остального
 * (огромная тень наружу вместо четырёх отдельных «шторок»).
 * Если элемента нет — экран затемняется целиком.
 */
export default function TourSpotlight({ rect }: TourSpotlightProps) {
  if (!rect) {
    return <div className="pointer-events-none fixed inset-0 bg-slate-900/60" />;
  }

  return (
    <div
      className="pointer-events-none fixed rounded-lg ring-2 ring-blue-500 transition-all duration-200 ease-out"
      style={{
        top: rect.top - TOUR_SPOTLIGHT_PADDING,
        left: rect.left - TOUR_SPOTLIGHT_PADDING,
        width: rect.width + TOUR_SPOTLIGHT_PADDING * 2,
        height: rect.height + TOUR_SPOTLIGHT_PADDING * 2,
        boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.6)',
      }}
    />
  );
}
