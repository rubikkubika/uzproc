'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { OverviewSlaPercentageByMonth } from '../hooks/useOverviewSlaData';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const MONTH_NAMES = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

export interface SlaCombinedChartProps {
  year: number;
  /** Количество завершённых закупок по месяцам назначения (индекс 0 = январь). */
  countsByMonth: number[];
  /** Процент уложившихся в SLA по месяцам (1–12). */
  slaPercentageByMonth: OverviewSlaPercentageByMonth[];
  loading?: boolean;
  error?: string | null;
}

function buildOptions(
  maxBarVal: number,
  slaPercentageByMonth: OverviewSlaPercentageByMonth[]
) {
  const byMonth = new Map(slaPercentageByMonth.map((m) => [m.month, m]));
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 8 },
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      title: { display: false },
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 11 } },
      },
      datalabels: {
        display: (ctx: { datasetIndex: number }) => ctx.datasetIndex === 1,
        formatter: (value: number, ctx: { datasetIndex: number; dataIndex: number }) => {
          if (ctx.datasetIndex === 0) return value > 0 ? value : '';
          const item = byMonth.get(ctx.dataIndex + 1);
          if (item?.totalCompleted === 0) return '';
          return `${Math.round(value)}%`;
        },
        color: (ctx: { datasetIndex: number }) =>
          ctx.datasetIndex === 0 ? '#ffffff' : '#ffffff',
        font: { weight: 'bold' as const, size: 11 },
        backgroundColor: (ctx: { datasetIndex: number }) =>
          ctx.datasetIndex === 1 ? 'rgba(0, 0, 0, 0.92)' : null,
        padding: (ctx: { datasetIndex: number }) =>
          ctx.datasetIndex === 1 ? 4 : 0,
        borderRadius: (ctx: { datasetIndex: number }) =>
          ctx.datasetIndex === 1 ? 0 : 0,
        anchor: (ctx: { datasetIndex: number }) =>
          ctx.datasetIndex === 0 ? ('center' as const) : ('center' as const),
        align: (ctx: { datasetIndex: number }) =>
          ctx.datasetIndex === 0 ? ('center' as const) : ('center' as const),
        offset: (ctx: { datasetIndex: number }) =>
          ctx.datasetIndex === 0 ? 0 : 0,
      },
      tooltip: {
        callbacks: {
          label: (context: { datasetIndex: number; raw?: unknown; dataIndex: number }) => {
            const rawVal = typeof context.raw === 'number' ? context.raw : 0;
            if (context.datasetIndex === 0) {
              return `Закупки: ${rawVal}`;
            }
            const item = byMonth.get(context.dataIndex + 1);
            if (!item || item.totalCompleted === 0) return 'SLA: нет данных';
            return `SLA: ${Math.round(rawVal)}% (${item.metSla}/${item.totalCompleted})`;
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        beginAtZero: true,
        // Запас сверху, чтобы линия SLA не наезжала на столбцы
        max: Math.max(maxBarVal, 1) + Math.max(Math.ceil(maxBarVal * 0.15), 8),
        ticks: { display: false },
        title: { display: false },
        grid: { display: false },
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        min: 0,
        max: 108,
        ticks: { display: false },
        title: { display: false },
        grid: { display: false },
      },
      x: {
        type: 'category' as const,
        ticks: { font: { size: 11 }, maxRotation: 45 },
        barPercentage: 0.55,
        categoryPercentage: 0.85,
        grid: { display: false },
      },
    },
  };
}

/**
 * Объединённая диаграмма: столбцы — закупки назначенные в месяце (левая ось),
 * линия — процент уложившихся в плановый SLA (правая ось).
 */
export function SlaCombinedChart({
  year,
  countsByMonth,
  slaPercentageByMonth,
  loading,
  error,
}: SlaCombinedChartProps) {
  const maxBarVal = Math.max(...(countsByMonth ?? Array(12).fill(0)), 1);
  const sorted = [...(slaPercentageByMonth ?? [])].sort((a, b) => a.month - b.month);
  const percentages = MONTH_NAMES.map((_, i) => {
    const m = sorted.find((x) => x.month === i + 1);
    return m?.percentage != null ? m.percentage : 0;
  });

  const chartData = {
    labels: MONTH_NAMES,
    datasets: [
      {
        type: 'bar' as const,
        label: 'закупки назначенные в месяце',
        data: countsByMonth ?? Array(12).fill(0),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'уложились в SLA, %',
        data: percentages,
        borderColor: 'rgba(0, 0, 0, 1)',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        tension: 0,
        fill: true,
        yAxisID: 'y1',
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow px-2 py-1 h-full w-full min-h-0 min-w-0 flex flex-col justify-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow px-2 py-1 h-full w-full min-h-0 min-w-0 flex flex-col">
      {loading ? (
        <div className="flex-1 min-h-0 flex items-center justify-center text-sm text-gray-500">
          Загрузка…
        </div>
      ) : (
        <div className="flex-1 min-h-0" style={{ minHeight: 180 }}>
          <Chart
            type="bar"
            data={chartData}
            options={buildOptions(maxBarVal, sorted)}
          />
        </div>
      )}
    </div>
  );
}
