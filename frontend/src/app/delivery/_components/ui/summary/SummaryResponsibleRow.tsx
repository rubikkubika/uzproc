'use client';

import type { DeliveryResponsibleSummaryItem, SummaryCellRef } from '../../types/delivery-summary.types';
import type { SummaryHeatmap } from '../../hooks/useSummaryHeatmap';
import SummaryHeatCell from './SummaryHeatCell';
import SummaryStatusCells from './SummaryStatusCells';

export interface SummaryClickHandlers {
  onResponsibleClick: (responsible: string) => void;
  onShipmentStatusClick: (responsible: string, statusLabel: string) => void;
  onPaymentStatusClick: (responsible: string, statusLabel: string) => void;
  onOverdueClick: (responsible: string) => void;
  onDeliveredClick: (responsible: string) => void;
}

interface Props extends SummaryClickHandlers {
  item: DeliveryResponsibleSummaryItem;
  shipmentStatuses: string[];
  paymentStatuses: string[];
  heatmap: SummaryHeatmap;
  year: number;
  selectedResponsible: string;
  selectedCell: SummaryCellRef | null;
}

/** Строка ответственного в сводке: ФИО и ячейки с тепловой заливкой. Клик по строке — все поставки ответственного. */
export default function SummaryResponsibleRow({
  item,
  shipmentStatuses,
  paymentStatuses,
  heatmap,
  year,
  selectedResponsible,
  selectedCell,
  ...handlers
}: Props) {
  const name = item.responsible;
  const rowSelected = selectedResponsible === name;
  const cellSelected = (kind: SummaryCellRef['kind']) => selectedCell?.responsible === name && selectedCell.kind === kind;

  return (
    <div
      onClick={() => handlers.onResponsibleClick(name)}
      className={`grid border-b border-slate-100 cursor-pointer ${rowSelected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'}`}
      style={{ gridTemplateColumns: heatmap.gridTemplate }}
    >
      <div className={`h-[30px] px-3 flex items-center gap-1.5 whitespace-nowrap overflow-hidden ${rowSelected ? 'text-blue-800' : 'text-slate-900'}`}>
        {rowSelected && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />}
        <span className="truncate font-medium" title={name}>{name}</span>
      </div>
      <SummaryStatusCells
        statuses={shipmentStatuses}
        counts={item.countByShipmentStatus}
        columnMax={heatmap.columnMax.shipment}
        kind="shipment"
        responsible={name}
        selectedCell={selectedCell}
        onCellClick={handlers.onShipmentStatusClick}
      />
      <div />
      <SummaryStatusCells
        statuses={paymentStatuses}
        counts={item.countByPaymentStatus}
        columnMax={heatmap.columnMax.payment}
        kind="payment"
        responsible={name}
        selectedCell={selectedCell}
        onCellClick={handlers.onPaymentStatusClick}
      />
      <div />
      <SummaryHeatCell
        value={item.totalCount}
        columnMax={heatmap.columnMax.total}
        group="total"
        selected={cellSelected('total')}
        title={`${name}: всего ${item.totalCount}`}
        onClick={() => handlers.onResponsibleClick(name)}
      />
      <SummaryHeatCell
        value={item.overdueCount}
        columnMax={heatmap.columnMax.overdue}
        group="overdue"
        selected={cellSelected('overdue')}
        title={item.overdueCount > 0 ? `${name}: просрочено ${item.overdueCount}` : undefined}
        onClick={() => handlers.onOverdueClick(name)}
      />
      <SummaryHeatCell
        value={item.deliveredCount}
        columnMax={heatmap.columnMax.delivered}
        group="delivered"
        selected={cellSelected('delivered')}
        title={item.deliveredCount > 0 ? `${name}: поставлено за ${year} — ${item.deliveredCount}` : undefined}
        onClick={() => handlers.onDeliveredClick(name)}
      />
    </div>
  );
}
