'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { ContractApprovalDurationMonthRow } from '../hooks/useContractApprovalDurationByMonth';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const MONTH_NAMES = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

export interface ContractApprovalDurationByMonthChartProps {
  year: number;
  months: ContractApprovalDurationMonthRow[];
  loading?: boolean;
  error?: string | null;
}

function buildOptions(rows: ContractApprovalDurationMonthRow[]) {
  const byMonth = new Map(rows.map((r) => [r.month, r]));
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 12 },
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      title: { display: false },
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 11 }, usePointStyle: true, boxWidth: 8 },
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; raw?: unknown; dataIndex: number }) => {
            const label = context.dataset.label ?? '';
            const rawVal = typeof context.raw === 'number' ? context.raw : null;
            const item = byMonth.get(context.dataIndex + 1);
            let count = 0;
            if (item) {
              if (label.startsWith('Маркет')) count = item.marketCount;
              else if (label.startsWith('Тезкор')) count = item.tezkorOooCount;
              else if (label.startsWith('1П')) count = item.p1Count;
            }
            if (rawVal == null || count === 0) return `${label}: нет данных`;
            return `${label}: ${rawVal.toFixed(1)} дн. (${count} дог.)`;
          },
        },
      },
      datalabels: {
        display: (ctx: { dataset: { data: unknown[] }; dataIndex: number }) => {
          const v = ctx.dataset.data[ctx.dataIndex];
          return typeof v === 'number' && !Number.isNaN(v);
        },
        color: (ctx: { dataset: { borderColor?: unknown } }) =>
          (typeof ctx.dataset.borderColor === 'string' ? ctx.dataset.borderColor : '#374151'),
        font: { weight: 'bold' as const, size: 10 },
        align: 'top' as const,
        anchor: 'center' as const,
        formatter: (value: number) =>
          (typeof value === 'number' && !Number.isNaN(value)) ? value.toFixed(1) : '',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { display: false },
      },
      x: {
        ticks: { font: { size: 11 }, maxRotation: 45 },
      },
    },
  };
}

/** Преобразует null в NaN, чтобы Chart.js рвал линию на месяцах без данных. */
function toSeries(rows: ContractApprovalDurationMonthRow[], pick: (r: ContractApprovalDurationMonthRow) => number | null): number[] {
  return MONTH_NAMES.map((_, i) => {
    const r = rows.find((x) => x.month === i + 1);
    const v = r ? pick(r) : null;
    return v != null ? v : NaN;
  });
}

/**
 * Линейная диаграмма: по оси X — месяцы года, по оси Y — средний срок согласования
 * (дн.). Три линии по сегментам: Маркет, Тезкор ООО, 1П.
 */
export function ContractApprovalDurationByMonthChart({
  year,
  months,
  loading,
  error,
}: ContractApprovalDurationByMonthChartProps) {
  const rows = [...(months ?? [])].sort((a, b) => a.month - b.month);

  const chartData = {
    labels: MONTH_NAMES,
    datasets: [
      {
        label: 'Маркет',
        data: toSeries(rows, (r) => r.marketAvgDays),
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        tension: 0.3,
        spanGaps: false,
      },
      {
        label: 'Тезкор ООО',
        data: toSeries(rows, (r) => r.tezkorOooAvgDays),
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.3,
        spanGaps: false,
      },
      {
        label: '1П',
        data: toSeries(rows, (r) => r.p1AvgDays),
        borderColor: 'rgba(249, 115, 22, 1)',
        backgroundColor: 'rgba(249, 115, 22, 0.2)',
        tension: 0.3,
        spanGaps: false,
      },
    ],
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Средний срок согласования по месяцам ({year})
        </h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 flex flex-col h-full min-h-0">
      <h3 className="text-sm font-medium text-gray-700 mb-2 flex-shrink-0">
        Средний срок согласования по месяцам ({year})
      </h3>
      {loading ? (
        <div className="flex-1 min-h-[200px] flex items-center justify-center text-sm text-gray-500">
          Загрузка…
        </div>
      ) : (
        <div className="flex-1 min-h-0 relative">
          <Line data={chartData} options={buildOptions(rows)} />
        </div>
      )}
    </div>
  );
}
