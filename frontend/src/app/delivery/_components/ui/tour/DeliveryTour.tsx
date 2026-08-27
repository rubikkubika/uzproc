'use client';

import { createPortal } from 'react-dom';
import { useTourTargetRect } from '../../hooks/useTourTargetRect';
import type { TourStep } from '../../types/delivery-tour.types';
import TourPopover from './TourPopover';
import TourSpotlight from './TourSpotlight';
import TourStepsNav from './TourStepsNav';

interface DeliveryTourProps {
  active: boolean;
  steps: TourStep[];
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  isFirst: boolean;
  isLast: boolean;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
  onGoTo: (index: number) => void;
}

/**
 * Оверлей ознакомительного тура: затемняет раздел, подсвечивает элемент текущего шага,
 * показывает рядом карточку с пояснением и оглавление шагов справа.
 * Рендерится порталом в body, чтобы не зависеть от контекстов прокрутки и z-index таблицы.
 */
export default function DeliveryTour({
  active,
  steps,
  step,
  stepIndex,
  totalSteps,
  isFirst,
  isLast,
  onNext,
  onPrev,
  onClose,
  onGoTo,
}: DeliveryTourProps) {
  const rect = useTourTargetRect(active ? step.target : null, active);

  // Тур запускается только по клику, поэтому на сервере и при гидратации портала ещё нет.
  if (!active || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Тур по разделу «Поставки»">
      <TourSpotlight rect={rect} />
      <TourPopover
        step={step}
        stepIndex={stepIndex}
        totalSteps={totalSteps}
        rect={rect}
        isFirst={isFirst}
        isLast={isLast}
        onNext={onNext}
        onPrev={onPrev}
        onClose={onClose}
      />
      <TourStepsNav steps={steps} currentIndex={stepIndex} onGoTo={onGoTo} />
    </div>,
    document.body,
  );
}
