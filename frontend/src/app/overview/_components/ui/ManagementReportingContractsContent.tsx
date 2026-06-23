'use client';

import { useMemo, useState } from 'react';
import { ContractDocumentsCountDashboardContent } from './ContractDocumentsCountDashboardContent';
import { ContractCsiMockupCard } from './ContractCsiMockupCard';
import { ContractApprovalDurationDocTypeChart } from './ContractApprovalDurationDocTypeChart';
import { useContractApprovalDurationByMonthMarket } from '../hooks/useContractApprovalDurationByMonthMarket';

interface Props {
  enabled: boolean;
}

/**
 * Вкладка «Договоры» в управленческой отчётности (только сегмент Маркет):
 * — сверху: дашборд «Кол-во документов» по договорникам и месяцам + карточка-заглушка CSI;
 * — снизу: два графика среднего срока согласования по месяцам —
 *   «Договор + ДС» и «Спецификации».
 */
export function ManagementReportingContractsContent({ enabled }: Props) {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [year, setYear] = useState<number>(currentYear);

  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 4; i <= currentYear + 1; i++) years.push(i);
    return years;
  }, [currentYear]);

  const { data, loading, error } = useContractApprovalDurationByMonthMarket(year, enabled);
  const months = data?.months ?? [];

  const contractDsPoints = months.map((m) => ({
    month: m.month,
    avgDays: m.contractDsAvgDays,
    count: m.contractDsCount,
  }));
  const specPoints = months.map((m) => ({
    month: m.month,
    avgDays: m.specAvgDays,
    count: m.specCount,
  }));

  return (
    <div className="flex flex-col gap-2">
      {/* Верхний ряд: кол-во документов (слева) + CSI-заглушка (справа) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-2 items-stretch">
        <div className="min-w-0">
          <ContractDocumentsCountDashboardContent enabled={enabled} />
        </div>
        <div className="min-w-0">
          <ContractCsiMockupCard />
        </div>
      </div>

      {/* Панель фильтров над графиками: год + индикатор сегмента (жёстко Маркет) */}
      <div className="bg-white rounded shadow px-3 py-2">
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
          <span className="text-xs text-gray-500">Сегмент:</span>
          <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5">
            Маркет
          </span>
        </div>
      </div>

      {/* Графики срока согласования по типам документа (только Маркет) —
          в один ряд: слева «Договор + ДС», справа «Спецификации», на одной высоте */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 items-stretch h-[240px]">
        <div className="min-w-0 flex">
          <div className="flex-1 min-w-0 flex">
            <ContractApprovalDurationDocTypeChart
              title={`Срок согласования: Договор + ДС (${year})`}
              points={contractDsPoints}
              color="rgba(59, 130, 246, 1)"
              loading={loading}
              error={error}
            />
          </div>
        </div>
        <div className="min-w-0 flex">
          <div className="flex-1 min-w-0 flex">
            <ContractApprovalDurationDocTypeChart
              title={`Срок согласования: Спецификации (${year})`}
              points={specPoints}
              color="rgba(16, 185, 129, 1)"
              loading={loading}
              error={error}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
