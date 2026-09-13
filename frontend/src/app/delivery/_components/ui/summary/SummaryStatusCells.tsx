'use client';

import type { SummaryCellRef } from '../../types/delivery-summary.types';
import SummaryHeatCell from './SummaryHeatCell';

interface Props {
  /** Названия статусов — колонки группы */
  statuses: string[];
  /** Количества по статусам для этой строки */
  counts: Record<string, number>;
  /** Максимум по каждой колонке — от него считается насыщенность заливки */
  columnMax: Record<string, number>;
  kind: 'shipment' | 'payment';
  responsible: string;
  selectedCell: SummaryCellRef | null;
  onCellClick: (responsible: string, status: string) => void;
}

const GROUP_LABEL = { shipment: 'Статус поставки', payment: 'Статус оплаты' } as const;

/** Ряд ячеек одной группы статусов в строке сводки. */
export default function SummaryStatusCells({ statuses, counts, columnMax, kind, responsible, selectedCell, onCellClick }: Props) {
  return (
    <>
      {statuses.map((status) => {
        const value = counts?.[status] ?? 0;
        return (
          <SummaryHeatCell
            key={status}
            value={value}
            columnMax={columnMax[status] ?? 0}
            group={kind}
            selected={selectedCell?.responsible === responsible && selectedCell.kind === kind && selectedCell.status === status}
            title={value > 0 ? `${responsible} · ${GROUP_LABEL[kind]}: ${status} — ${value}` : undefined}
            onClick={() => onCellClick(responsible, status)}
          />
        );
      })}
    </>
  );
}
