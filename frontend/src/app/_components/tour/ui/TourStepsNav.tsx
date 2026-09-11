'use client';

import { Check } from 'lucide-react';
import { TOUR_NAV_WIDTH } from '../constants/tour.constants';
import type { TourStep } from '../types/tour.types';

interface TourStepsNavProps {
  steps: TourStep[];
  currentIndex: number;
  onGoTo: (index: number) => void;
}

/** Оглавление тура справа: список шагов с переходом на любой из них. */
export default function TourStepsNav({ steps, currentIndex, onGoTo }: TourStepsNavProps) {
  return (
    <aside
      className="pointer-events-auto fixed right-4 top-1/2 flex max-h-[80vh] -translate-y-1/2 flex-col rounded-xl bg-white shadow-2xl ring-1 ring-black/10"
      style={{ width: TOUR_NAV_WIDTH }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="border-b border-gray-200 px-3 py-2">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Шаги тура</div>
      </div>

      <nav className="flex flex-col gap-0.5 overflow-y-auto p-1.5">
        {steps.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isPassed = index < currentIndex;
          return (
            <button
              key={step.id}
              onClick={() => onGoTo(index)}
              title={step.title}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                isCurrent ? 'bg-blue-50 font-medium text-blue-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                  isCurrent
                    ? 'bg-blue-600 text-white'
                    : isPassed
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isPassed ? <Check className="h-2.5 w-2.5" /> : index + 1}
              </span>
              <span className="truncate">{step.title}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
