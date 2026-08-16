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
import type { ActiveElement, ChartEvent } from 'chart.js';
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
  /** Месяц (1–12), выбранный кликом; его данные показаны в блоках деталей ниже. */
  selectedMonth?: number | null;
  /** Клик по месяцу: повторный клик по выбранному снимает выбор. */
  onMonthSelect?: (month: number) => void;
}

/** Цвета столбцов: выбранный месяц — насыщенный, остальные — приглушённые. */
const MET_COLOR = 'rgba(34, 197, 94, 0.85)';
const MET_COLOR_DIMMED = 'rgba(34, 197, 94, 0.22)';
const VIOLATED_COLOR = 'rgba(239, 68, 68, 0.85)';
const VIOLATED_COLOR_DIMMED = 'rgba(239, 68, 68, 0.22)';
const LINE_COLOR = 'rgba(37, 99, 235, 1)';
const LINE_COLOR_DIMMED = 'rgba(37, 99, 235, 0.35)';

/**
 * Комбинированная диаграмма по месяцам подписания: столбцы — подписано без нарушения
 * и с нарушением SLA (стек), линия — процент документов без нарушения.
 * Клик по месяцу выбирает его: выбранный месяц остаётся ярким, остальные приглушаются,
 * а блоки деталей внизу показывают документы этого месяца.
 */
export function ContractSlaMonthChart({
  year,
  slaByMonth,
  loading,
  error,
  selectedMonth = null,
  onMonthSelect,
}: ContractSlaMonthChartProps) {
  const byMonth = new Map(slaByMonth.map((m) => [m.month, m]));
  /** Месяц выбран → остальные приглушаем; выбора нет → все месяцы одинаково яркие. */
  const isDimmed = (index: number) => selectedMonth != null && index + 1 !== selectedMonth;
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
        borderColor: selectedMonth != null ? LINE_COLOR_DIMMED : LINE_COLOR,
        backgroundColor: selectedMonth != null ? LINE_COLOR_DIMMED : LINE_COLOR,
        pointBackgroundColor: MONTH_NAMES.map((_, i) => (isDimmed(i) ? LINE_COLOR_DIMMED : LINE_COLOR)),
        pointBorderColor: MONTH_NAMES.map((_, i) => (isDimmed(i) ? LINE_COLOR_DIMMED : LINE_COLOR)),
        pointRadius: MONTH_NAMES.map((_, i) => (selectedMonth != null && !isDimmed(i) ? 5 : 3)),
        borderWidth: 2,
        tension: 0.3,
        spanGaps: true,
        datalabels: {
          display: (ctx: { dataIndex: number }) => percentage[ctx.dataIndex] != null,
          color: (ctx: { dataIndex: number }) => (isDimmed(ctx.dataIndex) ? '#93a5c9' : '#1e40af'),
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
        backgroundColor: MONTH_NAMES.map((_, i) => (isDimmed(i) ? MET_COLOR_DIMMED : MET_COLOR)),
        stack: 'signed',
        datalabels: { display: false },
      },
      {
        type: 'bar' as const,
        label: 'С нарушением',
        data: violated,
        yAxisID: 'yCount',
        backgroundColor: MONTH_NAMES.map((_, i) => (isDimmed(i) ? VIOLATED_COLOR_DIMMED : VIOLATED_COLOR)),
        stack: 'signed',
        datalabels: { display: false },
      },
    ],
  };

  /** Клик по столбцу/точке месяца — выбор месяца; клик по пустому месту берёт ближайший месяц по оси X. */
  const handleClick = (_event: ChartEvent, elements: ActiveElement[], chart: ChartJS) => {
    if (!onMonthSelect) return;
    let index = elements.length > 0 ? elements[0].index : null;
    if (index == null) {
      const nativeEvent = _event.native as MouseEvent | null;
      const canvasX = _event.x ?? (nativeEvent ? nativeEvent.offsetX : null);
      if (canvasX == null) return;
      const value = chart.scales.x?.getValueForPixel(canvasX);
      if (value == null) return;
      index = Math.round(value);
    }
    if (index < 0 || index > 11) return;
    onMonthSelect(index + 1);
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: handleClick,
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
      x: {
        stacked: true,
        ticks: {
          font: (ctx: { index: number }) => ({
            size: 10,
            weight: (selectedMonth != null && ctx.index + 1 === selectedMonth ? 'bold' : 'normal') as 'bold' | 'normal',
          }),
          color: (ctx: { index: number }) => (isDimmed(ctx.index) ? '#9ca3af' : '#374151'),
        },
      },
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
        {onMonthSelect && (
          <span className="text-[10px] text-gray-400 font-normal ml-1">— клик по месяцу показывает его документы</span>
        )}
      </p>
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-500">Загрузка…</div>
      ) : (
        <div className={`flex-1 min-h-0 ${onMonthSelect ? 'cursor-pointer' : ''}`}>
          <Chart type="bar" data={chartData} options={options} />
        </div>
      )}
    </div>
  );
}
