'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { RibbonLegend } from '../../types/delivery-deadline-chart.types';

interface Props {
  monthLabel: string;
  legend: RibbonLegend;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

const LEGEND = [
  { key: 'overdue', label: 'просрочено', dot: 'bg-red-600' },
  { key: 'expected', label: 'ожидается', dot: 'bg-blue-600' },
  { key: 'delivered', label: 'поставлено', dot: 'bg-green-600' },
] as const;

const NAV_BUTTON = 'w-[22px] h-[22px] flex items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100';

/** Заголовок блока «По дням»: переключатель месяца и легенда с итогами месяца. */
export default function DeliveryDaysHeaderExtra({ monthLabel, legend, onPrevMonth, onNextMonth }: Props) {
  return (
    <>
      <div className="flex items-center gap-0.5 ml-1">
        <button type="button" onClick={onPrevMonth} className={NAV_BUTTON} title="Предыдущий месяц">
          <ChevronLeft className="w-3 h-3" strokeWidth={2.5} />
        </button>
        <span className="text-[12px] font-semibold min-w-[110px] text-center">{monthLabel}</span>
        <button type="button" onClick={onNextMonth} className={NAV_BUTTON} title="Следующий месяц">
          <ChevronRight className="w-3 h-3" strokeWidth={2.5} />
        </button>
      </div>
      <span className="ml-auto flex gap-3 text-[11px] font-medium text-slate-500 whitespace-nowrap">
        {LEGEND.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1">
            <span className={`w-2 h-2 rounded-sm ${item.dot}`} />
            {item.label} {legend[item.key]}
          </span>
        ))}
      </span>
    </>
  );
}
