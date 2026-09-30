'use client';

import type { DeliveryCurrencyAmount } from '../types/delivery-dashboards.types';
import { DeliveryAmountsList } from './DeliveryAmountsList';

export type DeliveryKpiTone = 'neutral' | 'good' | 'bad' | 'warn';

export interface DeliveryKpiCardProps {
  label: string;
  value: string | number;
  /** Пояснение под числом (период, определение). */
  hint?: string;
  /** Суммы по валютам — если показатель денежный. */
  amounts?: DeliveryCurrencyAmount[];
  tone?: DeliveryKpiTone;
  loading?: boolean;
}

const TONE_CLASS: Record<DeliveryKpiTone, string> = {
  neutral: 'text-gray-900',
  good: 'text-green-700',
  bad: 'text-red-700',
  warn: 'text-amber-700',
};

/** Плитка KPI: крупное число, подпись и (опционально) суммы по валютам. */
export function DeliveryKpiCard({ label, value, hint, amounts, tone = 'neutral', loading }: DeliveryKpiCardProps) {
  return (
    <div className="bg-white rounded-lg shadow px-2 py-1.5 flex flex-col min-w-[140px] flex-1">
      <p className="text-xs font-medium text-gray-700 leading-tight">{label}</p>
      {hint && <p className="text-[10px] text-gray-500 leading-tight">{hint}</p>}
      {loading ? (
        <p className="text-xs text-gray-500 mt-1">Загрузка…</p>
      ) : (
        <>
          <p className={`text-2xl font-semibold tabular-nums leading-tight mt-0.5 ${TONE_CLASS[tone]}`}>{value}</p>
          {amounts && <DeliveryAmountsList amounts={amounts} />}
        </>
      )}
    </div>
  );
}
