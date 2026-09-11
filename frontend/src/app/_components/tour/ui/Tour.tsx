'use client';

import { createPortal } from 'react-dom';
import { useTourTargetRect } from '../hooks/useTourTargetRect';
import type { TourController } from '../types/tour.types';
import TourPopover from './TourPopover';
import TourSpotlight from './TourSpotlight';
import TourStepsNav from './TourStepsNav';

interface TourProps {
  /** Состояние тура из useTour */
  tour: TourController;
  /** Название тура для экранных дикторов, напр. «Тур по разделу «Поставки»» */
  title: string;
}

/**
 * Оверлей ознакомительного тура: затемняет раздел, подсвечивает элемент текущего шага,
 * показывает рядом карточку с пояснением и оглавление шагов справа.
 * Рендерится порталом в body, чтобы не зависеть от контекстов прокрутки и z-index таблицы.
 */
export default function Tour({ tour, title }: TourProps) {
  const rect = useTourTargetRect(tour.active ? tour.step.target : null, tour.active);

  // Тур запускается только по клику, поэтому на сервере и при гидратации портала ещё нет.
  if (!tour.active || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={title}>
      <TourSpotlight rect={rect} />
      <TourPopover
        step={tour.step}
        stepIndex={tour.stepIndex}
        totalSteps={tour.totalSteps}
        rect={rect}
        isFirst={tour.isFirst}
        isLast={tour.isLast}
        onNext={tour.next}
        onPrev={tour.prev}
        onClose={tour.stop}
      />
      <TourStepsNav steps={tour.steps} currentIndex={tour.stepIndex} onGoTo={tour.goTo} />
    </div>,
    document.body,
  );
}
