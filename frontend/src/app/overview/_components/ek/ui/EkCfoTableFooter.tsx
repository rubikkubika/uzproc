'use client';

import { EK_COUNT_BAR_COLOR, EK_RISK_STYLES } from '../constants/ek.constants';
import type { EkTotals } from '../types/ek.types';
import { formatAmountFull, formatAmountShort, formatCount, formatPercent } from '../utils/ek-format.utils';
import { EkShareBar } from './EkShareBar';

interface EkCfoTableFooterProps {
  totals: EkTotals;
  currency: string | null;
}

/** Строка «Итого» таблицы ЕК */
export function EkCfoTableFooter({ totals, currency }: EkCfoTableFooterProps) {
  const risk = EK_RISK_STYLES[totals.risk];
  return (
    <tfoot>
      <tr className="border-t border-gray-200 font-semibold text-gray-900">
        <td className="px-2 py-2">Итого</td>
        <td className="px-2 py-2">
          <EkShareBar
            percent={totals.percentByAmount}
            label={formatPercent(totals.percentByAmount)}
            barColor={risk.bar}
            textColor={risk.text}
          />
        </td>
        <td className="px-2 py-2">
          <EkShareBar
            percent={totals.percentByCount}
            label={formatPercent(totals.percentByCount)}
            barColor={EK_COUNT_BAR_COLOR}
            textColor="#475569"
          />
        </td>
        <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
          {formatCount(totals.singleSupplierCount)}
          <span className="text-gray-400 font-normal"> / {formatCount(totals.totalCount)}</span>
        </td>
        <td
          className="px-2 py-2 text-right tabular-nums whitespace-nowrap"
          title={`ЕК: ${formatAmountFull(totals.singleSupplierAmount, currency)}\nВсего: ${formatAmountFull(totals.totalAmount, currency)}`}
        >
          {formatAmountShort(totals.singleSupplierAmount)}
          <span className="text-gray-400 font-normal"> / {formatAmountShort(totals.totalAmount)}</span>
        </td>
      </tr>
    </tfoot>
  );
}
