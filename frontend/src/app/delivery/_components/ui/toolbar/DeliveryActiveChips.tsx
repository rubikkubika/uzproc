'use client';

import { X } from 'lucide-react';
import type { ActiveChip } from '../../hooks/useDeliveryActiveChips';

/** Чипы активных срезов: крестик снимает конкретный срез. */
export default function DeliveryActiveChips({ chips }: { chips: ActiveChip[] }) {
  if (chips.length === 0) return null;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1.5 text-[12px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-medium whitespace-nowrap"
        >
          {chip.label}
          <button type="button" onClick={chip.onClear} className="hover:text-blue-950" title="Снять срез">
            <X className="w-3 h-3" strokeWidth={2.5} />
          </button>
        </span>
      ))}
    </div>
  );
}
