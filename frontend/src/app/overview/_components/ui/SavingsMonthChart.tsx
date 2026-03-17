'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { SavingsMonthData } from '../hooks/useOverviewSavingsData';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const MONTH_LABELS = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

function formatAmount(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' млрд';
  if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(1) + ' млн';
  if (Math.abs(value) >= 1_000) return (value / 1_000).toFixed(0) + ' тыс';
  return value.toFixed(0);
}

interface SavingsMonthChartProps {
  data: SavingsMonthData[];
  year: number;
}

function sqrtScale(v: number): number {
  return v >= 0 ? Math.sqrt(v) : -Math.sqrt(-v);
}

export function SavingsMonthChart({ data, year }: SavingsMonthChartProps) {
  const rawMedian = data.map((m) => m.savingsFromMedian);
  const rawContract = data.map((m) => m.savingsFromExistingContract);
  const rawUntyped = data.map((m) => m.savingsUntyped);

  const chartData = {
    labels: MONTH_LABELS,
    datasets: [
      {
        label: 'От медианы',
        data: rawMedian.map(sqrtScale),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 2,
        rawData: rawMedian,
      },
      {
        label: 'От сущ. договора',
        data: rawContract.map(sqrtScale),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderRadius: 2,
        rawData: rawContract,
      },
      {
        label: 'Без типа',
        data: rawUntyped.map(sqrtScale),
        backgroundColor: 'rgba(156, 163, 175, 0.8)',
        borderRadius: 2,
        rawData: rawUntyped,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: `Экономия по месяцам (${year})`,
        font: { size: 12 },
      },
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 10 } },
      },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chartjs Context not assignable to custom dataset shape
          label: (ctx: any) => {
            const raw = ctx.dataset?.rawData?.[ctx.dataIndex] ?? 0;
            return `${ctx.dataset?.label}: ${formatAmount(raw)}`;
          },
        },
      },
      datalabels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chartjs Context not assignable to custom dataset shape
        display: (ctx: any) => {
          const raw = ctx.dataset?.rawData?.[ctx.dataIndex] ?? 0;
          return raw > 0;
        },
        color: '#ffffff',
        font: { weight: 'bold' as const, size: 10 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chartjs Context not assignable to custom dataset shape
        formatter: (_value: number, ctx: any) => {
          const raw = ctx.dataset?.rawData?.[ctx.dataIndex] ?? 0;
          return formatAmount(raw);
        },
        anchor: 'center' as const,
        align: 'center' as const,
      },
    },
    scales: {
      x: { stacked: true, ticks: { font: { size: 10 } } },
      y: {
        stacked: true,
        display: false,
      },
    },
  };

  return <Bar data={chartData} options={options} />;
}
