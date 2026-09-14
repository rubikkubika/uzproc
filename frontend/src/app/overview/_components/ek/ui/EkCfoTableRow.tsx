'use client';

import { EK_COUNT_BAR_COLOR, EK_RISK_STYLES } from '../constants/ek.constants';
import type { EkRow } from '../types/ek.types';
import {
  formatAmountFull,
  formatAmountShort,
  formatCount,
  formatPercent,
  formatPercentPrecise,
} from '../utils/ek-format.utils';
import { EkShareBar } from './EkShareBar';

interface EkCfoTableRowProps {
  row: EkRow;
  /** Знак валюты для полных сумм строки */
  currency: string | null;
}

/** Строка таблицы ЕК по ЦФО: доли по сумме и количеству, заявки и суммы «ЕК / всего» */
export function EkCfoTableRow({ row, currency }: EkCfoTableRowProps) {
  const risk = EK_RISK_STYLES[row.risk];
  const tooltip = [
    row.cfo,
    `Всего: ${formatAmountFull(row.totalAmount, currency)} (${formatCount(row.totalCount)} заявок)`,
    `ЕК: ${formatAmountFull(row.singleSupplierAmount, currency)} (${formatCount(row.singleSupplierCount)} заявок)`,
    `Доля ЕК: ${formatPercentPrecise(row.percentByAmount)}`,
  ].join('\n');

  return (
    <tr title={tooltip} className="border-b border-gray-100 hover:bg-gray-50">
      <td className="px-2 py-[7px] truncate text-gray-900">{row.cfo}</td>
      <td className="px-2 py-[7px]">
        <EkShareBar
          percent={row.isEmpty ? 0 : row.percentByAmount}
          label={row.isEmpty ? '—' : formatPercent(row.percentByAmount)}
          barColor={risk.bar}
          textColor={risk.text}
          strong
        />
      </td>
      <td className="px-2 py-[7px]">
        <EkShareBar
          percent={row.totalCount > 0 ? row.percentByCount : 0}
          label={row.totalCount > 0 ? formatPercent(row.percentByCount) : '—'}
          barColor={EK_COUNT_BAR_COLOR}
          textColor="#475569"
        />
      </td>
      <td className="px-2 py-[7px] text-right tabular-nums whitespace-nowrap text-gray-900">
        {formatCount(row.singleSupplierCount)}
        <span className="text-gray-400"> / {formatCount(row.totalCount)}</span>
      </td>
      <td className="px-2 py-[7px] text-right tabular-nums whitespace-nowrap text-gray-900">
        {row.isEmpty ? '—' : formatAmountShort(row.singleSupplierAmount)}
        <span className="text-gray-400"> / {formatAmountShort(row.totalAmount)}</span>
      </td>
    </tr>
  );
}
