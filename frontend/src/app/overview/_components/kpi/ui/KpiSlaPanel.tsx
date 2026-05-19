'use client';

import { X } from 'lucide-react';
import Link from 'next/link';
import type { KpiSlaDetail } from '../hooks/useKpiSlaDetails';
import { purchaserDisplayName } from '@/utils/purchaser';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatAmount(value: number | null): string {
  if (value === null || value === undefined) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e12) return (value / 1e12).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' трлн';
  if (abs >= 1e9) return (value / 1e9).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млрд';
  if (abs >= 1e6) return (value / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млн';
  if (abs >= 1e3) return (value / 1e3).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' тыс';
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

interface KpiSlaPanelProps {
  purchaser: string;
  data: KpiSlaDetail[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function KpiSlaPanel({ purchaser, data, loading, error, onClose }: KpiSlaPanelProps) {
  const total = data.length;
  const met = data.filter((r) => r.metSla === true).length;
  const pct = total > 0 ? (met / total) * 100 : null;

  return (
    <div className="flex flex-col bg-white rounded-lg shadow border border-gray-200 min-w-0 w-full h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-gray-800 truncate">
            {purchaserDisplayName(purchaser) || purchaser}
          </span>
          <span className="text-[10px] text-gray-500 flex gap-2">
            <span>Всего: {total}</span>
            <span>·</span>
            <span>В срок: {met}</span>
            {pct !== null && (
              <>
                <span>·</span>
                <span className={pct >= 80 ? 'text-green-600' : 'text-red-500'}>{pct.toFixed(1)}%</span>
              </>
            )}
          </span>
        </div>
        <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-auto flex-1 max-h-[480px]">
        {loading && <div className="py-6 text-center text-xs text-gray-400">Загрузка...</div>}
        {error && !loading && <div className="py-6 text-center text-xs text-red-500">{error}</div>}
        {!loading && !error && data.length === 0 && <div className="py-6 text-center text-xs text-gray-400">Нет заявок</div>}
        {!loading && !error && data.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 sticky top-0">
                <th className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">ID</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Наименование</th>
                <th className="px-2 py-1.5 text-center font-medium text-gray-500 whitespace-nowrap">Сложн.</th>
                <th className="px-2 py-1.5 text-right font-medium text-gray-500 whitespace-nowrap">Сумма</th>
                <th className="px-2 py-1.5 text-center font-medium text-gray-500 whitespace-nowrap">План</th>
                <th className="px-2 py-1.5 text-center font-medium text-gray-500 whitespace-nowrap">Факт</th>
                <th className="px-2 py-1.5 text-center font-medium text-gray-500 whitespace-nowrap">Разн.</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">Завершение</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const isMet = row.metSla === true;
                const isOverdue = row.metSla === false;
                return (
                  <tr key={row.id ?? `${row.idPurchaseRequest}-${row.purchaseCompletionDate}`} className="border-b border-gray-50 hover:bg-blue-50">
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {row.id ? (
                        <Link
                          href={`/purchase-request/${row.id}`}
                          className="text-blue-600 hover:underline"
                          title={`Перейти к заявке ${row.idPurchaseRequest ?? row.id}`}
                        >
                          {row.idPurchaseRequest ?? row.id}
                        </Link>
                      ) : '—'}
                    </td>
                    <td className="px-2 py-1.5 text-gray-800 max-w-[180px]">
                      <span className="line-clamp-2">{row.name ?? '—'}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center text-gray-700 whitespace-nowrap">{row.complexity ?? '—'}</td>
                    <td className="px-2 py-1.5 text-right text-gray-600 whitespace-nowrap">{formatAmount(row.budgetAmount)}</td>
                    <td className="px-2 py-1.5 text-center text-gray-700 whitespace-nowrap tabular-nums">
                      {row.plannedSlaDays ?? '—'}
                    </td>
                    <td className="px-2 py-1.5 text-center text-gray-700 whitespace-nowrap tabular-nums">
                      {row.factualSlaDays ?? '—'}
                    </td>
                    <td className="px-2 py-1.5 text-center whitespace-nowrap tabular-nums">
                      {row.diffDays === null || row.diffDays === undefined ? (
                        <span className="text-gray-400">—</span>
                      ) : isMet ? (
                        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1 rounded bg-green-600 text-white font-bold">
                          {row.diffDays > 0 ? `+${row.diffDays}` : row.diffDays}
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1 rounded bg-red-600 text-white font-bold">
                          {row.diffDays}
                        </span>
                      ) : (
                        <span className="text-gray-700">{row.diffDays}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{formatDate(row.purchaseCompletionDate)}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                <td colSpan={4} className="px-2 py-1.5 text-gray-700 text-xs">Итого ({total})</td>
                <td colSpan={2} className="px-2 py-1.5 text-center text-gray-800 whitespace-nowrap">В срок: {met}</td>
                <td className={`px-2 py-1.5 text-center whitespace-nowrap ${pct !== null && pct >= 80 ? 'text-green-600' : 'text-red-500'}`}>
                  {pct !== null ? pct.toFixed(1) + '%' : '—'}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
