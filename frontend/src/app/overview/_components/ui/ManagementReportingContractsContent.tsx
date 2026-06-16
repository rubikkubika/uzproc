'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { ContractDocumentsCountDashboardContent } from './ContractDocumentsCountDashboardContent';
import { ContractApprovalDurationByMonthChart } from './ContractApprovalDurationByMonthChart';
import { useContractApprovalDurationByMonth } from '../hooks/useContractApprovalDurationByMonth';

interface Props {
  enabled: boolean;
}

/**
 * Вкладка «Договоры» в управленческой отчётности:
 * — линейная диаграмма среднего срока согласования по месяцам (Маркет / Тезкор ООО / 1П);
 * — дашборд «Кол-во документов» по договорникам и месяцам.
 */
export function ManagementReportingContractsContent({ enabled }: Props) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [year, setYear] = useState<number>(currentYear);

  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 4; i <= currentYear + 1; i++) years.push(i);
    return years;
  }, [currentYear]);

  const { data, loading, error } = useContractApprovalDurationByMonth(year, enabled);

  // Высота блока «Кол-во документов» — чтобы диаграмма согласований была ровно такой же по высоте
  const leftRef = useRef<HTMLDivElement>(null);
  const [leftHeight, setLeftHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = leftRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const h = Math.round(e.contentRect.height);
        setLeftHeight((prev) => (prev !== h ? h : prev));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-2 items-start">
      {/* Слева — кол-во документов (таблица не обрезается: прокрутка по горизонтали внутри) */}
      <div ref={leftRef} className="min-w-0">
        <ContractDocumentsCountDashboardContent enabled={enabled} />
      </div>

      {/* Справа — средний срок согласования по месяцам (высота = высоте блока кол-ва документов) */}
      <div
        className="min-w-0 flex flex-col gap-2"
        style={leftHeight ? { height: `${leftHeight}px` } : undefined}
      >
        <div className="bg-white rounded shadow px-3 py-2 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="mr-contracts-year" className="text-xs font-medium text-gray-700">
              Год создания договора:
            </label>
            <select
              id="mr-contracts-year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="px-2 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {availableYears.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <ContractApprovalDurationByMonthChart
            year={year}
            months={data?.months ?? []}
            loading={loading}
            error={error}
          />
        </div>
      </div>
    </div>
  );
}
