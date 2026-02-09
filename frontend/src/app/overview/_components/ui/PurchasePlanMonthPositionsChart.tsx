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
  /** Заявки (закупка), связанные с планом, созданные в месяце */
  requestsPurchasePlannedCount: number;
  /** Заявки (закупка), несвязанные с планом, созданные в месяце */
  requestsPurchaseNonPlannedCount: number;
  /** Заявки (закупка) со статусом «Заявка не утверждена», созданные в месяце */
  requestsPurchaseUnapprovedCount: number;
  /** Заявки (закупка) в состоянии «Исключена», созданные в месяце */
  requestsPurchaseExcludedCount: number;
}

const chartOptions = (maxVal: number) => ({
  responsive: true,
  maintainAspectRatio: false,
  layout: { padding: 16 },
  plugins: {
    title: { display: false },
    legend: { display: false },
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
      ticks: { display: false },
    },
    x: {
      ticks: { font: { size: 11 } },
    },
  },
});

/**
 * Две столбчатые диаграммы:
 * 1) План: Запланированы, Заявки инициированы, Исключена.
 * 2) Заявки на закупку: Плановые, Внеплановые, Неутверждена, Исключена.
 */
export function PurchasePlanMonthPositionsChart({
  marketCount,
  linkedToRequestCount,
  excludedCount,
  requestsPurchasePlannedCount,
  requestsPurchaseNonPlannedCount,
  requestsPurchaseUnapprovedCount,
  requestsPurchaseExcludedCount,
}: PurchasePlanMonthPositionsChartProps) {
  const planMax = Math.max(marketCount, linkedToRequestCount, excludedCount, 1) + 2;
  const requestsMax =
    Math.max(
      requestsPurchasePlannedCount,
      requestsPurchaseNonPlannedCount,
      requestsPurchaseUnapprovedCount,
      requestsPurchaseExcludedCount,
      1
    ) + 2;

  const planChartData = {
    labels: ['Запланированы', 'Заявки инициированы', 'Исключена'],
    datasets: [
      {
        label: 'Позиций',
        data: [marketCount, linkedToRequestCount, excludedCount],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const requestsChartData = {
    labels: [
      'Плановые',
      'Внеплановые',
      'Неутверждена',
      'Исключена',
    ],
    datasets: [
      {
        label: 'Заявок',
        data: [
          requestsPurchasePlannedCount,
          requestsPurchaseNonPlannedCount,
          requestsPurchaseUnapprovedCount,
          requestsPurchaseExcludedCount,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(34, 197, 94, 1)',
          'rgba(59, 130, 246, 1)',
          'rgba(251, 191, 36, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full min-w-0">
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="text-xs font-medium text-gray-700 mb-1">План</div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex-1 min-h-[180px]" style={{ height: 200 }}>
          <Bar data={planChartData} options={chartOptions(planMax)} />
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="text-xs font-medium text-gray-700 mb-1">Заявки на закупку</div>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 flex-1 min-h-[180px]" style={{ height: 200 }}>
          <Bar data={requestsChartData} options={chartOptions(requestsMax)} />
        </div>
      </div>
    </div>
  );
}
