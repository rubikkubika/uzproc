'use client';

import { heatmapCellStyle, type SummaryGroup } from '../../utils/summary.utils';

interface Props {
  value: number;
  columnMax: number;
  group: SummaryGroup;
  selected: boolean;
  title?: string;
  onClick: () => void;
}

/**
 * Числовая ячейка сводки с заливкой по «тепловой карте».
 * Нулевое значение показывается точкой и не кликается, чтобы не зашумлять сетку.
 */
export default function SummaryHeatCell({ value, columnMax, group, selected, title, onClick }: Props) {
  const clickable = value > 0;
  return (
    <div
      role={clickable ? 'button' : undefined}
      title={title}
      onClick={clickable ? (e) => { e.stopPropagation(); onClick(); } : undefined}
      style={heatmapCellStyle(value, columnMax, group)}
      className={`h-[30px] m-px flex items-center justify-center rounded-sm tabular-nums text-slate-800 ${
        clickable ? 'cursor-pointer hover:brightness-[.94]' : ''
      } ${selected ? 'outline outline-2 -outline-offset-2 outline-blue-600' : ''}`}
    >
      {clickable ? value : <span className="text-slate-300 text-[10px]">·</span>}
    </div>
  );
}
