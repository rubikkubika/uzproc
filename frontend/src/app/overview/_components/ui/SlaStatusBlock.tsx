'use client';

import { useSlaStatusBlockData } from '../hooks/useSlaStatusBlockData';
import type { OverviewSlaRequestRow } from '../hooks/useOverviewSlaData';

interface SlaStatusBlockProps {
  /** Заголовок блока (название группы статусов) */
  title: string;
  /** Группа статусов для фильтра API (при использовании хука) */
  statusGroup?: string;
  /** Год назначения на утверждение (при использовании хука) */
  year?: number | null;
  /** Данные с обзорного API (один запрос на все блоки) — при передаче хук не вызывается */
  requests?: OverviewSlaRequestRow[];
  loading?: boolean;
  error?: string | null;
}

function formatAssignmentDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
}

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

/**
 * Блок SLA: таблица заявок (тип закупка) по группе статусов — номер заявки, наименование, закупщик, статус, дата назначения на утверждение, дата завершения закупки.
 * Если переданы requests/loading/error — используются они (данные с /api/overview/sla); иначе вызывается useSlaStatusBlockData(statusGroup, year).
 */
export function SlaStatusBlock({ title, statusGroup, year, requests: propsRequests, loading: propsLoading, error: propsError }: SlaStatusBlockProps) {
  const hookData = useSlaStatusBlockData(
    propsRequests === undefined ? (statusGroup ?? '') : '',
    propsRequests === undefined ? (year ?? null) : null
  );
  const useProps = propsRequests !== undefined;
  const requests = useProps ? (propsRequests ?? []) : hookData.requests;
  const loading = useProps ? (propsLoading ?? false) : hookData.loading;
  const error = useProps ? (propsError ?? null) : hookData.error;

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
                <th className="px-1.5 py-1 text-center text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Плановый срок SLA
                </th>
                <th className="px-1.5 py-1 text-left text-xs font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Дата назначения на утверждение
                </th>
                <th className="px-1.5 py-1 text-left text-xs font-medium text-gray-500 tracking-wider">
                  Дата завершения закупки
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-1.5 py-2 text-gray-500 text-center">
                    Нет заявок
                  </td>
                </tr>
              ) : (
                requests.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-1.5 py-1 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                      {row.idPurchaseRequest ?? '—'}
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
                    <td className="px-1.5 py-1 text-gray-700 border-r border-gray-200 text-center whitespace-nowrap">
                      {getPlannedSlaDays(row.complexity)}
                    </td>
                    <td className="px-1.5 py-1 text-gray-700 border-r border-gray-200 whitespace-nowrap">
                      {formatAssignmentDate(row.approvalAssignmentDate)}
                    </td>
                    <td className="px-1.5 py-1 text-gray-700 whitespace-nowrap">
                      {formatAssignmentDate(row.purchaseCompletionDate)}
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
