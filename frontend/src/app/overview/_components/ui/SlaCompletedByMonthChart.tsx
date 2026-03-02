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

const MONTH_NAMES = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

export interface SlaCompletedByMonthChartProps {
  /** Год для подписи */
  year: number;
  /** Количество закупок, завершённых в месяце (индекс 0 = январь, 11 = декабрь) */
  countsByMonth: number[];
  /** Загрузка данных */
  loading?: boolean;
  /** Ошибка загрузки */
  error?: string | null;
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
      font: { weight: 'bold' as const, size: 12 },
      formatter: (value: number) => (value > 0 ? value : ''),
      anchor: 'center' as const,
      align: 'center' as const,
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      max: Math.max(maxVal, 1) + 1,
      ticks: { stepSize: 1, font: { size: 11 } },
    },
    x: {
      ticks: { font: { size: 11 }, maxRotation: 45 },
    },
  },
});

/**
 * Столбчатая диаграмма: по горизонтальной оси — месяцы года,
 * по столбцам — закупки, завершённые в месяце.
 */
export function SlaCompletedByMonthChart({
  year,
  countsByMonth,
  loading,
  error,
}: SlaCompletedByMonthChartProps) {
  const maxVal = Math.max(...(countsByMonth ?? Array(12).fill(0)), 1);
  const chartData = {
    labels: MONTH_NAMES,
    datasets: [
      {
        label: 'закупки завершённые в месяце',
        data: countsByMonth ?? Array(12).fill(0),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
    ],
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Закупки завершённые по месяцам ({year})
        </h3>
        <p className="text-xs text-gray-500 mb-1">закупки завершённые в месяце</p>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-2">
        Закупки завершённые по месяцам ({year})
      </h3>
      <p className="text-xs text-gray-500 mb-1">закупки завершённые в месяце</p>
      {loading ? (
        <div className="h-[220px] flex items-center justify-center text-sm text-gray-500">
          Загрузка…
        </div>
      ) : (
        <div className="min-h-[220px]" style={{ height: 220 }}>
          <Bar data={chartData} options={chartOptions(maxVal)} />
        </div>
      )}
    </div>
  );
}
