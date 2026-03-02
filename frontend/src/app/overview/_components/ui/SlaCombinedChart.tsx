'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { OverviewSlaPercentageByMonth } from '../hooks/useOverviewSlaData';

/** Один серый для всего прогноза (столбцы, линия SLA, обводка). Толщина как у линии SLA. */
const FORECAST_GRAY = 'rgba(107, 114, 128, 1)';
const FORECAST_LINE_WIDTH = 2;

/** Опции кастомного плагина barForecastDashedBorder (Chart.js типы их не содержат). */
type BarForecastDashedBorderOpts = {
  year: number;
  nowYear: number;
  nowMonth: number;
  lineWidth?: number;
};

/** Рисует пунктирную обводку для столбцов прогноза (Chart.js не поддерживает borderDash для bar). */
const barForecastDashedBorderPlugin = {
  id: 'barForecastDashedBorder',
  afterDraw(chart: ChartJS) {
    const customPlugins = chart.options.plugins as Record<string, BarForecastDashedBorderOpts | undefined> | undefined;
    const cfg = customPlugins?.barForecastDashedBorder;
    if (!cfg) return;
    const meta = chart.getDatasetMeta(0);
    if (!meta?.data?.length) return;
    const { year, nowYear, nowMonth } = cfg;
    const ctx = chart.ctx;
    const dash = [6, 4];
    const lineWidth = cfg.lineWidth ?? FORECAST_LINE_WIDTH;

    meta.data.forEach((el: { x: number; y: number; base: number; width: number; height: number }, dataIndex: number) => {
      const month1 = dataIndex + 1;
      const isPast = year < nowYear || (year === nowYear && month1 < nowMonth);
      if (isPast) return;
      const w = el.width;
      const h = el.height;
      if (w <= 0 || h <= 0) return;
      const left = el.x - w / 2;
      const top = Math.min(el.y, el.base);
      ctx.save();
      ctx.strokeStyle = FORECAST_GRAY;
      ctx.lineWidth = lineWidth;
      ctx.setLineDash(dash);
      ctx.strokeRect(left, top, w, h);
      ctx.setLineDash([]);
      ctx.restore();
    });
  },
};

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  BarController,
  LineController,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels,
  barForecastDashedBorderPlugin
);

const MONTH_NAMES = [
  'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
  'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек',
];

export interface SlaCombinedChartProps {
  year: number;
  /** Количество завершённых закупок по месяцам завершения (индекс 0 = январь). */
  countsByMonth: number[];
  /** Прогноз по месяцам: заявки у закупщика, дата назначения + плановый срок (индекс 0 = январь). */
  forecastByMonth?: number[];
  /** Прогнозный % SLA по месяцам (индекс 0 = январь): для каждого месяца свой расчёт по заявкам, завершающимся в нём. */
  forecastSlaPercentageByMonth?: (number | null)[];
  /** Для подсказки по месяцам: в срок (met), всего (total). */
  forecastSlaMetByMonth?: number[];
  forecastSlaTotalByMonth?: number[];
  /** Текущий год и месяц для разделения факт (синий) / прогноз (серый). */
  currentYear?: number;
  currentMonth?: number;
  /** Процент уложившихся в SLA по месяцам (1–12). */
  slaPercentageByMonth: OverviewSlaPercentageByMonth[];
  loading?: boolean;
  error?: string | null;
}

