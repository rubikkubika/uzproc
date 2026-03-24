'use client';

import { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getBackendUrl } from '@/utils/api';
import type { SavingsByPurchaserData, SavingsPurchaseDetail } from '../hooks/useOverviewSavingsData';

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

function shortName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;
  return parts[0] + ' ' + parts[1];
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function savingsTypeLabel(type: string | null): string {
  if (!type) return '—';
  if (type === 'FROM_MEDIAN') return 'Медиана';
  if (type === 'FROM_EXISTING_CONTRACT') return 'Сущ. дог.';
  return 'Комбинированный';
}

function statusLabel(status: string | null): string {
  if (!status) return '—';
  const map: Record<string, string> = {
    NEW: 'Новая',
    IN_PROGRESS: 'В работе',
    COMPLETED: 'Завершена',
    CANCELLED: 'Отменена',
  };
  return map[status] || status;
}

interface SavingsByPurchaserTableProps {
  data: SavingsByPurchaserData[];
  year: number;
  currency?: 'UZS' | 'USD';
}

export function SavingsByPurchaserTable({ data, year, currency = 'UZS' }: SavingsByPurchaserTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<Record<string, SavingsPurchaseDetail[]>>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<string>>(new Set());

  const toggleExpand = useCallback(async (purchaser: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(purchaser)) {
        next.delete(purchaser);
      } else {
        next.add(purchaser);
      }
      return next;
    });

    if (!details[purchaser]) {
      setLoadingDetails(prev => new Set(prev).add(purchaser));
      try {
        const res = await fetch(
          `${getBackendUrl()}/api/overview/savings/purchases?year=${year}&purchaser=${encodeURIComponent(purchaser)}`
        );
        if (res.ok) {
          const json: SavingsPurchaseDetail[] = await res.json();
          setDetails(prev => ({ ...prev, [purchaser]: json }));
        }
      } catch {
        // ignore
      } finally {
        setLoadingDetails(prev => {
          const next = new Set(prev);
          next.delete(purchaser);
          return next;
        });
      }
    }
  }, [details, year]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded shadow px-2 py-1.5 flex items-center justify-center">
        <p className="text-xs text-gray-400">Нет данных</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded shadow px-2 py-1.5 overflow-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-1 py-1 w-5"></th>
            <th className="px-2 py-1 text-left text-gray-600 font-medium border-b border-gray-200">Закупщик</th>
            <th className="px-2 py-1 text-right text-gray-600 font-medium border-b border-gray-200">Всего</th>
            <th className="px-2 py-1 text-right text-blue-600 font-medium border-b border-gray-200">Медиана</th>
            <th className="px-2 py-1 text-right text-green-600 font-medium border-b border-gray-200">Сущ. дог.</th>
            <th className="px-2 py-1 text-right text-gray-500 font-medium border-b border-gray-200">Комбинированный</th>
            <th className="px-2 py-1 text-right text-gray-600 font-medium border-b border-gray-200">Кол-во</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => {
            const isExpanded = expanded.has(row.purchaser);
            const isLoading = loadingDetails.has(row.purchaser);
            const purchaserDetails = details[row.purchaser];

            return (
              <PurchaserRow
                key={row.purchaser}
                row={row}
                isExpanded={isExpanded}
                isLoading={isLoading}
                purchaserDetails={purchaserDetails}
                currency={currency}
                onToggle={toggleExpand}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface PurchaserRowProps {
  row: SavingsByPurchaserData;
  isExpanded: boolean;
  isLoading: boolean;
  purchaserDetails: SavingsPurchaseDetail[] | undefined;
  currency: 'UZS' | 'USD';
  onToggle: (purchaser: string) => void;
}

function PurchaserRow({ row, isExpanded, isLoading, purchaserDetails, currency, onToggle }: PurchaserRowProps) {
  return (
    <>
      <tr
        className="hover:bg-gray-50 border-b border-gray-100 cursor-pointer"
        onClick={() => onToggle(row.purchaser)}
      >
        <td className="px-1 py-1 text-gray-400">
          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </td>
        <td className="px-2 py-1 text-gray-900 font-medium">{shortName(row.purchaser)}</td>
        <td className="px-2 py-1 text-right text-gray-900 font-bold">{formatAmount(row.totalSavings, currency)}</td>
        <td className="px-2 py-1 text-right text-blue-600">{formatAmount(row.savingsFromMedian, currency)}</td>
        <td className="px-2 py-1 text-right text-green-600">{formatAmount(row.savingsFromExistingContract, currency)}</td>
        <td className="px-2 py-1 text-right text-gray-500">{formatAmount(row.savingsUntyped, currency)}</td>
        <td className="px-2 py-1 text-right text-gray-700">{row.count}</td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={7} className="p-0">
            {isLoading ? (
              <div className="px-4 py-2 text-xs text-gray-400 text-center">Загрузка...</div>
            ) : purchaserDetails && purchaserDetails.length > 0 ? (
              <div className="bg-gray-50 px-4 py-1">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-2 py-1 text-left text-gray-500 font-medium">№</th>
                      <th className="px-2 py-1 text-left text-gray-500 font-medium">ЦФО</th>
                      <th className="px-2 py-1 text-left text-gray-500 font-medium">Название</th>
                      <th className="px-2 py-1 text-left text-gray-500 font-medium">Дата</th>
                      <th className="px-2 py-1 text-right text-gray-500 font-medium">Бюджет</th>
                      <th className="px-2 py-1 text-right text-gray-500 font-medium">Экономия</th>
                      <th className="px-2 py-1 text-left text-gray-500 font-medium">Тип</th>
                      <th className="px-2 py-1 text-left text-gray-500 font-medium">Слож.</th>
                      <th className="px-2 py-1 text-left text-gray-500 font-medium">Статус</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaserDetails.map((d, idx) => (
                      <tr key={idx} className="border-b border-gray-200 hover:bg-white">
                        <td className="px-2 py-1 text-gray-700">{d.idPurchaseRequest ?? '—'}</td>
                        <td className="px-2 py-1 text-gray-700">{d.cfo ?? '—'}</td>
                        <td className="px-2 py-1 text-gray-900 max-w-[200px] truncate" title={d.name ?? ''}>{d.name ?? '—'}</td>
                        <td className="px-2 py-1 text-gray-700 whitespace-nowrap">{formatDate(d.purchaseCreationDate)}</td>
                        <td className="px-2 py-1 text-right text-gray-700">{d.budgetAmount != null ? formatAmount(d.budgetAmount, currency) : '—'}</td>
                        <td className="px-2 py-1 text-right text-gray-900 font-medium">{d.savings != null ? formatAmount(d.savings, currency) : '—'}</td>
                        <td className="px-2 py-1 text-gray-600">{savingsTypeLabel(d.savingsType)}</td>
                        <td className="px-2 py-1 text-gray-600">{d.complexity ?? '—'}</td>
                        <td className="px-2 py-1 text-gray-600">{statusLabel(d.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-4 py-2 text-xs text-gray-400 text-center">Нет деталей</div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
