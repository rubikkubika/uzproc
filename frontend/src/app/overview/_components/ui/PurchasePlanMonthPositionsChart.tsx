'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  Title,
  Tooltip,
  ChartDataLabels
);

const LOG_SCALE_MIN = 0.5;

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

const CHART_BREAKPOINT_NARROW = 320;
const CHART_BREAKPOINT_COMPACT = 420;

function buildChartOptions(
  maxVal: number,
  opts: { tickFontSize: number; datalabelFontSize: number; layoutPadding: number }
) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: opts.layoutPadding },
    elements: {
      bar: {
        borderWidth: 0,
      },
    },
    plugins: {
      title: { display: false },
      legend: { display: false },
      datalabels: {
        display: true,
        color: '#ffffff',
        font: { weight: 'bold' as const, size: opts.datalabelFontSize },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chartjs Context not assignable to custom dataset shape
        formatter: (value: number, ctx: any) => {
          const raw = (ctx?.dataset as { rawData?: number[] } | undefined)?.rawData;
          const dataIndex = ctx?.dataIndex ?? 0;
          return (raw != null && raw[dataIndex] != null ? raw[dataIndex] : value) as number;
        },
        anchor: 'center' as const,
        align: 'center' as const,
        borderWidth: 0,
        backgroundColor: null,
      },
    },
    scales: {
      y: {
        type: 'logarithmic' as const,
        min: LOG_SCALE_MIN,
        max: Math.max(maxVal + 1, 10),
        display: false,
        ticks: { display: false },
        grid: { display: false },
      },
      x: {
        ticks: {
          font: { size: opts.tickFontSize },
          maxRotation: 45,
          minRotation: 0,
          autoSkip: true,
          maxTicksLimit: 6,
        },
        grid: { display: false },
      },
    },
  };
}

/**
 * Две столбчатые диаграммы:
 * 1) План: Запланированы, Заявки инициированы, Исключена.
 * 2) Заявки на закупку: Плановые, Внеплановые, Неутверждена, Исключена.
 * На узких экранах уменьшаются шрифты, отступы и высота для корректного масштабирования.
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
  const firstChartRef = useRef<HTMLDivElement>(null);
  const [chartSize, setChartSize] = useState<{
    tickFontSize: number;
    datalabelFontSize: number;
    layoutPadding: number;
    chartHeight: number;
  }>({ tickFontSize: 11, datalabelFontSize: 14, layoutPadding: 4, chartHeight: 200 });

  useEffect(() => {
    const el = firstChartRef.current;
    if (!el) return;
    const update = () => {
      const width = el.getBoundingClientRect().width;
      if (width <= CHART_BREAKPOINT_NARROW) {
        setChartSize({
          tickFontSize: 8,
          datalabelFontSize: 10,
          layoutPadding: 2,
          chartHeight: 160,
        });
      } else if (width <= CHART_BREAKPOINT_COMPACT) {
        setChartSize({
          tickFontSize: 9,
          datalabelFontSize: 11,
          layoutPadding: 2,
          chartHeight: 180,
        });
      } else {
        setChartSize({
          tickFontSize: 11,
          datalabelFontSize: 14,
          layoutPadding: 4,
          chartHeight: 200,
        });
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const planMax = Math.max(marketCount, linkedToRequestCount, excludedCount, 1) + 2;
  const requestsMax =
    Math.max(
      requestsPurchasePlannedCount,
      requestsPurchaseNonPlannedCount,
      requestsPurchaseUnapprovedCount,
      requestsPurchaseExcludedCount,
      1
    ) + 2;

  const planOptions = useMemo(
    () =>
      buildChartOptions(planMax, {
        tickFontSize: chartSize.tickFontSize,
        datalabelFontSize: chartSize.datalabelFontSize,
        layoutPadding: chartSize.layoutPadding,
      }),
    [planMax, chartSize.tickFontSize, chartSize.datalabelFontSize, chartSize.layoutPadding]
  );
  const requestsOptions = useMemo(
    () =>
      buildChartOptions(requestsMax, {
        tickFontSize: chartSize.tickFontSize,
        datalabelFontSize: chartSize.datalabelFontSize,
        layoutPadding: chartSize.layoutPadding,
      }),
    [requestsMax, chartSize.tickFontSize, chartSize.datalabelFontSize, chartSize.layoutPadding]
  );

  const planValues = [marketCount, linkedToRequestCount, excludedCount];
  const planChartData = {
    labels: ['Запланированы', 'Заявки инициированы', 'Исключена'],
    datasets: [
      {
        label: 'Позиций',
        rawData: planValues,
        data: planValues.map((v) => Math.max(v, LOG_SCALE_MIN)),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: 'transparent',
        borderWidth: 0,
      },
    ],
  };

  const requestsValues = [
    requestsPurchasePlannedCount,
    requestsPurchaseNonPlannedCount,
    requestsPurchaseUnapprovedCount,
    requestsPurchaseExcludedCount,
  ];
  const requestsChartData = {
    labels: [
      'Плановые',
      'Внеплановые',
      'Неутверждена',
      'Отмена',
    ],
    datasets: [
      {
        label: 'Заявок',
        rawData: requestsValues,
        data: requestsValues.map((v) => Math.max(v, LOG_SCALE_MIN)),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(251, 191, 36, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: 'transparent',
        borderWidth: 0,
      },
    ],
  };

  const chartContainerClass =
    'rounded-lg border border-gray-200 bg-gray-50 flex-1 min-w-0 overflow-hidden p-1';
  const chartInnerStyle = {
    height: chartSize.chartHeight,
    minHeight: chartSize.chartHeight,
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 w-full min-w-0">
      <div ref={firstChartRef} className="flex-1 min-w-0 flex flex-col min-w-0">
        <div className="text-xs font-medium text-gray-700 mb-1">План</div>
        <div className={chartContainerClass} style={chartInnerStyle}>
          <Bar data={planChartData} options={planOptions} />
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col min-w-0">
        <div className="text-xs font-medium text-gray-700 mb-1">Заявки на закупку</div>
        <div className={chartContainerClass} style={chartInnerStyle}>
          <Bar data={requestsChartData} options={requestsOptions} />
        </div>
      </div>
    </div>
  );
}