function buildOptions(
  yMaxSqrt: number,
  slaPercentageByMonth: OverviewSlaPercentageByMonth[],
  year: number,
  nowYear: number,
  nowMonth: number,
  forecastSlaMetByMonth: number[],
  forecastSlaTotalByMonth: number[],
  barDataOriginal: number[]
) {
  const byMonth = new Map(slaPercentageByMonth.map((m) => [m.month, m]));
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 4, right: 2, bottom: 2, left: 2 } },
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      barForecastDashedBorder: { year, nowYear, nowMonth, lineWidth: FORECAST_LINE_WIDTH },
      title: { display: false },
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 11 } },
      },
      datalabels: {
        display: (ctx: { datasetIndex: number }) => ctx.datasetIndex === 0 || ctx.datasetIndex === 1,
        formatter: (value: number | null, ctx: { datasetIndex: number; dataIndex: number }) => {
          if (ctx.datasetIndex === 0) {
            const orig = barDataOriginal[ctx.dataIndex];
            return orig != null && orig > 0 ? orig : '';
          }
          if (value == null || barDataOriginal[ctx.dataIndex] === 0) return '';
          const month1 = ctx.dataIndex + 1;
          const isPastMonth = year < nowYear || (year === nowYear && month1 < nowMonth);
          if (!isPastMonth) return `${Math.round(value)}%`;
          const item = byMonth.get(month1);
          if (item?.totalCompleted === 0) return '';
          return `${Math.round(value)}%`;
        },
        color: (ctx: { datasetIndex: number; dataIndex: number }) => {
          if (ctx.datasetIndex === 0) return '#ffffff';
          if (ctx.datasetIndex === 1) {
            const month1 = ctx.dataIndex + 1;
            const isPastMonth = year < nowYear || (year === nowYear && month1 < nowMonth);
            return isPastMonth ? '#ffffff' : '#ffffff';
          }
          return '#ffffff';
        },
        font: { weight: 'bold' as const, size: 11 },
        backgroundColor: (ctx: { datasetIndex: number; dataIndex: number }) => {
          if (ctx.datasetIndex === 0) return null;
          if (ctx.datasetIndex === 1) {
            const month1 = ctx.dataIndex + 1;
            const isPastMonth = year < nowYear || (year === nowYear && month1 < nowMonth);
            return isPastMonth ? 'rgba(0, 0, 0, 0.92)' : 'rgba(107, 114, 128, 0.92)';
          }
          return null;
        },
        padding: (ctx: { datasetIndex: number }) =>
          ctx.datasetIndex === 0 ? 4 : ctx.datasetIndex === 1 ? 4 : 0,
        borderRadius: (ctx: { datasetIndex: number }) =>
          ctx.datasetIndex === 1 ? 0 : 0,
        anchor: (ctx: { datasetIndex: number }) =>
          ctx.datasetIndex === 0 ? ('center' as const) : ('center' as const),
        align: (ctx: { datasetIndex: number }) =>
          ctx.datasetIndex === 0 ? ('center' as const) : ('center' as const),
        offset: (ctx: { datasetIndex: number }) =>
          ctx.datasetIndex === 0 ? 0 : 0,
      },
      tooltip: {
        callbacks: {
          label: (context: { datasetIndex: number; raw?: unknown; dataIndex: number }) => {
            if (context.datasetIndex === 0) {
              const rawVal = barDataOriginal[context.dataIndex] ?? 0;
              const month1 = context.dataIndex + 1;
              const isPast = year < nowYear || (year === nowYear && month1 < nowMonth);
              const suffix = isPast ? ' (факт)' : ' (прогноз)';
              return `Закупки: ${rawVal}${suffix}`;
            }
            if (barDataOriginal[context.dataIndex] === 0) return null;
            const rawVal = typeof context.raw === 'number' ? context.raw : 0;
            const month1 = context.dataIndex + 1;
            const isPastMonth = year < nowYear || (year === nowYear && month1 < nowMonth);
            if (!isPastMonth) {
              const t = forecastSlaTotalByMonth[context.dataIndex] ?? 0;
              const m = forecastSlaMetByMonth[context.dataIndex] ?? 0;
              return t > 0 ? `SLA (прогноз): ${Math.round(rawVal)}% (в срок: ${m} из ${t})` : `SLA (прогноз): ${Math.round(rawVal)}%`;
            }
            const item = byMonth.get(month1);
            if (!item || item.totalCompleted === 0) return 'SLA: нет данных';
            return `SLA: ${Math.round(rawVal)}% (${item.metSla}/${item.totalCompleted})`;
          },
        },
      },
    },
    scales: {
      y: {
        type: 'linear' as const,
        position: 'left' as const,
        beginAtZero: true,
        // Запас сверху: столбцы занимают ~59% высоты, подписи SLA не заходят на столбцы
        max: yMaxSqrt,
        ticks: { display: false },
        title: { display: false },
        grid: { display: false },
      },
      y1: {
        type: 'linear' as const,
        position: 'right' as const,
        min: 0,
        max: 108,
        ticks: { display: false },
        title: { display: false },
        grid: { display: false },
      },
      x: {
        type: 'category' as const,
        ticks: { font: { size: 11 }, maxRotation: 45 },
        barPercentage: 0.75,
        categoryPercentage: 0.95,
        offset: true,
        grid: { display: false },
      },
    },
  };
}

/** Синий — факт. Прогноз — FORECAST_GRAY / FORECAST_GRAY_FILL выше. */
const BAR_COLOR_ACTUAL = 'rgba(59, 130, 246, 0.8)';
const BAR_BORDER_ACTUAL = 'rgba(59, 130, 246, 1)';
const FORECAST_GRAY_FILL = 'rgba(107, 114, 128, 0.8)';

/**
 * Объединённая диаграмма: столбцы — закупки завершённые в месяце (левая ось),
 * линия — процент уложившихся в плановый SLA (правая ось).
 * До текущего месяца — факт (синий), с текущего — прогноз по заявкам у закупщика (серый).
 */
