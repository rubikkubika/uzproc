'use client';

import { useRouter } from 'next/navigation';
import type { PurchaseRequest } from '@/app/purchase-requests/_components/types/purchase-request.types';
import type { TimelinesRequestItem } from '../hooks/useTimelinesRequests';

/** Структура колонок этапов */
interface StageCol {
  key: string;
  label: string;
  isMain: boolean;
  isTotal: boolean;
  sumOf?: string[];
}

const STAGE_COLUMNS: StageCol[] = [
  { key: 'Срок', label: 'Срок', isMain: false, isTotal: true },
  { key: 'Заявка', label: 'Заявка', isMain: true, isTotal: false, sumOf: ['Подготовка ЗнЗ', 'Согласование ЗнЗ'] },
  { key: 'Подготовка ЗнЗ', label: 'Подг.', isMain: false, isTotal: false },
  { key: 'Согласование ЗнЗ', label: 'Согл.', isMain: false, isTotal: false },
  { key: 'Закупка', label: 'Закупка', isMain: true, isTotal: false, sumOf: ['Закупка Общий', 'Закупка Итоги'] },
  { key: 'Закупка Общий', label: 'Общий', isMain: false, isTotal: false },
  { key: 'Закупка Итоги', label: 'Итоги', isMain: false, isTotal: false },
  { key: 'Договор', label: 'Договор', isMain: true, isTotal: false, sumOf: ['Подготовка договора', 'Согласование договора', 'Регистрация договора'] },
  { key: 'Подготовка договора', label: 'Подг.', isMain: false, isTotal: false },
  { key: 'Согласование договора', label: 'Согл.', isMain: false, isTotal: false },
  { key: 'Регистрация договора', label: 'Регист.', isMain: false, isTotal: false },
];

const MAIN_TH = 'bg-blue-50 text-gray-700 font-semibold border-l-2 border-l-blue-400';
const SUB_TH = 'text-gray-500';
const MAIN_TD = 'bg-blue-50/40 font-semibold text-gray-900 border-l-2 border-l-blue-400';
const SUB_TD = 'text-gray-700';
const TOTAL_TH = 'bg-gray-100 text-gray-700 font-semibold';
const TOTAL_TD = 'bg-gray-100 font-semibold text-gray-900';

function getStageDayValue(daysByStage: Record<string, number>, col: StageCol): number | null {
  if (col.sumOf) {
    const vals = col.sumOf.map((k) => daysByStage[k]);
    if (vals.every((v) => v == null)) return null;
    return vals.reduce((sum, v) => sum + (v ?? 0), 0);
  }
  return daysByStage[col.key] ?? null;
}

const DATA_COLUMNS: { key: keyof PurchaseRequest; label: string }[] = [
  { key: 'idPurchaseRequest', label: '№' },
  { key: 'cfo', label: 'ЦФО' },
  { key: 'purchaser', label: 'Закупщик' },
  { key: 'name', label: 'Название' },
  { key: 'purchaseRequestCreationDate', label: 'Дата создания' },
  { key: 'budgetAmount', label: 'Бюджет' },
  { key: 'complexity', label: 'Слож.' },
  { key: 'status', label: 'Статус' },
];

function formatDate(value: string | null): string {
  if (!value) return '—';
  try {
    const d = new Date(value);
    return d.toLocaleDateString('ru-RU');
  } catch {
    return value;
  }
}

function formatBudget(value: number | null, currency: string | null): string {
  if (value == null) return '—';
  const formatted = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
  return currency ? `${formatted} ${currency}` : formatted;
}

function getCellValue(pr: PurchaseRequest, key: string): string {
  switch (key) {
    case 'idPurchaseRequest':
      return pr.idPurchaseRequest != null ? String(pr.idPurchaseRequest) : '—';
    case 'purchaseRequestCreationDate':
      return formatDate(pr.purchaseRequestCreationDate);
    case 'budgetAmount':
      return formatBudget(pr.budgetAmount, pr.currency);
    case 'status':
      return pr.status ?? '—';
    default: {
      const val = (pr as unknown as Record<string, unknown>)[key];
      return val != null ? String(val) : '—';
    }
  }
}

interface TimelinesRequestsTableProps {
  year: number;
  complexity: string;
  items: TimelinesRequestItem[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function TimelinesRequestsTable({ year, complexity, items, loading, error, onClose }: TimelinesRequestsTableProps) {
  const router = useRouter();
  return (
    <div className="bg-white rounded shadow mt-3">
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">
          Заявки на закупку — {year}, сложность {complexity} ({items.length})
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
          title="Закрыть"
        >
          ✕
        </button>
      </div>
      {loading && (
        <div className="p-4 text-center text-gray-500 text-sm">Загрузка...</div>
      )}
      {error && (
        <div className="p-4 text-center text-red-600 text-sm">Ошибка: {error}</div>
      )}
      {!loading && !error && items.length === 0 && (
        <div className="p-4 text-center text-gray-500 text-sm">Нет заявок</div>
      )}
      {!loading && !error && items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full table-fixed text-xs border-collapse" style={{ minWidth: '980px' }}>
            <colgroup><col style={{ width: '55px' }} /><col style={{ width: '60px' }} /><col style={{ width: '90px' }} /><col style={{ width: '150px' }} /><col style={{ width: '72px' }} /><col style={{ width: '80px' }} /><col style={{ width: '40px' }} /><col style={{ width: '90px' }} />{STAGE_COLUMNS.map((sc) => (
                <col key={sc.key} style={{ width: sc.isTotal ? '44px' : sc.isMain ? '52px' : '40px' }} />
              ))}</colgroup>
            <thead>
              <tr className="bg-gray-50">
                {DATA_COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="px-1 py-1.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-b border-gray-300 truncate"
                    title={col.label}
                  >
                    {col.label}
                  </th>
                ))}
                {STAGE_COLUMNS.map((sc) => {
                  const thClass = sc.isTotal ? TOTAL_TH : sc.isMain ? MAIN_TH : SUB_TH;
                  return (
                    <th
                      key={sc.key}
                      className={`px-1 py-1.5 text-center text-[11px] font-medium border-r border-b border-gray-300 ${thClass}`}
                    >
                      {sc.label}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.request.id}
                  className="hover:bg-gray-50 border-b border-gray-200 cursor-pointer"
                  onClick={() => router.push(`/purchase-request/${item.request.id}`)}
                >
                  {DATA_COLUMNS.map((col) => (
                    <td
                      key={col.key}
                      className="px-1 py-1.5 text-[11px] text-gray-900 border-r border-gray-300 truncate overflow-hidden text-ellipsis"
                      title={getCellValue(item.request, col.key)}
                    >
                      {getCellValue(item.request, col.key)}
                    </td>
                  ))}
                  {STAGE_COLUMNS.map((sc) => {
                    const val = getStageDayValue(item.daysByStage, sc);
                    const tdClass = sc.isTotal ? TOTAL_TD : sc.isMain ? MAIN_TD : SUB_TD;
                    return (
                      <td
                        key={sc.key}
                        className={`px-1 py-1.5 text-[11px] text-center border-r border-gray-300 ${tdClass}`}
                      >
                        {val != null ? val : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
