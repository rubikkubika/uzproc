'use client';

import { useState } from 'react';
import { useOverviewSavingsData } from '../hooks/useOverviewSavingsData';
import { SavingsByCfoChart } from './SavingsByCfoChart';
import { SavingsByPurchaserTable } from './SavingsByPurchaserTable';

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 8 }, (_, i) => currentYear - 2 + i);
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

export function SavingsTabContent() {
  const [year, setYear] = useState<number>(currentYear);
  const [currency, setCurrency] = useState<'UZS' | 'USD'>('UZS');
  const { data, loading, error } = useOverviewSavingsData(year);

  const handleReset = () => {
    setYear(currentYear);
    setCurrency('UZS');
  };

  return (
    <div className="space-y-1">
      {/* Фильтр по году + кнопки валюты + сброс */}
      <div className="bg-white rounded shadow px-1.5 py-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <label htmlFor="savings-year-filter" className="text-xs font-medium text-gray-700 whitespace-nowrap">
            Год завершения закупки:
          </label>
          <select
            id="savings-year-filter"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-1.5 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setCurrency('UZS')}
              className={`px-1.5 py-0.5 text-xs border rounded transition-colors ${
                currency === 'UZS'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              UZS
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-1.5 py-0.5 text-xs border rounded transition-colors ${
                currency === 'USD'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              USD
            </button>
          </div>

          <button
            onClick={handleReset}
            className="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 rounded-lg border border-red-300 hover:bg-red-100 hover:border-red-400 transition-colors"
          >
            Сбросить фильтры
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white rounded shadow p-4 text-center text-xs text-gray-500">Загрузка...</div>
      )}
      {error && (
        <div className="bg-white rounded shadow p-4 text-center text-xs text-red-500">{error}</div>
      )}

      {data && !loading && (
        <>
          {/* Итоговые карточки */}
          <div className="flex flex-wrap gap-1">
            <div className="bg-slate-500 rounded-xl shadow px-2 py-1.5 min-w-[120px]">
              <div className="text-[10px] text-slate-200 uppercase tracking-wider">Бюджет закупок</div>
              <div className="text-sm font-bold text-white">{formatAmount(data.totalBudget, currency)}</div>
              <div className="text-[10px] text-slate-200">{data.totalBudgetCount} закупок</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-sm px-2 py-1.5 min-w-[120px]">
              <div className="text-[10px] text-gray-700 uppercase tracking-wider">% экономии</div>
              <div className="text-sm font-bold text-gray-900">
                {data.totalBudget > 0 ? ((data.totalSavings / data.totalBudget) * 100).toFixed(1) + '%' : '—'}
              </div>
              <div className="text-[10px] text-gray-600">от бюджета</div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200/80 shadow-sm px-2 py-1.5 min-w-[120px]">
              <div className="text-[10px] text-gray-700 uppercase tracking-wider font-semibold">Общая экономия</div>
              <div className="text-sm font-bold text-gray-900">{formatAmount(data.totalSavings, currency)}</div>
              <div className="text-[10px] text-gray-600">{data.totalCount} закупок</div>
            </div>
            {/* Группа: составляющие экономии */}
            <div className="rounded-xl bg-white border border-gray-200 shadow-sm p-1 flex gap-1">
              <div className="bg-white rounded shadow px-2 py-1.5 min-w-[110px] border-l-2 border-blue-400">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">От медианы</div>
                <div className="text-sm font-bold text-blue-600">{formatAmount(data.savingsFromMedian, currency)}</div>
                <div className="text-[10px] text-gray-400">{data.fromMedianCount} закупок</div>
              </div>
              <div className="flex items-center text-gray-600 text-lg font-bold">+</div>
              <div className="bg-white rounded shadow px-2 py-1.5 min-w-[110px] border-l-2 border-green-400">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">От сущ. договора</div>
                <div className="text-sm font-bold text-green-600">{formatAmount(data.savingsFromExistingContract, currency)}</div>
                <div className="text-[10px] text-gray-400">{data.fromExistingContractCount} закупок</div>
              </div>
              <div className="flex items-center text-gray-600 text-lg font-bold">+</div>
              <div className="bg-white rounded shadow px-2 py-1.5 min-w-[110px] border-l-2 border-gray-400">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Без типа</div>
                <div className="text-sm font-bold text-gray-600">{formatAmount(data.savingsUntyped, currency)}</div>
                <div className="text-[10px] text-gray-400">{data.untypedCount} закупок</div>
              </div>
            </div>
          </div>

          {/* Диаграмма по ЦФО и таблица по закупщикам */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1">
            <div className="bg-white rounded shadow px-2 py-1.5" style={{ height: Math.max(300, data.byCfo.length * 40 + 60) }}>
              <SavingsByCfoChart data={data.byCfo} year={year} currency={currency} />
            </div>
            <SavingsByPurchaserTable data={data.byPurchaser} year={year} currency={currency} />
          </div>
        </>
      )}
    </div>
  );
}
