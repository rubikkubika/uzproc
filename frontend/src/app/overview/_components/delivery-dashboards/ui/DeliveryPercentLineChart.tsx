'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { DELIVERY_CHART_COLORS } from '../constants/delivery-dashboards.constants';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, ChartDataLabels);

export interface DeliveryPercentLineChartProps {
  labels: string[];
  /** Значения 0–100; null — нет данных (разрыв линии не рисуется, точка пропускается). */
  values: (number | null)[];
  /** Подсказка для точки (напр. «12 из 15»). */
  tooltipLabel?: (index: number) => string;
  heightClass?: string;
}

/**
 * Линия процента по месяцам (0–100 %). Отдельная диаграмма с одной осью —
 * не накладывается на столбцы с количествами, чтобы не было двух шкал.
 */
export function DeliveryPercentLineChart({
  labels,
  values,
  tooltipLabel,
  heightClass = 'h-[140px]',
}: DeliveryPercentLineChartProps) {
  const data = {
    labels,
    datasets: [
      {
        label: '% в срок',
        data: values,
        borderColor: DELIVERY_CHART_COLORS.onTimeLine,
        backgroundColor: DELIVERY_CHART_COLORS.onTimeLine,
        borderWidth: 2,
        pointRadius: 4,
        tension: 0.3,
        spanGaps: true,
        datalabels: {
          display: (ctx: { dataIndex: number }) => values[ctx.dataIndex] != null,
          align: 'top' as const,
          color: '#1e40af',
          font: { size: 10, weight: 'bold' as const },
          formatter: (v: number | null) => (v != null ? `${Math.round(v)}%` : ''),
        },
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 14, right: 6 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { dataIndex: number; raw: unknown }) =>
            tooltipLabel ? tooltipLabel(ctx.dataIndex) : `${Math.round(Number(ctx.raw))}%`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: { font: { size: 10 }, stepSize: 25, callback: (v: string | number) => `${v}%` },
        grid: { color: '#f3f4f6' },
      },
      x: { ticks: { font: { size: 10 } }, grid: { display: false } },
    },
  };

  return (
    <div className={`${heightClass} min-h-0`}>
      <Line data={data} options={options} />
    </div>
  );
}
