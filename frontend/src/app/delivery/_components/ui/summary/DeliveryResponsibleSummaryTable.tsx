'use client';

import { useMemo } from 'react';
import type { DeliveryResponsibleSummary } from '../../types/delivery-summary.types';
import { heatmapCellStyle, SUMMARY_HUE } from '../../utils/summary.utils';
import SummaryHeatCell from './SummaryHeatCell';
import SummaryStatusCells from './SummaryStatusCells';

interface Props {
  summary: DeliveryResponsibleSummary;
  loading: boolean;
  /** ФИО, по которому сейчас отфильтрована таблица — строка подсвечивается */
  selectedResponsible: string;
  /** Клик по ФИО или «Всего»: все поставки ответственного */
  onResponsibleClick: (responsible: string) => void;
  /** Клик по ячейке статуса поставки */
  onShipmentStatusClick: (responsible: string, statusLabel: string) => void;
  /** Клик по ячейке статуса оплаты */
  onPaymentStatusClick: (responsible: string, statusLabel: string) => void;
  /** Клик по «Просрочено»: не поставлено, плановая дата прошла */
  onOverdueClick: (responsible: string) => void;
  /** Клик по «Поставлено за год»: статус «Поставлено» и фактическая дата в этом году */
  onDeliveredClick: (responsible: string) => void;
}

/** Разделитель между группами колонок */
const GROUP_DIVIDER = 'border-l-2 border-l-gray-300';

/**
 * Сводка поставок по ответственным: строки — ФИО, колонки — статусы поставки и статусы оплаты,
 * далее «Всего», «Просрочено» (не поставлено с прошедшей плановой датой) и «Поставлено» за год.
 * Сделана по образцу сводок в заявках и договорах: клик по любой ячейке переводит таблицу
 * на вкладку «Все» и ставит ровно те фильтры, по которым посчитано это число.
 * Повторный клик по той же ячейке снимает фильтр.
 */
