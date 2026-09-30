'use client';

import { DELIVERY_TABLE_TD, DELIVERY_TABLE_TH } from '../constants/delivery-dashboards.constants';
import type { DeliveryResponsibleRow, DeliveryResponsibleTotals } from '../types/delivery-dashboards.types';
import { formatPercent, percentOf } from '../utils/delivery-dashboards.utils';
import { DeliveryResponsibleTableRow } from './DeliveryResponsibleTableRow';

export interface DeliveryResponsibleTableProps {
  year: number;
  rows: DeliveryResponsibleRow[];
  shipmentStatuses: string[];
  totals: DeliveryResponsibleTotals;
}

/**
 * Таблица «Ответственный × статусы поставки»: всего, разбивка по статусам (все поставки),
 * просрочено на сегодня (доля от непоставленных), поставлено за год и % в срок за год.
 */
export function DeliveryResponsibleTable({ year, rows, shipmentStatuses, totals }: DeliveryResponsibleTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className={`${DELIVERY_TABLE_TH} text-left`}>Ответственный</th>
            <th className={`${DELIVERY_TABLE_TH} text-right`}>Всего</th>
            {shipmentStatuses.map((status) => (
              <th key={status} className={`${DELIVERY_TABLE_TH} text-right`}>
                {status}
              </th>
            ))}
            <th className={`${DELIVERY_TABLE_TH} text-right`} title="Не поставлено, плановая дата прошла; в скобках — доля от непоставленных">
              Просрочено
            </th>
            <th className={`${DELIVERY_TABLE_TH} text-right`}>Поставлено в {year}</th>
            <th className={`${DELIVERY_TABLE_TH} text-right`}>% в срок</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((row) => (
            <DeliveryResponsibleTableRow key={row.responsible} row={row} shipmentStatuses={shipmentStatuses} />
          ))}
        </tbody>
        <tfoot className="bg-gray-100 font-semibold">
          <tr>
            <td className={`${DELIVERY_TABLE_TD} text-left`}>Итого</td>
            <td className={`${DELIVERY_TABLE_TD} text-right`}>{totals.totalCount}</td>
            {shipmentStatuses.map((status) => (
              <td key={status} className={`${DELIVERY_TABLE_TD} text-right`}>
                {totals.byShipmentStatus[status] ?? 0}
              </td>
            ))}
            <td className={`${DELIVERY_TABLE_TD} text-right text-red-700`}>{totals.overdueCount}</td>
            <td className={`${DELIVERY_TABLE_TD} text-right`}>{totals.deliveredCount}</td>
            <td className={`${DELIVERY_TABLE_TD} text-right`}>
              {formatPercent(percentOf(totals.onTimeCount, totals.measurableCount))}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
