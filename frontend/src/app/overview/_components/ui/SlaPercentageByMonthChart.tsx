'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { OverviewSlaPercentageByMonth } from '../hooks/useOverviewSlaData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  ChartDataLabels
);

const MONTH_NAMES = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

export interface SlaPercentageByMonthChartProps {
  year: number;
  /** Данные с бэкенда: процент уложившихся в SLA по месяцу (1–12). */
  slaPercentageByMonth: OverviewSlaPercentageByMonth[];
  loading?: boolean;
  error?: string | null;
}

function buildChartOptions(slaPercentageByMonth: OverviewSlaPercentageByMonth[]) {
  const byMonth = new Map(slaPercentageByMonth.map((m) => [m.month, m]));
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 16 },
    plugins: {
      title: { display: false },
      legend: { display: false },
      datalabels: {
        display: true,
        color: '#1e40af',
        font: { weight: 'bold' as const, size: 11 },
        formatter: (value: number, ctx: { dataIndex: number }) => {
          const item = byMonth.get(ctx.dataIndex + 1);
          if (item?.totalCompleted === 0) return '—';
          return `${Math.round(value)}%`;
        },
        anchor: 'center' as const,
        align: 'top' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: { raw?: unknown; dataIndex: number }) => {
            const rawVal = typeof context.raw === 'number' ? context.raw : 0;
            const item = byMonth.get(context.dataIndex + 1);
            if (!item || item.totalCompleted === 0) return 'Нет данных';
            return `${Math.round(rawVal)}% (${item.metSla}/${item.totalCompleted})`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { stepSize: 20, font: { size: 11 } },
      },
      x: {
        ticks: { font: { size: 11 }, maxRotation: 45 },
      },
    },
  };
}

/**
 * Линейная диаграмма: по оси X — месяцы года, по оси Y — процент закупок,
 * по которым уложились в плановый SLA (расчёт на бэкенде).
 */
export function SlaPercentageByMonthChart({
  year,
  slaPercentageByMonth,
  loading,
  error,
}: SlaPercentageByMonthChartProps) {
  const sorted = [...(slaPercentageByMonth ?? [])].sort((a, b) => a.month - b.month);
  const percentages = MONTH_NAMES.map((_, i) => {
    const m = sorted.find((x) => x.month === i + 1);
    return m?.percentage != null ? m.percentage : 0;
  });

  const chartData = {
    labels: MONTH_NAMES,
    datasets: [
      {
        label: '% уложились в SLA',
        data: percentages,
        borderColor: 'rgba(34, 197, 94, 1)',
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Уложились в плановый SLA, % ({year})
        </h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">
        Уложились в плановый SLA, % ({year})
      </h3>
      {loading ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-500">
          Загрузка…
        </div>
      ) : (
        <div className="min-h-[220px]" style={{ height: 220 }}>
          <Line data={chartData} options={buildChartOptions(sorted)} />
        </div>
      )}
    </div>
  );
}
