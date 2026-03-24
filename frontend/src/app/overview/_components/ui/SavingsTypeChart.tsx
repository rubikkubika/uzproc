'use client';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

function formatAmount(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + ' млрд';
  if (Math.abs(value) >= 1_000_000) return (value / 1_000_000).toFixed(1) + ' млн';
  if (Math.abs(value) >= 1_000) return (value / 1_000).toFixed(0) + ' тыс';
  return value.toFixed(0);
}

interface SavingsTypeChartProps {
  fromMedian: number;
  fromExistingContract: number;
  untyped: number;
}

export function SavingsTypeChart({ fromMedian, fromExistingContract, untyped }: SavingsTypeChartProps) {
  const hasData = fromMedian > 0 || fromExistingContract > 0 || untyped > 0;

  const chartData = {
    labels: ['От медианы', 'От сущ. договора', 'Комбинированный'],
    datasets: [
      {
        data: [fromMedian, fromExistingContract, untyped],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
        borderWidth: 1,
        borderColor: '#fff',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'По типу экономии',
        font: { size: 12 },
      },
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: { font: { size: 10 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { label?: string; parsed: number }) =>
            `${ctx.label}: ${formatAmount(ctx.parsed)}`,
        },
      },
    },
  };

  if (!hasData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-gray-400">Нет данных</p>
      </div>
    );
  }

  return <Doughnut data={chartData} options={options} />;
}
