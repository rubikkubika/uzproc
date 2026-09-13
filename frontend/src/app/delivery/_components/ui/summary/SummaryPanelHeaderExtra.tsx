'use client';

import type { SummaryHeatmap } from '../../hooks/useSummaryHeatmap';

interface Props {
  collapsed: boolean;
  heatmap: SummaryHeatmap;
  year: number;
  sliceLabel: string;
}

/** Заголовок сводки справа: подпись; в свёрнутом виде — ключевые числа, в развёрнутом — активный срез. */
export default function SummaryPanelHeaderExtra({ collapsed, heatmap, year, sliceLabel }: Props) {
  const { totals, responsibleCount } = heatmap;
  return (
    <>
      <span className="text-[11px] text-slate-500 whitespace-nowrap">по всей базе, без учёта фильтров</span>
      {collapsed ? (
        <span className="ml-auto flex gap-2.5 text-[12px] text-slate-600 whitespace-nowrap">
          <span>{responsibleCount} ответственных</span>
          <span>{totals.total} поставок</span>
          <span className="font-semibold text-orange-700">{totals.overdue} просрочено</span>
          <span className="font-semibold text-green-700">{totals.delivered} поставлено в {year}</span>
        </span>
      ) : sliceLabel ? (
        <span className="ml-auto text-[11px] font-medium text-blue-800 bg-blue-100 rounded-full px-2 py-0.5 whitespace-nowrap">
          Срез: {sliceLabel}
        </span>
      ) : null}
    </>
  );
}
