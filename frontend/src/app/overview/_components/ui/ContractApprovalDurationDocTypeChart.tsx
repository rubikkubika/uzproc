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

export interface DurationDocTypePoint {
  month: number;
  avgDays: number | null;
  count: number;
}

export interface ContractApprovalDurationDocTypeChartProps {
  title: string;
  points: DurationDocTypePoint[];
  color: string;
  loading?: boolean;
  error?: string | null;
}

/** Преобразует null в NaN, чтобы Chart.js рвал линию на месяцах без данных. */
function toSeries(points: DurationDocTypePoint[]): number[] {
  return MONTH_NAMES.map((_, i) => {
    const p = points.find((x) => x.month === i + 1);
    const v = p ? p.avgDays : null;
    return v != null ? v : NaN;
  });
}

function buildOptions(points: DurationDocTypePoint[], label: string, lineColor: string) {
  const byMonth = new Map(points.map((p) => [p.month, p]));
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: 12 },
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      title: { display: false },
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context: { raw?: unknown; dataIndex: number }) => {
            const rawVal = typeof context.raw === 'number' ? context.raw : null;
            const item = byMonth.get(context.dataIndex + 1);
            const count = item ? item.count : 0;
            if (rawVal == null || Number.isNaN(rawVal) || count === 0) return `${label}: нет данных`;
            return `${label}: ${rawVal.toFixed(1)} дн. (${count} док.)`;
          },
        },
      },
      datalabels: {
        display: (ctx: { dataset: { data: unknown[] }; dataIndex: number }) => {
          const v = ctx.dataset.data[ctx.dataIndex];
          return typeof v === 'number' && !Number.isNaN(v);
        },
        // Квадратная плашка в цвет линии с белым текстом
        backgroundColor: lineColor,
        borderRadius: 0,
        color: '#ffffff',
        padding: { top: 4, bottom: 4, left: 5, right: 5 },
        font: { weight: 'bold' as const, size: 10 },
        align: 'center' as const,
        anchor: 'center' as const,
        offset: 0,
        formatter: (value: number) =>
          (typeof value === 'number' && !Number.isNaN(value)) ? value.toFixed(1) : '',
      },
    },
    scales: {
      y: {
        // Не привязываем к нулю и добавляем отступы сверху/снизу,
        // чтобы линия использовала всю высоту и масштаб был равномерным по данным
        beginAtZero: false,
        grace: '25%',
        // Фиксированное число делений — одинаковая сетка на обоих графиках
        ticks: { display: false, count: 6 },
      },
      x: {
        ticks: { font: { size: 11 }, maxRotation: 45 },
      },
    },
  };
}

/**
 * Линейная диаграмма «Средний срок согласования по месяцам» для одной группы типов документа
 * (например, «Договор + ДС» или «Спецификации»). Одна линия; по оси X — месяцы, по оси Y — дни.
 */
export function ContractApprovalDurationDocTypeChart({
  title,
  points,
  color,
  loading,
  error,
}: ContractApprovalDurationDocTypeChartProps) {
  const sorted = [...(points ?? [])].sort((a, b) => a.month - b.month);

  const chartData = {
    labels: MONTH_NAMES,
    datasets: [
      {
        label: title,
        data: toSeries(sorted),
        borderColor: color,
        backgroundColor: color,
        tension: 0.3,
        spanGaps: false,
      },
    ],
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-3 sm:p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-2">{title}</h3>
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-3 sm:p-4 flex flex-col h-full w-full min-h-0">
      <h3 className="text-sm font-medium text-gray-700 mb-2 flex-shrink-0">{title}</h3>
      {loading ? (
        <div className="flex-1 min-h-[200px] flex items-center justify-center text-sm text-gray-500">
          Загрузка…
        </div>
      ) : (
        <div className="flex-1 min-h-[120px] relative">
          <Line data={chartData} options={buildOptions(sorted, title, color)} />
        </div>
      )}
    </div>
  );
}