export function SlaCombinedChart({
  year,
  countsByMonth,
  forecastByMonth = [],
  forecastSlaPercentageByMonth = [],
  forecastSlaMetByMonth = [],
  forecastSlaTotalByMonth = [],
  currentYear,
  currentMonth,
  slaPercentageByMonth,
  loading,
  error,
}: SlaCombinedChartProps) {
  const nowYear = currentYear ?? new Date().getFullYear();
  const nowMonth = currentMonth ?? new Date().getMonth() + 1;
  const actual = countsByMonth ?? Array(12).fill(0);
  const forecast = forecastByMonth.length === 12 ? forecastByMonth : Array(12).fill(0);
  const forecastPctByMonth = forecastSlaPercentageByMonth.length === 12 ? forecastSlaPercentageByMonth : Array(12).fill(null) as (number | null)[];
  const forecastMetByMonth = forecastSlaMetByMonth.length === 12 ? forecastSlaMetByMonth : Array(12).fill(0);
  const forecastTotalByMonth = forecastSlaTotalByMonth.length === 12 ? forecastSlaTotalByMonth : Array(12).fill(0);

  const barData = MONTH_NAMES.map((_, i) => {
    const month1 = i + 1;
    const isPast = year < nowYear || (year === nowYear && month1 < nowMonth);
    return isPast ? actual[i] : forecast[i];
  });

  // Нелинейная шкала (sqrt), чтобы мелкие значения (например 1 в мае) были хорошо видны
  const barDataSqrt = barData.map((v) => Math.sqrt(Math.max(v, 0)));
  const maxBarValSqrt = Math.max(...barDataSqrt, 0.01);
  const yMaxSqrt = maxBarValSqrt * 1.7;

  const barBackgroundColor = MONTH_NAMES.map((_, i) => {
    const month1 = i + 1;
    const isPast = year < nowYear || (year === nowYear && month1 < nowMonth);
    return isPast ? BAR_COLOR_ACTUAL : FORECAST_GRAY_FILL;
  });

  const barBorderColor = MONTH_NAMES.map((_, i) => {
    const month1 = i + 1;
    const isPast = year < nowYear || (year === nowYear && month1 < nowMonth);
    return isPast ? BAR_BORDER_ACTUAL : FORECAST_GRAY;
  });

  const maxBarVal = Math.max(...barData, 1);
  const sorted = [...(slaPercentageByMonth ?? [])].sort((a, b) => a.month - b.month);
  const percentages = MONTH_NAMES.map((_, i) => {
    if (barData[i] === 0) return null;
    const month1 = i + 1;
    const isPast = year < nowYear || (year === nowYear && month1 < nowMonth);
    if (isPast) {
      const m = sorted.find((x) => x.month === month1);
      return m?.percentage != null ? m.percentage : null;
    }
    return forecastPctByMonth[i] ?? null;
  });

  const chartData = {
    labels: MONTH_NAMES,
    datasets: [
      {
        type: 'bar' as const,
        label: 'закупки завершённые в месяце',
        data: barDataSqrt,
        backgroundColor: barBackgroundColor,
        borderColor: barBorderColor,
        borderWidth: (ctx: { dataIndex: number }) => {
          const month1 = ctx.dataIndex + 1;
          const isPast = year < nowYear || (year === nowYear && month1 < nowMonth);
          return isPast ? 1 : 0;
        },
        yAxisID: 'y',
      },
      {
        type: 'line' as const,
        label: 'уложились в SLA, %',
        data: percentages,
        borderColor: 'rgba(0, 0, 0, 1)',
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: FORECAST_LINE_WIDTH,
        segment: {
          borderColor: (ctx: { p0DataIndex: number }) => {
            const month1 = ctx.p0DataIndex + 1;
            const isPast = year < nowYear || (year === nowYear && month1 < nowMonth);
            return isPast ? 'rgba(0, 0, 0, 1)' : FORECAST_GRAY;
          },
          borderDash: (ctx: { p0DataIndex: number }) => {
            const month1 = ctx.p0DataIndex + 1;
            const isPast = year < nowYear || (year === nowYear && month1 < nowMonth);
            return isPast ? [] : [6, 4];
          },
          backgroundColor: (ctx: { p0DataIndex: number }) => {
            const month1 = ctx.p0DataIndex + 1;
            const isPast = year < nowYear || (year === nowYear && month1 < nowMonth);
            return isPast ? 'rgba(0, 0, 0, 0.1)' : 'rgba(107, 114, 128, 0.1)';
          },
        },
        tension: 0,
        fill: true,
        yAxisID: 'y1',
        pointRadius: 0,
        pointHoverRadius: 4,
      },
      {
        type: 'line' as const,
        label: 'Прогноз',
        data: Array(12).fill(null),
        borderColor: FORECAST_GRAY,
        borderDash: [6, 4],
        borderWidth: FORECAST_LINE_WIDTH,
        fill: false,
        pointRadius: 0,
        yAxisID: 'y1',
        order: -1,
      },
    ],
  };

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow px-2 py-1 h-full w-full min-h-0 min-w-0 flex flex-col justify-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow px-2 py-1 h-full w-full min-h-0 min-w-0 flex flex-col">
      {loading ? (
        <div className="flex-1 min-h-0 flex items-center justify-center text-sm text-gray-500">
          Загрузка…
        </div>
      ) : (
        <div className="flex-1 min-h-0" style={{ minHeight: 180 }}>
          <Chart
            type="bar"
            data={chartData}
            options={buildOptions(yMaxSqrt, sorted, year, nowYear, nowMonth, forecastMetByMonth, forecastTotalByMonth, barData)}
          />
        </div>
      )}
    </div>
  );
}
