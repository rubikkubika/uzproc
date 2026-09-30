'use client';

import type { DeliveryCurrencyAmount } from '../types/delivery-dashboards.types';
import { formatAmount } from '../utils/delivery-dashboards.utils';

export interface DeliveryAmountsListProps {
  amounts: DeliveryCurrencyAmount[];
}

/** Суммы по валютам столбиком — каждая валюта отдельной строкой, без пересчёта и сложения. */
export function DeliveryAmountsList({ amounts }: DeliveryAmountsListProps) {
  if (amounts.length === 0) return <span className="text-[10px] text-gray-400">сумм нет</span>;
  return (
    <ul className="space-y-0">
      {amounts.map((a) => (
        <li key={a.currency} className="text-[10px] text-gray-600 tabular-nums leading-tight whitespace-nowrap">
          {formatAmount(a.amount)} <span className="text-gray-400">{a.currency}</span>
        </li>
      ))}
    </ul>
  );
}
