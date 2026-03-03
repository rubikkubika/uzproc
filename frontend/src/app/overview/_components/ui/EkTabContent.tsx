'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { EkChart, type OverviewEkChartRow } from './EkChart';

const currentYear = new Date().getFullYear();
const availableYears = Array.from({ length: 8 }, (_, i) => currentYear - 2 + i);

function parseRow(raw: Record<string, unknown>): OverviewEkChartRow {
  return {
    cfo: String(raw?.cfo ?? ''),
    totalAmount: Number(raw?.totalAmount ?? 0),
    singleSupplierAmount: Number(raw?.singleSupplierAmount ?? 0),
    percentByAmount: Number(raw?.percentByAmount ?? 0),
    currency: raw?.currency != null ? String(raw.currency) : undefined,
  };
}

export function EkTabContent() {
  const [year, setYear] = useState<number>(currentYear);
  const [rows, setRows] = useState<OverviewEkChartRow[]>([]);
  const [yearType, setYearType] = useState<'assignment' | 'creation'>('assignment');
  const [amountsInBaseCurrency, setAmountsInBaseCurrency] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (y: number) => {
    setLoading(true);
    setError(null);
    try {
      const baseUrl = getBackendUrl();
      const res = await fetch(`${baseUrl}/api/overview/ek?year=${y}`);
      if (!res.ok) throw new Error('Ошибка загрузки данных ЕК');
      const yt = res.headers.get('X-Ek-Year-Type');
      setYearType(yt === 'creation' ? 'creation' : 'assignment');
      const json = await res.json();
      const rawRows = Array.isArray(json?.rows) ? json.rows : [];
      setRows(rawRows.map((r: Record<string, unknown>) => parseRow(r)));
      setAmountsInBaseCurrency(Boolean(json?.amountsInBaseCurrency));
      setBaseCurrency(json?.baseCurrency != null ? String(json.baseCurrency) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setRows([]);
      setAmountsInBaseCurrency(false);
      setBaseCurrency(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(year);
  }, [year, fetchData]);

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-lg shadow px-2 py-2">
        <div className="flex items-center gap-2">
          <label htmlFor="ek-year-filter" className="text-sm font-medium text-gray-700 whitespace-nowrap">
            Год назначения на закупщика:
          </label>
          <select
            id="ek-year-filter"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <EkChart
        year={year}
        yearType={yearType}
        rows={rows}
        loading={loading}
        error={error}
        amountsInBaseCurrency={amountsInBaseCurrency}
        baseCurrency={baseCurrency}
      />
    </div>
  );
}
