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
import type { SavingsByPurchaserData } from '../hooks/useOverviewSavingsData';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const USD_TO_UZS_RATE = 12000;

function formatAmount(value: number, currency: 'UZS' | 'USD' = 'UZS'): string {
  const v = currency === 'USD' ? value / USD_TO_UZS_RATE : value;
  const suffix = currency === 'USD' ? ' $' : '';
  if (v === 0) return '0' + suffix;
  if (Math.abs(v) >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + ' млрд' + suffix;
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' млн' + suffix;
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + ' тыс' + suffix;
  return v.toFixed(0) + suffix;
}

function cbrtScale(v: number): number {
  return v >= 0 ? Math.cbrt(v) : -Math.cbrt(-v);
}

interface SavingsByPurchaserChartProps {
  data: SavingsByPurchaserData[];
  year: number;
  currency?: 'UZS' | 'USD';
}

export function SavingsByPurchaserChart({ data, year, currency = 'UZS' }: SavingsByPurchaserChartProps) {
  const rawMedian = data.map((d) => d.savingsFromMedian);
  const rawContract = data.map((d) => d.savingsFromExistingContract);
  const rawUntyped = data.map((d) => d.savingsUntyped);

  const chartData = {
    labels: data.map((d) => d.purchaser),
    datasets: [
      {
        label: 'От медианы',
        data: rawMedian.map(cbrtScale),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 2,
        rawData: rawMedian,
      },
      {
        label: 'От сущ. договора',
        data: rawContract.map(cbrtScale),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderRadius: 2,
        rawData: rawContract,
      },
      {
        label: 'Комбинированный',
        data: rawUntyped.map(cbrtScale),
        backgroundColor: 'rgba(156, 163, 175, 0.8)',
        borderRadius: 2,
        rawData: rawUntyped,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    plugins: {
      title: {
        display: true,
        text: `Экономия по закупщикам (${year})`,
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
            return `${ctx.dataset?.label}: ${formatAmount(raw, currency)}`;
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
        font: { weight: 'bold' as const, size: 14 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chartjs Context not assignable to custom dataset shape
        formatter: (_value: number, ctx: any) => {
          const raw = ctx.dataset?.rawData?.[ctx.dataIndex] ?? 0;
          return formatAmount(raw, currency);
        },
        anchor: 'center' as const,
        align: 'center' as const,
      },
    },
    scales: {
      x: {
        stacked: true,
        display: false,
      },
      y: {
        stacked: true,
        ticks: { font: { size: 10 } },
      },
    },
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-gray-400">Нет данных</p>
      </div>
    );
  }

  return <Bar data={chartData} options={options} />;
}
