'use client';

import { DELIVERY_TABLE_TD, DELIVERY_TABLE_TH } from '../constants/delivery-dashboards.constants';
import type { DeliverySupplierOverdue } from '../types/delivery-dashboards.types';
import { formatDays } from '../utils/delivery-dashboards.utils';

export interface DeliveryTopSuppliersTableProps {
  rows: DeliverySupplierOverdue[];
}

/** Топ поставщиков по просрочкам: поставлено с опозданием + не поставлено с прошедшей плановой датой. */
export function DeliveryTopSuppliersTable({ rows }: DeliveryTopSuppliersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse border border-gray-300">
        <thead className="bg-gray-50">
          <tr>
            <th className={`${DELIVERY_TABLE_TH} text-right w-8`}>#</th>
            <th className={`${DELIVERY_TABLE_TH} text-left`}>Поставщик</th>
            <th className={`${DELIVERY_TABLE_TH} text-right`}>Всего просрочек</th>
            <th className={`${DELIVERY_TABLE_TH} text-right`}>Поставлено с опозданием</th>
            <th className={`${DELIVERY_TABLE_TH} text-right`}>Не поставлено, срок прошёл</th>
            <th className={`${DELIVERY_TABLE_TH} text-right`}>Средняя задержка</th>
            <th className={`${DELIVERY_TABLE_TH} text-right`}>Макс. задержка</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((row, index) => (
            <tr key={row.supplier} className="border-b border-gray-200 hover:bg-gray-50">
              <td className={`${DELIVERY_TABLE_TD} text-right text-gray-500`}>{index + 1}</td>
              <td className={`${DELIVERY_TABLE_TD} text-left max-w-[320px] truncate`} title={row.supplier}>
                {row.supplier}
              </td>
              <td className={`${DELIVERY_TABLE_TD} text-right font-semibold text-red-700`}>{row.totalCount}</td>
              <td className={`${DELIVERY_TABLE_TD} text-right`}>{row.lateDeliveredCount || ''}</td>
              <td className={`${DELIVERY_TABLE_TD} text-right`}>{row.openOverdueCount || ''}</td>
              <td className={`${DELIVERY_TABLE_TD} text-right`}>{formatDays(row.averageDelayDays)}</td>
              <td className={`${DELIVERY_TABLE_TD} text-right`}>{formatDays(row.maxDelayDays)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
