'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  ChartDataLabels
);

interface PurchasePlanMonthPositionsChartProps {
  /** Количество позиций, где компания исполнитель — Маркет (запланированы) */
  marketCount: number;
  /** Количество позиций, связанных с заявкой */
  linkedToRequestCount: number;
  /** Количество позиций в статусе «Исключена» */
  excludedCount: number;
  /** Заявки с типом закупка, созданные в месяце блока */
  requestsPurchaseCreatedInMonthCount: number;
}

/**
 * Столбчатая диаграмма: запланированы, связаны с заявкой, исключена, заявок (закупка).
 */
export function PurchasePlanMonthPositionsChart({
  marketCount,
  linkedToRequestCount,
  excludedCount,
  requestsPurchaseCreatedInMonthCount,
}: PurchasePlanMonthPositionsChartProps) {
  const maxVal =
    Math.max(
      marketCount,
      linkedToRequestCount,
      excludedCount,
      requestsPurchaseCreatedInMonthCount,
      1
    ) + 2;

  const chartData = {
    labels: ['Запланированы', 'Заявки инициированы', 'Исключена', 'Заявок (закупка)'],
    datasets: [
      {
        label: 'Позиций',
        data: [
          marketCount,
          linkedToRequestCount,
          excludedCount,
          requestsPurchaseCreatedInMonthCount,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(168, 85, 247, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(239, 68, 68, 1)',
          'rgba(168, 85, 247, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: 16,
    },
    plugins: {
      title: {
        display: false,
      },
      legend: {
        display: false,
      },
      datalabels: {
        display: true,
        color: '#ffffff',
        font: { weight: 'bold' as const, size: 14 },
        formatter: (value: number) => value,
        anchor: 'center' as const,
        align: 'center' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: maxVal,
        display: false,
        ticks: {
          display: false,
        },
      },
      x: {
        ticks: {
          font: { size: 11 },
        },
      },
    },
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3" style={{ height: 200 }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}
