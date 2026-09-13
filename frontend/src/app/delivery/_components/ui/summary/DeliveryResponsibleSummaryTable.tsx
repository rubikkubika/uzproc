'use client';

import type { DeliveryResponsibleSummary, SummaryCellRef } from '../../types/delivery-summary.types';
import type { SummaryHeatmap } from '../../hooks/useSummaryHeatmap';
import SummaryHeaderRows from './SummaryHeaderRows';
import SummaryResponsibleRow, { type SummaryClickHandlers } from './SummaryResponsibleRow';
import SummaryTotalsRow from './SummaryTotalsRow';

interface Props extends SummaryClickHandlers {
  summary: DeliveryResponsibleSummary;
  heatmap: SummaryHeatmap;
  loading: boolean;
  /** ФИО, по которому сейчас отфильтрована таблица — строка подсвечивается */
  selectedResponsible: string;
  selectedCell: SummaryCellRef | null;
}

/**
 * Сводка поставок по ответственным: строки — ФИО, колонки — статусы поставки и статусы оплаты,
 * далее «Всего», «Просрочено» и «Поставлено» за год. Клик по любой ячейке переводит таблицу
 * на вкладку «Все» и ставит ровно те фильтры, по которым посчитано это число.
 * Повторный клик по той же ячейке снимает фильтр.
 */
export default function DeliveryResponsibleSummaryTable({ summary, heatmap, loading, selectedResponsible, selectedCell, ...handlers }: Props) {
  const { shipmentStatuses, paymentStatuses, items, year } = summary;

  if (loading || items.length === 0) {
    return <div className="px-4 py-6 text-center text-[12px] text-slate-400">{loading ? 'Загрузка...' : 'Нет данных'}</div>;
  }

  return (
    <div className="overflow-x-auto text-[12px]">
      <div className="min-w-[900px]">
        <SummaryHeaderRows
          shipmentStatuses={shipmentStatuses}
          paymentStatuses={paymentStatuses}
          year={year}
          gridTemplate={heatmap.gridTemplate}
        />
        {items.map((item) => (
          <SummaryResponsibleRow
            key={item.responsible}
            item={item}
            shipmentStatuses={shipmentStatuses}
            paymentStatuses={paymentStatuses}
            heatmap={heatmap}
            year={year}
            selectedResponsible={selectedResponsible}
            selectedCell={selectedCell}
            {...handlers}
          />
        ))}
        <SummaryTotalsRow shipmentStatuses={shipmentStatuses} paymentStatuses={paymentStatuses} heatmap={heatmap} />
      </div>
    </div>
  );
}
