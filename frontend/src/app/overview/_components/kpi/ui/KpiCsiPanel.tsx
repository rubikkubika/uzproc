'use client';

import { X, Star } from 'lucide-react';
import Link from 'next/link';
import type { KpiCsiDetail } from '../hooks/useKpiCsiDetails';
import { purchaserDisplayName } from '@/utils/purchaser';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ratingClass(value: number | null): string {
  if (value === null || value === undefined) return 'text-gray-400';
  if (value >= 4.5) return 'text-green-600';
  if (value >= 3.5) return 'text-yellow-600';
  return 'text-red-500';
}

interface KpiCsiPanelProps {
  purchaser: string;
  data: KpiCsiDetail[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function KpiCsiPanel({ purchaser, data, loading, error, onClose }: KpiCsiPanelProps) {
  const validRatings = data.map((r) => r.avgRating).filter((v): v is number => v !== null);
  const overall = validRatings.length > 0
    ? validRatings.reduce((s, v) => s + v, 0) / validRatings.length
    : null;

  return (
    <div className="flex flex-col bg-white rounded-lg shadow border border-gray-200 min-w-0 w-full h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 flex-shrink-0">
        <div className="flex flex-col min-w-0">
          <span className="text-xs font-semibold text-gray-800 truncate">
            {purchaserDisplayName(purchaser) || purchaser}
          </span>
          <span className="text-[10px] text-gray-500 flex gap-2">
            <span>Отзывов: {data.length}</span>
            {overall !== null && (
              <>
                <span>·</span>
                <span className={ratingClass(overall)}>
                  Ср. оценка: {overall.toFixed(2)}
                </span>
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
        {!loading && !error && data.length === 0 && <div className="py-6 text-center text-xs text-gray-400">Нет отзывов</div>}
        {!loading && !error && data.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 sticky top-0">
                <th className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">ID</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500">Наименование</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">От кого</th>
                <th className="px-2 py-1.5 text-center font-medium text-gray-500 whitespace-nowrap" title="Скорость">Скор.</th>
                <th className="px-2 py-1.5 text-center font-medium text-gray-500 whitespace-nowrap" title="Качество">Кач.</th>
                <th className="px-2 py-1.5 text-center font-medium text-gray-500 whitespace-nowrap" title="Удовлетворённость">Удовл.</th>
                <th className="px-2 py-1.5 text-center font-medium text-gray-500 whitespace-nowrap" title="UzProc">UzProc</th>
                <th className="px-2 py-1.5 text-center font-medium text-gray-500 whitespace-nowrap">Ср.</th>
                <th className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">Дата</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-blue-50 align-top">
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {row.purchaseRequestId ? (
                      <Link
                        href={`/purchase-request/${row.purchaseRequestId}`}
                        className="text-blue-600 hover:underline"
                        title={`Перейти к заявке ${row.idPurchaseRequest ?? row.purchaseRequestId}`}
                      >
                        {row.idPurchaseRequest ?? row.purchaseRequestId}
                      </Link>
                    ) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-gray-800 max-w-[180px]">
                    <span className="line-clamp-2">{row.purchaseRequestName ?? '—'}</span>
                    {row.comment && (
                      <div className="text-[10px] text-gray-500 italic mt-0.5 line-clamp-2" title={row.comment}>
                        «{row.comment}»
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-gray-600 whitespace-nowrap max-w-[120px] overflow-hidden text-ellipsis" title={row.recipient ?? ''}>
                    {row.recipient ?? '—'}
                  </td>
                  <td className={`px-2 py-1.5 text-center whitespace-nowrap font-medium ${ratingClass(row.speedRating)}`}>
                    {row.speedRating !== null ? row.speedRating.toFixed(1) : '—'}
                  </td>
                  <td className={`px-2 py-1.5 text-center whitespace-nowrap font-medium ${ratingClass(row.qualityRating)}`}>
                    {row.qualityRating !== null ? row.qualityRating.toFixed(1) : '—'}
                  </td>
                  <td className={`px-2 py-1.5 text-center whitespace-nowrap font-medium ${ratingClass(row.satisfactionRating)}`}>
                    {row.satisfactionRating !== null ? row.satisfactionRating.toFixed(1) : '—'}
                  </td>
                  <td className={`px-2 py-1.5 text-center whitespace-nowrap font-medium ${ratingClass(row.uzprocRating)}`}>
                    {row.uzprocRating !== null ? row.uzprocRating.toFixed(1) : '—'}
                  </td>
                  <td className={`px-2 py-1.5 text-center whitespace-nowrap font-bold ${ratingClass(row.avgRating)}`}>
                    {row.avgRating !== null ? (
                      <span className="inline-flex items-center gap-0.5">
                        <Star className="w-3 h-3" />
                        {row.avgRating.toFixed(2)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-2 py-1.5 text-gray-500 whitespace-nowrap">{formatDate(row.createdAt)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                <td colSpan={7} className="px-2 py-1.5 text-gray-700 text-xs">Итого ({data.length})</td>
                <td className={`px-2 py-1.5 text-center whitespace-nowrap ${ratingClass(overall)}`}>
                  {overall !== null ? overall.toFixed(2) : '—'}
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
