'use client';

import type { HorizonCardView } from '../../types/delivery-horizon.types';
import { HORIZON_META } from '../../constants/delivery-horizon.constants';

interface Props {
  card: HorizonCardView;
  onClick: () => void;
}

/** Карточка группы горизонта: число, название, подсказка и чипы ближайших дней. */
export default function DeliveryHorizonCard({ card, onClick }: Props) {
  const meta = HORIZON_META.find((m) => m.key === card.key) ?? HORIZON_META[0];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left rounded-md border px-2.5 py-[7px] flex flex-col gap-1.5 hover:brightness-[.97] min-w-0 ${meta.cardClass} ${
        card.selected ? meta.selectedClass : ''
      }`}
    >
      <span className="flex items-baseline gap-2 min-w-0">
        <span className={`text-[20px] font-bold leading-none tabular-nums ${meta.textClass}`}>{card.count}</span>
        <span className={`text-[12px] font-semibold whitespace-nowrap ${meta.textClass}`}>{card.label}</span>
        <span className="ml-auto text-[11px] text-slate-500 whitespace-nowrap truncate">{card.hint}</span>
      </span>
      {card.chips.length > 0 && (
        <span className="flex flex-wrap gap-1">
          {card.chips.map((chip) => (
            <span
              key={chip.label}
              className={`text-[11px] px-1.5 py-px rounded bg-white border text-slate-700 tabular-nums ${meta.chipBorderClass}`}
            >
              {chip.label} <b className={meta.textClass}>{chip.count}</b>
            </span>
          ))}
          {card.hiddenChips > 0 && (
            <span className="text-[11px] px-1 py-px text-slate-500">+{card.hiddenChips} дн.</span>
          )}
        </span>
      )}
    </button>
  );
}
