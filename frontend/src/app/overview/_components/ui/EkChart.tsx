'use client';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LogarithmicScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(LogarithmicScale);

/** Строка по ЦФО с бэкенда. */
export interface OverviewEkChartRow {
  cfo: string;
  totalAmount: number;
  singleSupplierAmount: number;
  percentByAmount: number;
  /** Преобладающая валюта по ЦФО; "mixed" при разных валютах. */
  currency?: string | null;
}

/** Символ валюты для подписи. */
function currencyLabel(currency: string | null | undefined): string {
  if (!currency || currency === 'mixed') return 'Сумма';
  const u = currency.toUpperCase();
  if (u === 'RUB' || u === 'RUR' || currency === '₽') return '₽';
  if (u === 'USD') return 'USD';
  if (u === 'EUR') return 'EUR';
  return currency;
}

interface EkChartProps {
  year: number;
  /** 'assignment' — по году назначения на закупщика, 'creation' — по году создания заявки (fallback) */
  yearType?: 'assignment' | 'creation';
  /** Данные по ЦФО (по горизонтали — ЦФО). */
  rows: OverviewEkChartRow[];
  loading?: boolean;
  error?: string | null;
  /** Суммы переведены в базовую валюту по курсу */
  amountsInBaseCurrency?: boolean;
  /** Базовая валюта (при пересчёте по курсу) */
  baseCurrency?: string | null;
}

/** Форматирование суммы для оси: млн руб при больших значениях. */
function formatAmount(value: number): string {
  if (value === 0) return '0';
  if (Math.abs(value) >= 1_000_000) {
    return (value / 1_000_000).toFixed(1) + ' млн';
  }
  if (Math.abs(value) >= 1_000) {
    return (value / 1_000).toFixed(0) + ' тыс';
  }
  return value.toFixed(0);
}

const buildOptions = (maxAmount: number, rows: OverviewEkChartRow[]) => {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 8, right: 8, bottom: 8, left: 8 } },
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      title: { display: false },
      legend: {
        display: true,
        position: 'top' as const,
        labels: { font: { size: 11 } },
      },
      datalabels: {
        display: true,
        color: '#ffffff',
        font: { weight: 'bold' as const, size: 11 },
        formatter: (value: number, ctx: { datasetIndex: number }) => {
          if (value == null || Number.isNaN(value)) return '';
          if (ctx.datasetIndex === 0) return formatAmount(value);
          if (ctx.datasetIndex === 1) return `${Number(value).toFixed(1)}%`;
          return '';
        },
        anchor: 'center' as const,
        align: 'center' as const,
      },
      tooltip: {
        callbacks: {
          label: (
            ctx: { datasetIndex: number; raw: number; dataIndex: number }
          ) => {
            if (ctx.datasetIndex === 0) {
              const row = rows[ctx.dataIndex];
              const curr =
                row?.currency && row.currency !== 'mixed'
                  ? ` ${currencyLabel(row.currency)}`
                  : ' ₽';
              return `${Number(ctx.raw).toLocaleString('ru-RU')}${curr}`;
            }
            if (ctx.datasetIndex === 1)
              return `${Number(ctx.raw).toFixed(1)}%`;
            return String(ctx.raw);
          },
        },
      },
    },
    scales: {
      x: {
        ticks: { font: { size: 11 }, maxRotation: 25 },
        barPercentage: 0.6,
        categoryPercentage: 0.8,
        grid: { display: false },
      },
      y: {
        type: 'logarithmic' as const,
        position: 'left' as const,
        min: 1,
        title: { display: false },
        ticks: { display: false },
        grid: { display: false },
      },
      y1: {
        type: 'logarithmic' as const,
        position: 'right' as const,
        min: 0.1,
        title: { display: false },
        ticks: { display: false },
        grid: { display: false },
      },
    },
  };
};

export function EkChart({
  year,
  yearType = 'assignment',
  rows,
  loading,
  error,
  amountsInBaseCurrency = false,
  baseCurrency: baseCurrencyProp = null,
}: EkChartProps) {
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow px-2 py-4 h-[320px] flex flex-col justify-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  const hasData = rows.length > 0 && rows.some((r) => r.totalAmount > 0 || r.singleSupplierAmount > 0 || r.percentByAmount > 0);
  const labels = rows.map((r) => r.cfo);
  // Масштаб левой оси — только по сумме у единственного источника, чтобы синие столбцы были видны
  const maxAmount = hasData
    ? Math.max(...rows.map((r) => r.singleSupplierAmount), 1)
    : 1;

  const currencies = [...new Set(rows.map((r) => r.currency).filter(Boolean))];
  const singleCurrency =
    currencies.length === 1 && currencies[0] !== 'mixed'
      ? currencyLabel(currencies[0] as string)
      : null;
  const baseLabel = amountsInBaseCurrency && baseCurrencyProp
    ? currencyLabel(baseCurrencyProp)
    : singleCurrency;
  const amountLegendLabel = baseLabel
    ? `Сумма у единственного источника, ${baseLabel}${amountsInBaseCurrency ? ' (по курсу)' : ''}`
    : 'Сумма у единственного источника';

  const datasets = [
    {
      type: 'bar' as const,
      label: amountLegendLabel,
      data: hasData
        ? rows.map((r) =>
            r.singleSupplierAmount <= 0 ? null : r.singleSupplierAmount
          )
        : [],
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
      yAxisID: 'y',
    },
    {
      type: 'bar' as const,
      label: '% от суммы по ЦФО',
      data: hasData
        ? rows.map((r) => (r.percentByAmount <= 0 ? null : r.percentByAmount))
        : [],
      backgroundColor: 'rgba(34, 197, 94, 0.8)',
      borderColor: 'rgba(34, 197, 94, 1)',
      borderWidth: 1,
      yAxisID: 'y1',
    },
  ];

  const chartData = { labels, datasets };

  return (
    <div className="bg-white rounded-lg shadow px-2 py-2 flex flex-col min-h-[320px]">
      {yearType === 'creation' && hasData && (
        <p className="text-xs text-amber-700 mb-1">
          Данные по году создания заявки (нет дат назначения на закупщика за {year} г.)
        </p>
      )}
      {amountsInBaseCurrency && baseCurrencyProp && hasData && (
        <p className="text-xs text-gray-600 mb-1">
          Суммы приведены в {currencyLabel(baseCurrencyProp)} по курсу (разные валюты в заявках).
        </p>
      )}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
          Загрузка…
        </div>
      ) : !hasData ? (
        <div className="flex-1 flex items-center justify-center text-sm text-gray-500">
          Нет данных за {year} г.
        </div>
      ) : (
        <div className="flex-1 flex flex-col min-h-[280px] w-full">
          <div style={{ height: 320 }}>
            <Chart
              key={`ek-${year}-${rows.length}-${rows.map((r) => r.cfo).join('-')}`}
              type="bar"
              data={chartData}
              options={buildOptions(maxAmount, rows)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