export default function DeliveryResponsibleSummaryTable({
  summary,
  loading,
  selectedResponsible,
  onResponsibleClick,
  onShipmentStatusClick,
  onPaymentStatusClick,
  onOverdueClick,
  onDeliveredClick,
}: Props) {
  const { shipmentStatuses, paymentStatuses, items, year } = summary;

  /** Максимумы по каждой колонке — от них считается насыщенность заливки */
  const columnMax = useMemo(() => {
    const shipment: Record<string, number> = {};
    shipmentStatuses.forEach((status) => {
      shipment[status] = Math.max(0, ...items.map((i) => i.countByShipmentStatus?.[status] ?? 0));
    });
    const payment: Record<string, number> = {};
    paymentStatuses.forEach((status) => {
      payment[status] = Math.max(0, ...items.map((i) => i.countByPaymentStatus?.[status] ?? 0));
    });
    return {
      shipment,
      payment,
      overdue: Math.max(0, ...items.map((i) => i.overdueCount)),
      delivered: Math.max(0, ...items.map((i) => i.deliveredCount)),
    };
  }, [shipmentStatuses, paymentStatuses, items]);

  const totals = useMemo(() => ({
    byShipmentStatus: Object.fromEntries(
      shipmentStatuses.map((s) => [s, items.reduce((sum, i) => sum + (i.countByShipmentStatus?.[s] ?? 0), 0)])
    ) as Record<string, number>,
    byPaymentStatus: Object.fromEntries(
      paymentStatuses.map((s) => [s, items.reduce((sum, i) => sum + (i.countByPaymentStatus?.[s] ?? 0), 0)])
    ) as Record<string, number>,
    total: items.reduce((sum, i) => sum + i.totalCount, 0),
    overdue: items.reduce((sum, i) => sum + i.overdueCount, 0),
    delivered: items.reduce((sum, i) => sum + i.deliveredCount, 0),
  }), [shipmentStatuses, paymentStatuses, items]);

  const totalColCount = shipmentStatuses.length + paymentStatuses.length + 4;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
      <table className="border-collapse text-xs">
        <thead>
          <tr className="bg-white">
            <th
              rowSpan={2}
              className="px-2 py-1.5 text-left text-[11px] font-medium text-gray-500 border-b border-gray-200 border-r border-gray-200 align-middle bg-gray-50"
              style={{ minWidth: 150 }}
            >
              Ответственный
            </th>
            <th
              colSpan={shipmentStatuses.length}
              className="px-2 py-1 text-center text-[11px] font-semibold text-blue-700 bg-gray-50 border-b-2 border-blue-300"
            >
              Статус поставки
            </th>
            <th
              colSpan={paymentStatuses.length}
              className={`px-2 py-1 text-center text-[11px] font-semibold text-violet-700 bg-gray-50 border-b-2 border-violet-300 ${GROUP_DIVIDER}`}
            >
              Статус оплаты
            </th>
            <th
              rowSpan={2}
              className={`px-2 py-1 text-center text-[11px] font-semibold text-gray-900 bg-gray-50 border-b border-gray-200 align-middle whitespace-nowrap ${GROUP_DIVIDER}`}
              title="Все поставки ответственного"
            >
              Всего
            </th>
            <th
              rowSpan={2}
              className={`px-2 py-1 text-center text-[11px] font-semibold text-orange-700 bg-gray-50 border-b border-gray-200 align-middle whitespace-nowrap ${GROUP_DIVIDER}`}
              title="Ещё не поставлено, а плановая дата поставки уже прошла"
            >
              Просрочено
            </th>
            <th
              rowSpan={2}
              className={`px-2 py-1 text-center text-[11px] font-semibold text-emerald-700 bg-gray-50 border-b border-gray-200 align-middle whitespace-nowrap ${GROUP_DIVIDER}`}
              title="Статус «Поставлено» и фактическая дата поставки в этом году"
            >
              Поставлено {year}
            </th>
          </tr>
          <tr className="bg-gray-50">
            {shipmentStatuses.map((status) => (
              <th
                key={`ship-${status}`}
                className="px-1.5 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap"
                style={{ minWidth: 52 }}
              >
                {status}
              </th>
            ))}
            {paymentStatuses.map((status, index) => (
              <th
                key={`pay-${status}`}
                className={`px-1.5 py-1 text-center text-[10px] font-medium text-gray-500 border-b border-gray-200 whitespace-nowrap ${index === 0 ? GROUP_DIVIDER : ''}`}
                style={{ minWidth: 52 }}
              >
                {status}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={totalColCount} className="px-4 py-6 text-center text-gray-400">Загрузка...</td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={totalColCount} className="px-4 py-6 text-center text-gray-400">Нет данных</td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const isSelected = selectedResponsible === item.responsible;
              return (
                <tr
                  key={item.responsible}
                  onClick={() => onResponsibleClick(item.responsible)}
                  className={`border-b border-gray-100 transition-colors cursor-pointer ${
                    idx % 2 === 0 ? 'bg-white hover:bg-gray-50/60' : 'bg-gray-50/30 hover:bg-gray-50/60'
                  }`}
                >
                  <td className={`px-2 py-1.5 border-r border-gray-200 whitespace-nowrap ${isSelected ? 'bg-blue-50' : ''}`}>
                    <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}>
                      {item.responsible}
                    </span>
                  </td>

                  <SummaryStatusCells
                    statuses={shipmentStatuses}
                    counts={item.countByShipmentStatus}
                    columnMax={columnMax.shipment}
                    hue={SUMMARY_HUE.shipment}
                    responsible={item.responsible}
                    groupLabel="Статус поставки"
                    onCellClick={onShipmentStatusClick}
                  />
                  <SummaryStatusCells
                    statuses={paymentStatuses}
                    counts={item.countByPaymentStatus}
                    columnMax={columnMax.payment}
                    hue={SUMMARY_HUE.payment}
                    responsible={item.responsible}
                    groupLabel="Статус оплаты"
                    onCellClick={onPaymentStatusClick}
                    firstCellClassName={GROUP_DIVIDER}
                  />

                  <td
                    onClick={(e) => { e.stopPropagation(); onResponsibleClick(item.responsible); }}
                    className={`px-2 py-1.5 text-center font-semibold text-gray-900 bg-gray-50 cursor-pointer ${GROUP_DIVIDER}`}
                  >
                    {item.totalCount > 0 ? item.totalCount : <span className="text-gray-300">—</span>}
                  </td>

                  <SummaryHeatCell
                    value={item.overdueCount}
                    style={heatmapCellStyle(item.overdueCount, columnMax.overdue, SUMMARY_HUE.overdue)}
                    title={item.overdueCount > 0 ? `${item.responsible}: просрочено ${item.overdueCount}` : undefined}
                    onClick={(e) => { e.stopPropagation(); onOverdueClick(item.responsible); }}
                    className={GROUP_DIVIDER}
                  />
                  <SummaryHeatCell
                    value={item.deliveredCount}
                    style={heatmapCellStyle(item.deliveredCount, columnMax.delivered, SUMMARY_HUE.delivered)}
                    title={item.deliveredCount > 0 ? `${item.responsible}: поставлено за ${year} — ${item.deliveredCount}` : undefined}
                    onClick={(e) => { e.stopPropagation(); onDeliveredClick(item.responsible); }}
                    className={GROUP_DIVIDER}
                  />
                </tr>
              );
            })
          )}
        </tbody>
        {!loading && items.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
              <td className="px-2 py-1.5 text-xs text-gray-600 border-r border-gray-200">Итого</td>
              {shipmentStatuses.map((status) => (
                <td key={`ship-${status}`} className="py-1.5 px-1.5 text-center text-xs text-gray-700">
                  {totals.byShipmentStatus[status] > 0 ? totals.byShipmentStatus[status] : <span className="text-gray-300">—</span>}
                </td>
              ))}
              {paymentStatuses.map((status, index) => (
                <td
                  key={`pay-${status}`}
                  className={`py-1.5 px-1.5 text-center text-xs text-gray-700 ${index === 0 ? GROUP_DIVIDER : ''}`}
                >
                  {totals.byPaymentStatus[status] > 0 ? totals.byPaymentStatus[status] : <span className="text-gray-300">—</span>}
                </td>
              ))}
              <td className={`px-2 py-1.5 text-center text-xs font-bold text-gray-900 ${GROUP_DIVIDER}`}>
                {totals.total || <span className="text-gray-300">—</span>}
              </td>
              <td className={`px-2 py-1.5 text-center text-xs font-bold text-orange-700 ${GROUP_DIVIDER}`}>
                {totals.overdue || <span className="text-gray-300">—</span>}
              </td>
              <td className={`px-2 py-1.5 text-center text-xs font-bold text-emerald-700 ${GROUP_DIVIDER}`}>
                {totals.delivered || <span className="text-gray-300">—</span>}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
