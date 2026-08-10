'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { ContractSlaMonth } from '../types/contract-sla.types';
import { MONTH_NAMES } from '../utils/contractSlaDashboard.utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Tooltip, Legend, ChartDataLabels);

export interface ContractSlaMonthChartProps {
  year: number;
  slaByMonth: ContractSlaMonth[];
  loading?: boolean;
  error?: string | null;
}

/**
 * Комбинированная диаграмма по месяцам подписания: столбцы — подписано без нарушения
 * и с нарушением SLA (стек), линия — процент документов без нарушения.
 */
export function ContractSlaMonthChart({ year, slaByMonth, loading, error }: ContractSlaMonthChartProps) {
  const byMonth = new Map(slaByMonth.map((m) => [m.month, m]));
  const met = MONTH_NAMES.map((_, i) => byMonth.get(i + 1)?.metSla ?? 0);
  const violated = MONTH_NAMES.map((_, i) => {
    const item = byMonth.get(i + 1);
    return item ? item.totalSigned - item.metSla : 0;
  });
  const percentage = MONTH_NAMES.map((_, i) => byMonth.get(i + 1)?.percentage ?? null);

  const chartData = {
    labels: MONTH_NAMES,
    datasets: [
      {
        type: 'line' as const,
        label: '% без нарушения',
        data: percentage,
        yAxisID: 'yPercent',
        borderColor: 'rgba(37, 99, 235, 1)',
        backgroundColor: 'rgba(37, 99, 235, 1)',
        borderWidth: 2,
        tension: 0.3,
        spanGaps: true,
        datalabels: {
          display: (ctx: { dataIndex: number }) => percentage[ctx.dataIndex] != null,
          color: '#1e40af',
          font: { weight: 'bold' as const, size: 10 },
          align: 'top' as const,
          formatter: (value: number | null) => (value != null ? `${Math.round(value)}%` : ''),
        },
      },
      {
        type: 'bar' as const,
        label: 'Без нарушения',
        data: met,
        yAxisID: 'yCount',
        backgroundColor: 'rgba(34, 197, 94, 0.75)',
        stack: 'signed',
        datalabels: { display: false },
      },
      {
        type: 'bar' as const,
        label: 'С нарушением',
        data: violated,
        yAxisID: 'yCount',
        backgroundColor: 'rgba(239, 68, 68, 0.75)',
        stack: 'signed',
        datalabels: { display: false },
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 12, right: 4, bottom: 0, left: 4 } },
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: { boxWidth: 10, font: { size: 10 }, padding: 6 },
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; raw: unknown; dataIndex: number }) => {
            const item = byMonth.get(context.dataIndex + 1);
            if (context.dataset.label === '% без нарушения') {
              if (!item || item.totalSigned === 0) return 'Нет подписанных';
              return `${Math.round(item.percentage ?? 0)}% (${item.metSla}/${item.totalSigned})`;
            }
            return `${context.dataset.label}: ${typeof context.raw === 'number' ? context.raw : 0}`;
          },
        },
      },
    },
    scales: {
      yCount: {
        beginAtZero: true,
        stacked: true,
        position: 'left' as const,
        ticks: { font: { size: 10 }, precision: 0 },
        title: { display: false },
      },
      yPercent: {
        beginAtZero: true,
        max: 100,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: { font: { size: 10 }, stepSize: 25, callback: (v: string | number) => `${v}%` },
      },
      x: { stacked: true, ticks: { font: { size: 10 } } },
    },
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow px-2 py-1 flex-1 min-w-0 h-[200px] flex flex-col justify-center">
        <p className="text-xs font-medium text-gray-700 leading-tight">Подписанные документы и СЛА по месяцам</p>
        <p className="text-xs text-red-600 mt-0.5">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow px-2 py-1 flex-1 min-w-0 h-[200px] flex flex-col">
      <p className="text-xs font-medium text-gray-700 leading-tight">
        Подписанные документы и СЛА по месяцам, {year} г.
      </p>
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-500">Загрузка…</div>
      ) : (
        <div className="flex-1 min-h-0">
          <Chart type="bar" data={chartData} options={options} />
        </div>
      )}
    </div>
  );
}
