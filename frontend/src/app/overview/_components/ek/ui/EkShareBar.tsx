'use client';

import { EK_BAR_TRACK_COLOR } from '../constants/ek.constants';

interface EkShareBarProps {
  /** Доля, % (0–100) */
  percent: number;
  /** Подпись справа («34,5 %» или «—») */
  label: string;
  barColor: string;
  textColor: string;
  /** Полужирная подпись (доля по сумме) */
  strong?: boolean;
}

/** Горизонтальная 100%-полоска с процентом справа — ячейка таблицы ЕК */
export function EkShareBar({ percent, label, barColor, textColor, strong = false }: EkShareBarProps) {
  const width = Math.max(0, Math.min(100, percent));
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_52px] gap-1.5 items-center">
      <div className="h-3.5 rounded-[3px] overflow-hidden relative" style={{ backgroundColor: EK_BAR_TRACK_COLOR }}>
        <div className="absolute inset-y-0 left-0" style={{ width: `${width}%`, backgroundColor: barColor }} />
      </div>
      <span
        className={`tabular-nums whitespace-nowrap ${strong ? 'font-semibold' : ''}`}
        style={{ color: textColor }}
      >
        {label}
      </span>
    </div>
  );
}
