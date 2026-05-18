'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, AlertCircle } from 'lucide-react';
import type { KpiPurchaseDetail } from '../hooks/useKpiPurchaseDetails';
import { purchaserDisplayName } from '@/utils/purchaser';
import { getBackendUrl } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const USD_TO_UZS = 12000;

function formatAmount(value: number | null, currency: 'UZS' | 'USD'): string {
  if (value === null || value === undefined) return '—';
  const v = currency === 'USD' ? value / USD_TO_UZS : value;
  const suffix = currency === 'USD' ? ' $' : '';
  if (v === 0) return '0' + suffix;
  if (Math.abs(v) >= 1_000_000_000) return (v / 1_000_000_000).toFixed(1) + ' млрд' + suffix;
  if (Math.abs(v) >= 1_000_000) return (v / 1_000_000).toFixed(1) + ' млн' + suffix;
  if (Math.abs(v) >= 1_000) return (v / 1_000).toFixed(0) + ' тыс' + suffix;
  return v.toFixed(0) + suffix;
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function savingsTypeLabel(type: string | null): string {
  if (type === 'FROM_MEDIAN') return 'Медиана';
  if (type === 'FROM_EXISTING_CONTRACT') return 'Договор';
  if (type) return 'Комбин.';
  return '—';
}

function shortMethod(method: string | null): string {
  if (!method) return '—';
  if (method.toLowerCase().includes('единственного')) return 'ЕК';
  if (method.toLowerCase().includes('конкурс')) return 'Конкурс';
  if (method.toLowerCase().includes('запрос цен')) return 'Запрос цен';
  if (method.toLowerCase().includes('запрос')) return 'Запрос';
  if (method.toLowerCase().includes('аукцион')) return 'Аукцион';
  return method.length > 24 ? method.slice(0, 22) + '…' : method;
}

function statusGroupClass(group: string | null): string {
  if (!group) return 'bg-gray-100 text-gray-600';
  if (group === 'Договор подписан' || group === 'Спецификация подписана') return 'bg-green-100 text-green-800';
  if (group === 'Договор в работе' || group === 'Спецификация в работе') return 'bg-blue-100 text-blue-800';
  if (group === 'Заявка у закупщика') return 'bg-yellow-100 text-yellow-800';
  if (group === 'Заявка на согласовании') return 'bg-orange-100 text-orange-800';
  if (group === 'Заявка не согласована' || group === 'Заявка не утверждена' || group === 'Закупка не согласована' || group === 'Спецификация не согласована') return 'bg-red-100 text-red-800';
  if (group === 'Спецификация создана - Архив') return 'bg-gray-200 text-gray-700';
  if (group === 'Проект' || group === 'Не установлен') return 'bg-gray-100 text-gray-600';
  return 'bg-gray-100 text-gray-800';
}

interface ExcludeModalProps {
  row: KpiPurchaseDetail;
  onConfirm: (comment: string) => void;
  onCancel: () => void;
}

function ExcludeModal({ row, onConfirm, onCancel }: ExcludeModalProps) {
  const [comment, setComment] = useState(row.excludeFromKpiComment ?? '');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-lg shadow-xl w-[360px] p-4">
        <div className="text-sm font-semibold text-gray-800 mb-1">Исключить из расчёта KPI</div>
        <div className="text-xs text-gray-500 mb-3 line-clamp-2">{row.name ?? `Заявка ${row.idPurchaseRequest}`}</div>
        <textarea
          className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          rows={3}
          placeholder="Причина исключения (необязательно)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          autoFocus
        />
        <div className="flex gap-2 mt-3">
          <button onClick={onCancel} className="flex-1 text-xs px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50">
            Отмена
          </button>
          <button
            onClick={() => onConfirm(comment)}
            className="flex-1 text-xs px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Исключить
          </button>
        </div>
      </div>
    </div>
  );
}

interface KpiPurchasesPanelProps {
  purchaser: string;
  data: KpiPurchaseDetail[];
  loading: boolean;
  error: string | null;
  currency: 'UZS' | 'USD';
  onClose: () => void;
  onRefresh: () => void;
}

