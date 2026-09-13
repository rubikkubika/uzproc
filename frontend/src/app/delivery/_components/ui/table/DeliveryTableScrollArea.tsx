'use client';

import type { ReactNode, RefObject } from 'react';
import { DELIVERY_TABLE_MIN_WIDTH_CLASS } from '../../constants/delivery.constants';

interface Props {
  /** Контейнер прокрутки — его позиция запоминается при переходе к договору или заявке */
  scrollRef: RefObject<HTMLDivElement | null>;
  children: ReactNode;
}

/** Область прокрутки таблицы: занимает оставшуюся высоту, уже минимальной ширины прокручивается горизонтально. */
export default function DeliveryTableScrollArea({ scrollRef, children }: Props) {
  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-auto relative">
      <div className={DELIVERY_TABLE_MIN_WIDTH_CLASS}>{children}</div>
    </div>
  );
}
