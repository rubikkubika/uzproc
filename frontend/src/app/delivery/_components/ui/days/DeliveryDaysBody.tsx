'use client';

import type { ReactNode } from 'react';
import type { HorizonCardView } from '../../types/delivery-horizon.types';
import type { HorizonKey } from '../../types/delivery-query.types';
import type { RibbonDayView } from '../../types/delivery-deadline-chart.types';
import DeliveryHorizonCard from './DeliveryHorizonCard';
import DeliveryRibbonDay from './DeliveryRibbonDay';

interface Props {
  cards: HorizonCardView[];
  onToggleHorizon: (key: HorizonKey) => void;
  /** Переключатель месяца с итогами — между карточками и лентой */
  monthBar: ReactNode;
  days: RibbonDayView[];
  month: number;
  onToggleDay: (day: number) => void;
}

/**
 * Блок над таблицей (без рамки): сверху горизонт («что горит»), под ним переключатель месяца и лента месяца.
 * Клик по группе или дню фильтрует таблицу; выбор группы снимает день и наоборот.
 */
export default function DeliveryDaysBody({ cards, onToggleHorizon, monthBar, days, month, onToggleDay }: Props) {
  return (
    <div className="flex flex-col gap-2 overflow-x-auto">
      <div className="grid grid-cols-[1.1fr_1fr_1.2fr_1.2fr_.8fr] gap-2 min-w-[900px]">
        {cards.map((card) => (
          <DeliveryHorizonCard key={card.key} card={card} onClick={() => onToggleHorizon(card.key)} />
        ))}
      </div>
      <div className="min-w-[900px]">{monthBar}</div>
      <div className="grid gap-[3px] min-w-[900px]" style={{ gridTemplateColumns: `repeat(${Math.max(days.length, 28)}, minmax(0, 1fr))` }}>
        {days.map((day) => (
          <DeliveryRibbonDay key={day.day} day={day} month={month} onClick={() => onToggleDay(day.day)} />
        ))}
      </div>
    </div>
  );
}
