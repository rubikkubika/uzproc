'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import type { SavingsByCfoData } from '../hooks/useOverviewSavingsData';
import { useEffect, useRef, useState } from 'react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const USD_TO_UZS_RATE = 12000;

function formatAmount(value: number, currency: 'UZS' | 'USD' = 'UZS'): string {
  const v = currency === 'USD' ? value / USD_TO_UZS_RATE : value;
  const suffix = currency === 'USD' ? ' $' : '';
  if (v === 0) return '0' + suffix;
  if (Math.abs(v) >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + ' млрд' + suffix;
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' млн' + suffix;
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + ' тыс' + suffix;
  return v.toFixed(0) + suffix;
}

interface SavingsByCfoChartProps {
  data: SavingsByCfoData[];
  year: number;
  currency?: 'UZS' | 'USD';
}

function cbrtScale(v: number): number {
  return v >= 0 ? Math.cbrt(v) : -Math.cbrt(-v);
}

export function SavingsByCfoChart({ data, year, currency = 'UZS' }: SavingsByCfoChartProps) {
  // Делаем data доступной для плагина без создания нового плагина при каждом ререндере.
  const dataRef = useRef<SavingsByCfoData[]>(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const rawMedian = data.map((d) => d.savingsFromMedian);
  const rawContract = data.map((d) => d.savingsFromExistingContract);
  const rawUntyped = data.map((d) => d.savingsUntyped);
  const totals = data.map((d) => d.totalSavings);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null);
  const chartCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isMountedRef = useRef(true);
  const [tickPositions, setTickPositions] = useState<number[]>([]);
  const [legendHeight, setLegendHeight] = useState(30);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Плагин для считывания позиций тиков после отрисовки
  const syncPlugin = useRef({
    id: 'syncPositions',
    afterDraw(chart: ChartJS) {
      // Скоупим плагин только на наш canvas, чтобы не влиять на другие графики.
      if (chartCanvasRef.current && chart.canvas !== chartCanvasRef.current) return;

      const yScale = chart.scales?.['y'];
      if (!yScale) return;
      const positions = dataRef.current.map((_, i) => yScale.getPixelForTick(i));
      const lh = chart.legend?.height || 30;
      // Обновляем через RAF чтобы не вызвать setState во время рендера Chart
      requestAnimationFrame(() => {
        if (!isMountedRef.current) return;
        setTickPositions(prev => {
          if (prev.length === positions.length && prev.every((v, j) => Math.abs(v - positions[j]) < 1)) return prev;
          return positions;
        });
        setLegendHeight(prev => Math.abs(prev - lh) < 1 ? prev : lh);
      });
    },
  }).current;

  useEffect(() => {
    chartCanvasRef.current = chartRef.current?.canvas ?? null;
    ChartJS.register(syncPlugin);
    return () => {
      // Снимаем плагин после размонтирования компонента, чтобы не было утечек setState.
      ChartJS.unregister(syncPlugin);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = {
    labels: data.map((d) => d.cfo),
    datasets: [
      {
        label: 'От медианы',
        data: rawMedian.map(cbrtScale),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderRadius: 2,
        barThickness: 10,
        rawData: rawMedian,
      },
      {
        label: 'От сущ. договора',
        data: rawContract.map(cbrtScale),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
        borderRadius: 2,
        barThickness: 10,
        rawData: rawContract,
      },
      {
        label: 'Комбинированный',
        data: rawUntyped.map(cbrtScale),
        backgroundColor: 'rgba(156, 163, 175, 0.8)',
        borderRadius: 2,
        barThickness: 10,
        rawData: rawUntyped,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const,
    layout: { padding: { right: 60 } },
    plugins: {
      title: { display: false },
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 10 } },
      },
      tooltip: {
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (ctx: any) => {
            const raw = ctx.dataset?.rawData?.[ctx.dataIndex] ?? 0;
            return `${ctx.dataset?.label}: ${formatAmount(raw, currency)}`;
          },
        },
      },
      datalabels: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        display: (ctx: any) => {
          const raw = ctx.dataset?.rawData?.[ctx.dataIndex] ?? 0;
          return raw > 0;
        },
        color: '#ffffff',
        font: { weight: 'bold' as const, size: 9 },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (_value: number, ctx: any) => {
          const raw = ctx.dataset?.rawData?.[ctx.dataIndex] ?? 0;
          return formatAmount(raw, currency);
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        backgroundColor: (ctx: any) => {
          const colors = ['rgb(59, 130, 246)', 'rgb(34, 197, 94)', 'rgb(156, 163, 175)'];
          return colors[ctx.datasetIndex] ?? 'rgb(0,0,0)';
        },
        borderRadius: 4,
        padding: { top: 3, bottom: 3, left: 6, right: 6 },
        anchor: 'end' as const,
        align: 'end' as const,
        offset: -2,
      },
    },
    scales: {
      x: {
        stacked: true,
        display: false,
      },
      y: {
        stacked: true,
        display: false, // Скрываем — подписи рисуем через HTML
      },
    },
  };

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-xs text-gray-400">Нет данных</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      {/* HTML-подписи ЦФО + бейджики */}
      <div className="shrink-0 relative" style={{ width: 160 }}>
        {data.map((d, i) => (
          <div
            key={d.cfo}
            className="absolute right-0 flex items-center gap-1"
            style={{
              top: tickPositions[i] != null ? tickPositions[i] : 0,
              transform: 'translateY(-50%)',
              opacity: tickPositions[i] != null ? 1 : 0,
            }}
          >
            <span className="text-[10px] text-gray-700 text-right whitespace-nowrap">{d.cfo}</span>
            {totals[i] > 0 && (
              <span className="text-[11px] font-bold text-white bg-blue-800 rounded px-1.5 py-0.5 whitespace-nowrap">
                {formatAmount(totals[i], currency)}
              </span>
            )}
          </div>
        ))}
      </div>
      {/* Диаграмма */}
      <div className="flex-1 min-w-0 h-full">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Bar ref={chartRef} data={chartData} options={options} {...{plugins: [syncPlugin]} as any} />
      </div>
    </div>
  );
}
