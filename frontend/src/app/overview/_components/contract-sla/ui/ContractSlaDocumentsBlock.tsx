'use client';

import type { ContractSlaRow } from '../types/contract-sla.types';
import { ContractSlaTableRow } from './ContractSlaTableRow';

export interface ContractSlaDocumentsBlockProps {
  title: string;
  /** Подпись под заголовком (например, месяц подписания). */
  subtitle?: string;
  /** Бейдж с месяцем, документы которого показаны ниже (например, «Август 2026»). */
  monthBadge?: string;
  /** Месяц выбран кликом по диаграмме — бейдж кликабелен и снимает выбор. */
  monthBadgeSelected?: boolean;
  /** Клик по бейджу: вернуться к месяцу по умолчанию. */
  onMonthBadgeClick?: () => void;
  rows: ContractSlaRow[];
  /** Акцент заголовка: нарушение SLA — красный, в срок — зелёный. */
  variant: 'violation' | 'ok';
  loading?: boolean;
  error?: string | null;
}

const VARIANT_DOT_CLASSES: Record<string, string> = {
  violation: 'bg-red-500',
  ok: 'bg-green-500',
};

/**
 * Блок со списком подписанных документов: этапы «факт / план» и отклонения по каждому этапу.
 * Аналог SlaStatusBlock на вкладке SLA закупок.
 */
export function ContractSlaDocumentsBlock({
  title,
  subtitle,
  monthBadge,
  monthBadgeSelected = false,
  onMonthBadgeClick,
  rows,
  variant,
  loading,
  error,
}: ContractSlaDocumentsBlockProps) {
  return (
    <div className="bg-white rounded-lg shadow p-2">
      <div className="mb-1 flex items-baseline gap-1.5 flex-wrap">
        <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${VARIANT_DOT_CLASSES[variant]}`} />
        <h3 className="text-xs font-semibold text-gray-900 shrink-0">{title}</h3>
        <span className="text-[11px] text-gray-500 tabular-nums">{rows.length}</span>
        {monthBadge && (
          <span
            role={monthBadgeSelected && onMonthBadgeClick ? 'button' : undefined}
            onClick={monthBadgeSelected && onMonthBadgeClick ? onMonthBadgeClick : undefined}
            title={
              monthBadgeSelected
                ? 'Месяц выбран на диаграмме — нажмите, чтобы вернуться к текущему месяцу'
                : 'Месяц, документы которого показаны'
            }
            className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap border ${
              monthBadgeSelected
                ? `bg-blue-600 text-white border-blue-600 ${onMonthBadgeClick ? 'cursor-pointer hover:bg-blue-700' : ''}`
                : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}
          >
            {monthBadge}
          </span>
        )}
        {subtitle && <span className="text-[11px] text-gray-500">{subtitle}</span>}
      </div>

      {loading && (
        <div className="min-h-[40px] flex items-center justify-center text-gray-500 text-xs">Загрузка…</div>
      )}

      {error && <div className="mb-1 p-1.5 rounded bg-red-50 text-red-700 text-xs">{error}</div>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] table-fixed border-collapse text-[11px] leading-snug">
            <colgroup>
              <col style={{ width: '90px' }} />
              <col style={{ width: '260px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '130px' }} />
              <col style={{ width: '140px' }} />
              <col style={{ width: '90px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '110px' }} />
              <col style={{ width: '80px' }} />
            </colgroup>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Номер
                </th>
                <th className="px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Наименование
                </th>
                <th className="px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Форма документа
                </th>
                <th className="px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  ЦФО
                </th>
                <th className="px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Специалист
                </th>
                <th className="px-1.5 py-0.5 text-left text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300">
                  Дата подписания
                </th>
                <th
                  className="px-1.5 py-0.5 text-center text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300"
                  title="Рабочих дней: факт / план. Бейдж — отклонение (план − факт)"
                >
                  Подготовка
                </th>
                <th
                  className="px-1.5 py-0.5 text-center text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300"
                  title="Рабочих дней: факт / план. Бейдж — отклонение (план − факт)"
                >
                  Согласование
                </th>
                <th
                  className="px-1.5 py-0.5 text-center text-[11px] font-medium text-gray-500 tracking-wider border-r border-gray-300"
                  title="Рабочих дней: факт / план. Бейдж — отклонение (план − факт)"
                >
                  Подписание
                </th>
                <th className="px-1.5 py-0.5 text-center text-[11px] font-medium text-gray-500 tracking-wider">
                  Итого
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-1.5 py-1 text-gray-500 text-center text-[11px]">
                    Нет документов
                  </td>
                </tr>
              ) : (
                rows.map((row) => <ContractSlaTableRow key={row.id} row={row} />)
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
