'use client';

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { DeliveryBarChartData } from '../types/delivery-dashboards.types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, ChartDataLabels);

export interface DeliveryBarChartProps {
  chart: DeliveryBarChartData;
  /** Подписывать значения над столбцами (для коротких рядов, напр. гистограммы из 4 корзин). */
  showValues?: boolean;
  /** Подпись значения в подсказке и на оси (по умолчанию — целое число). */
  formatValue?: (value: number) => string;
  /** Дополнительная строка подсказки для категории (индекс по оси X). */
  tooltipFooter?: (index: number) => string | undefined;
  heightClass?: string;
}

/** Столбчатая диаграмма дэшбордов по поставкам: одна ось Y, легенда при двух и более сериях. */
export function DeliveryBarChart({
  chart,
  showValues = false,
  formatValue = (v) => String(Math.round(v)),
  tooltipFooter,
  heightClass = 'h-[200px]',
}: DeliveryBarChartProps) {
  const stacked = chart.series.some((s) => s.stack != null);
  const data = {
    labels: chart.labels,
    datasets: chart.series.map((s) => ({
      label: s.label,
      data: s.data,
      backgroundColor: s.color,
      borderRadius: 3,
      stack: s.stack,
      datalabels: {
        display: showValues ? (ctx: { dataIndex: number }) => (s.data[ctx.dataIndex] ?? 0) > 0 : false,
        anchor: 'end' as const,
        align: 'top' as const,
        color: '#374151',
        font: { size: 10, weight: 'bold' as const },
        formatter: (v: number) => formatValue(v),
      },
    })),
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: showValues ? 14 : 4 } },
    plugins: {
      legend: {
        display: chart.series.length > 1,
        position: 'top' as const,
        labels: { boxWidth: 10, font: { size: 10 }, padding: 6 },
      },
      tooltip: {
        callbacks: {
          label: (ctx: { dataset: { label?: string }; raw: unknown }) =>
            `${ctx.dataset.label ?? ''}: ${formatValue(typeof ctx.raw === 'number' ? ctx.raw : 0)}`,
          footer: (items: { dataIndex: number }[]) =>
            tooltipFooter && items.length > 0 ? tooltipFooter(items[0].dataIndex) ?? '' : '',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        stacked,
        ticks: { font: { size: 10 }, precision: 0 },
        grid: { color: '#f3f4f6' },
      },
      x: { stacked, ticks: { font: { size: 10 } }, grid: { display: false } },
    },
  };

  return (
    <div className={`${heightClass} min-h-0`}>
      <Bar data={data} options={options} />
    </div>
  );
}
