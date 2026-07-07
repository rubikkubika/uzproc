'use client';

import { useState } from 'react';
import { Settings } from 'lucide-react';
import type { KpiSavingsByPurchaser, KpiSavingsSettings } from '../types/kpi.types';
import { purchaserDisplayName } from '@/utils/purchaser';
import { useKpiPurchaseDetails } from '../hooks/useKpiPurchaseDetails';
import { KpiPurchasesPanel } from './KpiPurchasesPanel';
import { calcScore, SAVINGS_SCORE_FLOOR } from '../utils/kpiScore';

const USD_TO_UZS = 12000;

function formatAmount(value: number, currency: 'UZS' | 'USD'): string {
  const v = currency === 'USD' ? value / USD_TO_UZS : value;
  const suffix = currency === 'USD' ? ' $' : '';
  if (v === 0) return '0' + suffix;
  if (Math.abs(v) >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + ' млрд' + suffix;
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' млн' + suffix;
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + ' тыс' + suffix;
  return v.toFixed(0) + suffix;
}

function calcSavingsPercent(savings: number, budget: number): number | null {
  if (budget <= 0) return null;
  return (savings / budget) * 100;
}

interface KpiSavingsSettingsEditorProps {
  settings: KpiSavingsSettings;
  onChange: (patch: Partial<KpiSavingsSettings>) => void;
  onReset: () => void;
  onClose: () => void;
}

function KpiSavingsSettingsEditor({ settings, onChange, onReset, onClose }: KpiSavingsSettingsEditorProps) {
  return (
    <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[240px]">
      <div className="text-xs font-semibold text-gray-700 mb-2">Настройки KPI «Экономия»</div>
      <div className="flex flex-col gap-2">
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-600">Цель: % экономии</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={settings.target}
              onChange={(e) => onChange({ target: Number(e.target.value) })}
              className="w-16 text-xs border border-gray-300 rounded px-1.5 py-1 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500">%</span>
          </div>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-xs text-gray-600">Вес в общей премии</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={settings.weight}
              onChange={(e) => onChange({ weight: Number(e.target.value) })}
              className="w-16 text-xs border border-gray-300 rounded px-1.5 py-1 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500">%</span>
          </div>
        </label>
        <label className="flex items-center gap-2 mt-1 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.allowBoost}
            onChange={(e) => onChange({ allowBoost: e.target.checked })}
            className="w-3.5 h-3.5 accent-blue-600"
          />
          <span className="text-xs text-gray-700">Буст до 130% (перевыполнение)</span>
        </label>
      </div>
      <div className="flex gap-1 mt-2">
        <button
          onClick={onReset}
          className="flex-1 text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          Сброс
        </button>
        <button
          onClick={onClose}
          className="flex-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Готово
        </button>
      </div>
    </div>
  );
}

interface KpiSavingsBlockProps {
  data: KpiSavingsByPurchaser[];
  settings: KpiSavingsSettings;
  onSettingsChange: (patch: Partial<KpiSavingsSettings>) => void;
  onSettingsReset: () => void;
  loading: boolean;
  error: string | null;
  year: number;
  month: number;
}

export function KpiSavingsBlock({ data, settings, onSettingsChange, onSettingsReset, loading, error, year, month }: KpiSavingsBlockProps) {
  const [currency, setCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [showSettings, setShowSettings] = useState(false);
  const [selectedPurchaser, setSelectedPurchaser] = useState<string | null>(null);

  const details = useKpiPurchaseDetails(year, month, selectedPurchaser);

  const handleRowClick = (purchaser: string) => {
    setSelectedPurchaser((prev) => (prev === purchaser ? null : purchaser));
  };

  return (
    <div className="flex gap-2 items-start">
      {/* Основная таблица */}
      <div className={`bg-white rounded-lg shadow min-w-0 ${selectedPurchaser ? 'flex-shrink-0 w-auto max-w-fit' : 'w-full max-w-[900px]'}`}>
        {/* Заголовок блока */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">Экономия</span>
            <span className="text-[10px] text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">
              Цель: {settings.target}% · Вес: {settings.weight}%
              {settings.allowBoost && <span className="ml-1 text-blue-700 font-medium">· до 130%</span>}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => setCurrency('UZS')}
                className={`px-1.5 py-0.5 text-[10px] border rounded transition-colors ${
                  currency === 'UZS' ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                UZS
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-1.5 py-0.5 text-[10px] border rounded transition-colors ${
                  currency === 'USD' ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                }`}
              >
                USD
              </button>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowSettings((v) => !v)}
                className="p-1 rounded text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
                title="Настройки"
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              {showSettings && (
                <KpiSavingsSettingsEditor
                  settings={settings}
                  onChange={onSettingsChange}
                  onReset={onSettingsReset}
                  onClose={() => setShowSettings(false)}
                />
              )}
            </div>
          </div>
        </div>

        {/* Тело */}
        {loading && (
          <div className="px-3 py-4 text-center text-xs text-gray-400">Загрузка...</div>
        )}
        {error && !loading && (
          <div className="px-3 py-4 text-center text-xs text-red-500">{error}</div>
        )}
        {!loading && !error && data.length === 0 && (
          <div className="px-3 py-4 text-center text-xs text-gray-400">Нет данных за выбранный месяц</div>
        )}
        {!loading && !error && data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">Закупщик</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500 whitespace-nowrap">Бюджет</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500 whitespace-nowrap">Экономия</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500 whitespace-nowrap">% эк.</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap min-w-[120px]">
                    Выполнение KPI
                  </th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500 whitespace-nowrap">Балл</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const maxScorePercent = settings.allowBoost ? 130 : 100;
                  return data.map((row) => {
                  const savPct = calcSavingsPercent(row.totalSavings, row.totalBudget);
                  const score = calcScore(savPct, settings.target, maxScorePercent, SAVINGS_SCORE_FLOOR);
                  const barColor = score >= 100 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-400' : 'bg-red-400';
                  const isSelected = selectedPurchaser === row.purchaser;
                  return (
                    <tr
                      key={row.purchaser}
                      onClick={() => handleRowClick(row.purchaser)}
                      className={`border-b border-gray-50 cursor-pointer transition-colors ${
                        isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-2 py-1.5 text-gray-800 whitespace-nowrap">
                        <span className={isSelected ? 'text-blue-700 font-medium' : ''}>
                          {purchaserDisplayName(row.purchaser) || row.purchaser}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-right text-gray-600 whitespace-nowrap">
                        {formatAmount(row.totalBudget, currency)}
                      </td>
                      <td className="px-2 py-1.5 text-right text-gray-800 font-medium whitespace-nowrap">
                        {formatAmount(row.totalSavings, currency)}
                      </td>
                      <td className={`px-2 py-1.5 text-right font-semibold whitespace-nowrap ${
                        savPct === null ? 'text-gray-400' : savPct >= settings.target ? 'text-green-600' : 'text-red-500'
                      }`}>
                        {savPct === null ? '—' : savPct.toFixed(1) + '%'}
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 bg-gray-100 rounded-full h-2 min-w-[80px] relative">
                            <div
                              className={`h-2 rounded-full transition-all ${barColor}`}
                              style={{ width: `${(score / maxScorePercent) * 100}%` }}
                            />
                            {settings.allowBoost && (
                              <div
                                className="absolute top-0 h-2 w-px bg-gray-400"
                                style={{ left: `${(100 / maxScorePercent) * 100}%` }}
                                title="100%"
                              />
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 w-12 text-right">{score.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold whitespace-nowrap">
                        <span className={score >= 100 ? 'text-green-600' : score >= 70 ? 'text-yellow-600' : 'text-red-500'}>
                          {((score / 100) * settings.weight).toFixed(1)}
                        </span>
                        <span className="text-gray-400 font-normal"> / {settings.allowBoost ? ((130 / 100) * settings.weight).toFixed(1) : settings.weight}</span>
                      </td>
                    </tr>
                  );
                });
                })()}
              </tbody>
              <tfoot>
                {(() => {
                  const totalBudget = data.reduce((s, r) => s + r.totalBudget, 0);
                  const totalSavings = data.reduce((s, r) => s + r.totalSavings, 0);
                  const totalPct = totalBudget > 0 ? (totalSavings / totalBudget) * 100 : null;
                  return (
                    <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                      <td className="px-2 py-1.5 text-gray-700 text-xs">Итого</td>
                      <td className="px-2 py-1.5 text-right text-gray-800 whitespace-nowrap">{formatAmount(totalBudget, currency)}</td>
                      <td className="px-2 py-1.5 text-right text-gray-800 whitespace-nowrap">{formatAmount(totalSavings, currency)}</td>
                      <td className={`px-2 py-1.5 text-right font-semibold whitespace-nowrap ${totalPct === null ? 'text-gray-400' : totalPct >= settings.target ? 'text-green-600' : 'text-red-500'}`}>
                        {totalPct === null ? '—' : totalPct.toFixed(1) + '%'}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  );
                })()}
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Панель деталей закупок */}
      {selectedPurchaser && (
        <div className="flex-1 min-w-0">
          <KpiPurchasesPanel
            purchaser={selectedPurchaser}
            data={details.data}
            loading={details.loading}
            error={details.error}
            currency={currency}
            onClose={() => setSelectedPurchaser(null)}
            onRefresh={() => details.refresh?.()}
          />
        </div>
      )}
    </div>
  );
}
