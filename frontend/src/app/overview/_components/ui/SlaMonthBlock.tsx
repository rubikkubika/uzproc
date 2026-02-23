'use client';

import Link from 'next/link';
import { useSlaMonthBlockData } from '../hooks/useSlaMonthBlockData';

/** Сумма в сокращённом формате: тыс., млн, млрд, трлн */
function formatAmount(value: number | null): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e12) return (value / 1e12).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' трлн';
  if (abs >= 1e9) return (value / 1e9).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млрд';
  if (abs >= 1e6) return (value / 1e6).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' млн';
  if (abs >= 1e3) return (value / 1e3).toLocaleString('ru-RU', { maximumFractionDigits: 1 }) + ' тыс.';
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 0 });
}

/** Закупщик: только имя и фамилия (без отчества и лишних частей) */
function formatPurchaserShort(purchaser: string | null): string {
  if (purchaser == null || purchaser.trim() === '') return '—';
  const parts = purchaser.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 3) return `${parts[1]} ${parts[0]}`; // Имя Фамилия
  if (parts.length === 2) return purchaser.trim();
  return parts[0] ?? '—';
}

/** Плановый срок SLA (дней) по сложности: 1→3, 2→7, 3→15, 4→30 */
function getPlannedSlaDays(complexity: string | null): string {
  if (complexity == null || complexity.trim() === '') return '—';
  const c = complexity.trim();
  if (c === '1') return '3';
  if (c === '2') return '7';
  if (c === '3') return '15';
  if (c === '4') return '30';
  return '—';
}

interface SlaMonthBlockProps {
  title: string;
  year: number;
  month: number;
  isCurrentMonth?: boolean;
}

/**
 * UI компонент для блока месяца во вкладке SLA.
 * Таблица заявок по дате создания месяца: номер заявки, наименование, закупщик, статус.
 */
export function SlaMonthBlock({
  title,
  year,
  month,
}: SlaMonthBlockProps) {
  const { requests, loading, error } = useSlaMonthBlockData(year, month);

  return (
    <div className="bg-white rounded-lg shadow-lg p-3 sm:p-4">
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold text-gray-900 shrink-0">{title}</h3>
      </div>

      {loading && (
        <div className="min-h-[80px] flex items-center justify-center text-gray-500 text-sm">
          Загрузка…
        </div>
      )}

      {error && (
        <div className="mb-2 p-2 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs leading-tight">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-1.5 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Номер заявки
                </th>
                <th className="px-1.5 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Наименование
                </th>
                <th className="px-1.5 py-1 text-right text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Сумма
                </th>
                <th className="px-1.5 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Закупщик
                </th>
                <th className="px-1.5 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Сложность
                </th>
                <th className="px-1.5 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Статус
                </th>
                <th className="px-1.5 py-1 text-center text-xs font-medium text-gray-500 tracking-wider">
                  Плановый срок SLA
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-1.5 py-2 text-gray-500 text-center">
                    Нет заявок за этот месяц
                  </td>
                </tr>
              ) : (
                requests.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-1.5 py-1 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                      {row.id ? (
                        <Link
                          href={`/purchase-request/${row.id}`}
                          className="text-blue-600 hover:underline"
                          title={`Перейти к заявке ${row.idPurchaseRequest ?? row.id}`}
                        >
                          {row.idPurchaseRequest ?? row.id}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-1.5 py-1 text-gray-900 border-r border-gray-200">
                      {row.name}
                    </td>
                    <td className="px-1.5 py-1 text-gray-700 border-r border-gray-200 text-right whitespace-nowrap">
                      {formatAmount(row.budgetAmount)}
                    </td>
                    <td className="px-1.5 py-1 text-gray-700 border-r border-gray-200">
                      {formatPurchaserShort(row.purchaser)}
                    </td>
                    <td className="px-1.5 py-1 text-gray-700 border-r border-gray-200">
                      {row.complexity ?? '—'}
                    </td>
                    <td className="px-1.5 py-1 text-gray-700 border-r border-gray-200">
                      {row.status ?? '—'}
                    </td>
                    <td className="px-1.5 py-1 text-gray-700 text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center min-w-[1.5rem] h-6 px-1 rounded bg-gray-200 text-gray-700 font-bold tabular-nums">
                        {row.plannedSlaDays != null ? String(row.plannedSlaDays) : getPlannedSlaDays(row.complexity)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
