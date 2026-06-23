'use client';

import React from 'react';
import { MONTHS } from '../constants/specification-feedback.constants';
import { formatCurrency } from '../utils/specification-feedback.utils';

interface EvaluationSummaryProps {
  cfo: string;
  year: number;
  month: number;
  totalSum: number;
  currency: string | null;
  count: number;
}

/** Информационный блок: оцениваемый период, сумма спецификаций и количество. */
export default function EvaluationSummary({
  cfo,
  year,
  month,
  totalSum,
  currency,
  count,
}: EvaluationSummaryProps) {
  const monthLabel = MONTHS.find((m) => m.value === month)?.label ?? '';

  const rows: { label: string; value: string }[] = [
    { label: 'ЦФО:', value: cfo || '-' },
    { label: 'Оцениваемый период:', value: `${monthLabel} ${year}` },
    { label: 'Сумма спецификаций:', value: formatCurrency(totalSum, currency) },
    { label: 'Кол-во:', value: String(count) },
  ];

  return (
    <div className="border border-gray-200 rounded p-3 mb-3 bg-gray-50">
      <div className="space-y-1">
        {rows.map(({ label, value }) => (
          <div key={label} className="grid grid-cols-[150px_1fr] gap-2 items-center">
            <span className="font-medium text-gray-600 text-sm">{label}</span>
            <span className="text-gray-900 text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
