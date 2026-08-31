'use client';

import { heatmapCellStyle } from '../../utils/summary.utils';
import SummaryHeatCell from './SummaryHeatCell';

interface Props {
  /** Названия статусов — колонки группы */
  statuses: string[];
  /** Количества по статусам для этой строки */
  counts: Record<string, number>;
  /** Максимум по каждой колонке — от него считается насыщенность заливки */
  columnMax: Record<string, number>;
  /** Тон заливки группы в OKLCH */
  hue: number;
  responsible: string;
  /** Подпись группы для всплывающей подсказки («Статус поставки» / «Статус оплаты») */
  groupLabel: string;
  onCellClick: (responsible: string, status: string) => void;
  /** Класс для первой ячейки группы — разделитель между группами */
  firstCellClassName?: string;
}

/** Ряд ячеек одной группы статусов в строке сводки. */
export default function SummaryStatusCells({
  statuses,
  counts,
  columnMax,
  hue,
  responsible,
  groupLabel,
  onCellClick,
  firstCellClassName = '',
}: Props) {
  return (
    <>
      {statuses.map((status, index) => {
        const value = counts?.[status] ?? 0;
        return (
          <SummaryHeatCell
            key={status}
            value={value}
            style={heatmapCellStyle(value, columnMax[status] ?? 0, hue)}
            title={value > 0 ? `${responsible} · ${groupLabel}: ${status} — ${value}` : undefined}
            onClick={(e) => { e.stopPropagation(); onCellClick(responsible, status); }}
            className={index === 0 ? firstCellClassName : ''}
          />
        );
      })}
    </>
  );
}
