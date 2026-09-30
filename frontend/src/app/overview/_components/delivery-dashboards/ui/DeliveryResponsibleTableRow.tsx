'use client';

import { DELIVERY_TABLE_TD, RESPONSIBLE_LEVEL_LABELS, RESPONSIBLE_ROW_CLASS } from '../constants/delivery-dashboards.constants';
import type { DeliveryResponsibleRow } from '../types/delivery-dashboards.types';
import { formatPercent } from '../utils/delivery-dashboards.utils';

export interface DeliveryResponsibleTableRowProps {
  row: DeliveryResponsibleRow;
  shipmentStatuses: string[];
}

/** Строка таблицы «По ответственным»; фон — по уровню проблемности. */
export function DeliveryResponsibleTableRow({ row, shipmentStatuses }: DeliveryResponsibleTableRowProps) {
  return (
    <tr className={`border-b border-gray-200 ${RESPONSIBLE_ROW_CLASS[row.problemLevel]}`} title={RESPONSIBLE_LEVEL_LABELS[row.problemLevel]}>
      <td className={`${DELIVERY_TABLE_TD} text-left whitespace-nowrap font-medium`}>{row.responsible}</td>
      <td className={`${DELIVERY_TABLE_TD} text-right`}>{row.totalCount}</td>
      {shipmentStatuses.map((status) => (
        <td key={status} className={`${DELIVERY_TABLE_TD} text-right text-gray-700`}>
          {row.countByShipmentStatus[status] || ''}
        </td>
      ))}
      <td className={`${DELIVERY_TABLE_TD} text-right ${row.overdueCount > 0 ? 'text-red-700 font-semibold' : 'text-gray-400'}`}>
        {row.overdueCount}
        {row.overdueShare != null && row.overdueCount > 0 && (
          <span className="text-[10px] text-gray-500 font-normal ml-1">({formatPercent(row.overdueShare)})</span>
        )}
      </td>
      <td className={`${DELIVERY_TABLE_TD} text-right`}>{row.deliveredCount}</td>
      <td className={`${DELIVERY_TABLE_TD} text-right font-semibold`} title={`${row.onTimeCount} из ${row.measurableCount} с известным сроком`}>
        {formatPercent(row.onTimePercentage)}
      </td>
    </tr>
  );
}