export function KpiPurchasesPanel({ purchaser, data, loading, error, currency, onClose, onRefresh }: KpiPurchasesPanelProps) {
  const { canEdit } = useAuth();
  const [excludeTarget, setExcludeTarget] = useState<KpiPurchaseDetail | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  const activeData = data.filter(r => !r.excludeFromKpi && !r.autoExcludedFromKpi);
  const totalSavings = activeData.reduce((s, r) => s + (r.savings ?? 0), 0);
  const totalBudget = activeData.reduce((s, r) => s + (r.budgetAmount ?? 0), 0);
  const pct = totalBudget > 0 ? (totalSavings / totalBudget) * 100 : null;

  const sorted = [...data].sort((a, b) => {
    // Исключённые — вниз
    const aExcl = a.excludeFromKpi || a.autoExcludedFromKpi ? 1 : 0;
    const bExcl = b.excludeFromKpi || b.autoExcludedFromKpi ? 1 : 0;
    if (aExcl !== bExcl) return aExcl - bExcl;
    return (b.savings ?? 0) - (a.savings ?? 0);
  });

  const handleToggle = async (row: KpiPurchaseDetail) => {
    if (!row.idPurchaseRequest) return;
    if (!row.excludeFromKpi) {
      setExcludeTarget(row);
      return;
    }
    // Включить обратно — без модалки
    setToggling(row.idPurchaseRequest);
    try {
      await fetch(`${getBackendUrl()}/api/purchase-requests/${row.idPurchaseRequest}/kpi-exclude`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excluded: false }),
      });
      onRefresh();
    } finally {
      setToggling(null);
    }
  };

  const handleExcludeConfirm = async (comment: string) => {
    if (!excludeTarget?.idPurchaseRequest) return;
    setToggling(excludeTarget.idPurchaseRequest);
    setExcludeTarget(null);
    try {
      await fetch(`${getBackendUrl()}/api/purchase-requests/${excludeTarget.idPurchaseRequest}/kpi-exclude`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excluded: true, comment: comment || null }),
      });
      onRefresh();
    } finally {
      setToggling(null);
    }
  };

  return (
    <>
      {excludeTarget && (
        <ExcludeModal
          row={excludeTarget}
          onConfirm={handleExcludeConfirm}
          onCancel={() => setExcludeTarget(null)}
        />
      )}
      <div className="flex flex-col bg-white rounded-lg shadow border border-gray-200 min-w-0 w-full h-full">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0">
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-gray-800 truncate">
              {purchaserDisplayName(purchaser) || purchaser}
            </span>
            <span className="text-[10px] text-gray-500 flex gap-2">
              <span>{activeData.length} из {data.length} закупок в расчёте</span>
              <span>·</span>
              <span>Бюджет: {formatAmount(totalBudget, currency)}</span>
              <span>·</span>
              <span>
                Экономия: {formatAmount(totalSavings, currency)}
                {pct !== null && <span className={`ml-1 ${pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>({pct.toFixed(1)}%)</span>}
              </span>
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Тело */}
        <div className="overflow-auto flex-1 max-h-[480px]">
          {loading && <div className="py-6 text-center text-xs text-gray-400">Загрузка...</div>}
          {error && !loading && <div className="py-6 text-center text-xs text-red-500">{error}</div>}
          {!loading && !error && data.length === 0 && <div className="py-6 text-center text-xs text-gray-400">Нет закупок</div>}
          {!loading && !error && sorted.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 sticky top-0">
                  <th className="px-1.5 py-1.5 w-6" />
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">ID</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500">Наименование</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap min-w-[100px]">Тип проц.</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">Статус</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500 whitespace-nowrap">Бюджет</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500 whitespace-nowrap">Экономия</th>
                  <th className="px-2 py-1.5 text-right font-medium text-gray-500 whitespace-nowrap">% эк.</th>
                  <th className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">Завершение</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => {
                  const isExcluded = row.excludeFromKpi || row.autoExcludedFromKpi;
                  const rowPct = (row.budgetAmount && row.budgetAmount > 0 && row.savings !== null)
                    ? (row.savings / row.budgetAmount) * 100 : null;
                  const isToggling = toggling === row.idPurchaseRequest;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-gray-50 transition-colors ${isExcluded ? 'opacity-40 bg-gray-50' : 'hover:bg-blue-50'}`}
                    >
                      <td className="px-1.5 py-1.5 text-center">
                        {row.autoExcludedFromKpi ? (
                          <span title="Авто-исключён: ЕК без экономии">
                            <AlertCircle className="w-3 h-3 text-amber-400 inline" />
                          </span>
                        ) : (
                          <button
                            onClick={() => canEdit ? handleToggle(row) : undefined}
                            disabled={isToggling || !canEdit}
                            title={!canEdit ? 'Только администратор может изменять исключения' : row.excludeFromKpi
                              ? `Включить в расчёт${row.excludeFromKpiComment ? '\nПричина: ' + row.excludeFromKpiComment : ''}`
                              : 'Исключить из расчёта KPI'}
                            className={`rounded p-0.5 transition-colors ${!canEdit
                              ? 'cursor-not-allowed opacity-40'
                              : row.excludeFromKpi
                                ? 'text-red-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`}
                          >
                            {row.excludeFromKpi ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{row.idPurchaseRequest ?? '—'}</td>
                      <td className="px-2 py-1.5 text-gray-800 max-w-[160px]">
                        <span className="line-clamp-2">{row.name ?? '—'}</span>
                      </td>
                      <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap" title={row.purchaseMethod ?? ''}>
                        <span className={row.purchaseMethod?.toLowerCase().includes('единственного') ? 'text-amber-600 font-medium' : ''}>
                          {shortMethod(row.purchaseMethod)}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 whitespace-nowrap">
                        {row.statusGroup ? (
                          <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${statusGroupClass(row.statusGroup)}`}>
                            {row.statusGroup}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-2 py-1.5 text-right text-gray-600 whitespace-nowrap">{formatAmount(row.budgetAmount, currency)}</td>
                      <td className="px-2 py-1.5 text-right font-medium whitespace-nowrap">
                        {row.savings !== null ? <span className="text-gray-800">{formatAmount(row.savings, currency)}</span> : <span className="text-gray-400">—</span>}
                      </td>
                      <td className={`px-2 py-1.5 text-right whitespace-nowrap font-medium ${rowPct === null ? 'text-gray-400' : rowPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {rowPct === null ? '—' : rowPct.toFixed(1) + '%'}
                      </td>
                      <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{formatDate(row.commissionCompletionDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Итог только по активным */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                  <td colSpan={5} className="px-2 py-1.5 text-gray-700 text-xs">Итого в расчёте ({activeData.length})</td>
                  <td className="px-2 py-1.5 text-right text-gray-800 whitespace-nowrap">{formatAmount(totalBudget, currency)}</td>
                  <td className="px-2 py-1.5 text-right text-gray-800 whitespace-nowrap">{formatAmount(totalSavings, currency)}</td>
                  <td className={`px-2 py-1.5 text-right whitespace-nowrap ${pct !== null && pct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {pct !== null ? pct.toFixed(1) + '%' : '—'}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
