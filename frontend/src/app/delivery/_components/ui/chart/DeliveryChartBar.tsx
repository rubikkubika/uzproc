'use client';

import { Check } from 'lucide-react';
import {
  CHART_HEIGHT,
  MIN_BAR_HEIGHT,
  DELIVERED_MARK_HEIGHT,
  MONTH_FULL_LABELS,
} from '../../constants/delivery-deadline-chart.constants';

interface Props {
  day: number;
  month: number;
  year: number;
  /** Не поставлено — высота столбца */
  count: number;
  /** Поставлено в этот день (по фактической дате) — галочка над столбцом */
  deliveredCount: number;
  maxCount: number;
  isWeekend: boolean;
  /** Столбец показан цветным (не погашен серым) */
  isActive: boolean;
  onClick: () => void;
}

/**
 * Один день месяца на диаграмме: столбец с количеством непоставленных поставок
 * по плановой дате и галочка над ним с количеством поставленных в этот день
 * (по фактической дате поставки).
 */
export default function DeliveryChartBar({
  day,
  month,
  year,
  count,
  deliveredCount,
  maxCount,
  isWeekend,
  isActive,
  onClick,
}: Props) {
  // Область столбца уменьшена на строку галочек, чтобы они всегда помещались над столбцом
  const barArea = CHART_HEIGHT - DELIVERED_MARK_HEIGHT;
  const height = maxCount > 0 && count > 0
    ? Math.max(MIN_BAR_HEIGHT, Math.round((count / maxCount) * (barArea - 4)))
    : 0;

  const monthLabel = MONTH_FULL_LABELS[month - 1];
  const title = `${day} ${monthLabel} ${year}\nНе поставлено (план): ${count}\nПоставлено (факт): ${deliveredCount}`;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 flex flex-col justify-end items-center h-full rounded-sm transition-colors ${
        isWeekend ? 'bg-gray-50' : ''
      } hover:bg-blue-50`}
      title={title}
    >
      <span
        className="flex items-center justify-center gap-0.5 w-full"
        style={{ height: DELIVERED_MARK_HEIGHT }}
      >
        {deliveredCount > 0 && (
          <>
            <Check
              strokeWidth={4}
              className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-emerald-500' : 'text-gray-400'}`}
            />
            <span className={`text-[11px] leading-none font-bold ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>
              {deliveredCount}
            </span>
          </>
        )}
      </span>

      <span
        className={`w-full rounded-t-sm flex justify-center transition-all ${
          count > 0
            ? isActive ? 'bg-blue-500' : 'bg-gray-400'
            : 'bg-gray-200'
        }`}
        style={{ height: count > 0 ? height : 2 }}
      >
        {count > 0 && (
          <span className="text-[11px] leading-none text-white font-bold text-center pt-1">{count}</span>
        )}
      </span>
    </button>
  );
}
