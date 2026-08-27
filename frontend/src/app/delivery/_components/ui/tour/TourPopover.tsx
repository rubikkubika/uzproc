'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import {
  TOUR_NAV_INSET,
  TOUR_POPOVER_FALLBACK_HEIGHT,
  TOUR_POPOVER_WIDTH,
} from '../../constants/delivery-tour.constants';
import type { TourRect, TourStep } from '../../types/delivery-tour.types';
import { computePopoverPosition } from '../../utils/tour.utils';
import TourStepBody from './TourStepBody';

interface TourPopoverProps {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  rect: TourRect | null;
  isFirst: boolean;
  isLast: boolean;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

/** Карточка шага: заголовок, структурированное описание и навигация. */
export default function TourPopover({
  step,
  stepIndex,
  totalSteps,
  rect,
  isFirst,
  isLast,
  onPrev,
  onNext,
  onClose,
}: TourPopoverProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(TOUR_POPOVER_FALLBACK_HEIGHT);

  // Высота карточки зависит от объёма описания — меряем её при смене шага.
  useLayoutEffect(() => {
    if (cardRef.current) setHeight(cardRef.current.offsetHeight);
  }, [step.id]);

  const position = computePopoverPosition(
    rect,
    TOUR_POPOVER_WIDTH,
    height,
    typeof window === 'undefined' ? 0 : window.innerWidth,
    typeof window === 'undefined' ? 0 : window.innerHeight,
    TOUR_NAV_INSET,
  );

  return (
    <div
      ref={cardRef}
      className="pointer-events-auto fixed rounded-xl bg-white p-4 shadow-2xl ring-1 ring-black/10 transition-all duration-200 ease-out"
      style={{ top: position.top, left: position.left, width: TOUR_POPOVER_WIDTH }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-600">
          Шаг {stepIndex + 1} из {totalSteps}
        </span>
        <button
          onClick={onClose}
          className="-mr-1 -mt-1 rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          title="Закрыть тур (Esc)"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <h3 className="mb-2.5 text-sm font-semibold text-gray-900">{step.title}</h3>

      <TourStepBody body={step.body} />

      <div className="mt-4 flex items-center justify-end gap-1.5 border-t border-gray-100 pt-3">
        {!isFirst && (
          <button
            onClick={onPrev}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Назад
          </button>
        )}
        <button
          onClick={isLast ? onClose : onNext}
          className="rounded-lg border border-blue-600 bg-blue-600 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-blue-700"
        >
          {isLast ? 'Готово' : 'Далее'}
        </button>
      </div>
    </div>
  );
}
