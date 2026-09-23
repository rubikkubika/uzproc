'use client';

import React from 'react';
import { DraftSlaRow, DraftSlaTable } from '../types/purchase-plan-items.types';
import { useDraftSlaForm } from '../hooks/useDraftSlaForm';
import { DRAFT_MANAGE_FORBIDDEN_TITLE } from '../constants/purchase-plan-items.constants';

interface PurchasePlanDraftSlaFormProps {
  year: number | null;
  table: DraftSlaTable | null;
  /** Менять таблицу могут закупщики и администраторы */
  canEdit: boolean;
  isSaving: boolean;
  errorMessage: string | null;
  onSave: (rows: DraftSlaRow[]) => void;
  onClose: () => void;
}

const INPUT_CLASS = 'w-16 text-xs border rounded px-1 py-0.5 text-right text-gray-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500';
const CELL_CLASS = 'px-2 py-2 text-xs text-gray-900 border-r border-gray-300';
const HEADER_CLASS = 'px-2 py-2 text-left text-xs font-medium text-gray-500 border-r border-gray-300';

/**
 * Форма таблицы SLA драфта: сроки по сложности (SLA закупки, SLA договора, итог) и сохранение.
 * Монтируется при открытии окна — каждый раз начинается с сохранённой таблицы.
 */
export default function PurchasePlanDraftSlaForm({
  year,
  table,
  canEdit,
  isSaving,
  errorMessage,
  onSave,
  onClose,
}: PurchasePlanDraftSlaFormProps) {
  const form = useDraftSlaForm(table);

  const handleSave = () => {
    const rows = form.toSave();
    if (rows) onSave(rows);
  };

  return (
    <>
      <div className="flex items-start justify-between mb-2">
        <h2 className="text-lg font-semibold text-gray-900">SLA драфта{year !== null ? ` на ${year} год` : ''}</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Закрыть">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <p className="text-xs text-gray-600 mb-3">
        Срок от даты заявки до нового договора в рабочих днях: SLA закупки + SLA договора (договор считается нетиповым).
        Таблица своя на каждый год; новый год начинается с копии предыдущего.
      </p>

      <table className="w-full border border-gray-300 mb-3">
        <thead className="bg-gray-50 border-b border-gray-300">
          <tr>
            <th className={HEADER_CLASS}>Сложность</th>
            <th className={HEADER_CLASS}>SLA закупки</th>
            <th className={HEADER_CLASS}>SLA договора</th>
            <th className="px-2 py-2 text-left text-xs font-medium text-gray-500">Итого</th>
          </tr>
        </thead>
        <tbody>
          {form.rows.map(row => (
            <tr key={row.complexity} className="border-b border-gray-200">
              <td className={CELL_CLASS}>{row.complexity}</td>
              <td className={CELL_CLASS}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={row.procurementDays}
                  disabled={!canEdit || isSaving}
                  onChange={(e) => form.updateField(row.complexity, 'procurementDays', e.target.value)}
                  className={`${INPUT_CLASS} ${row.procurementInvalid ? 'border-red-400' : 'border-gray-300'}`}
                />
              </td>
              <td className={CELL_CLASS}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={row.contractDays}
                  disabled={!canEdit || isSaving}
                  onChange={(e) => form.updateField(row.complexity, 'contractDays', e.target.value)}
                  className={`${INPUT_CLASS} ${row.contractInvalid ? 'border-red-400' : 'border-gray-300'}`}
                />
              </td>
              <td className="px-2 py-2 text-xs font-semibold text-gray-900">{row.totalDays ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-gray-500 mb-3">
        После сохранения дата завершения закупки у всех позиций драфта {year ?? ''} года пересчитается от даты заявки.
        {table?.updatedAt && table.updatedBy
          ? ` Последнее изменение: ${table.updatedBy}, ${new Date(table.updatedAt).toLocaleString('ru-RU')}.`
          : ''}
      </p>
      {!form.isValid && <p className="text-xs text-red-600 mb-2">Сроки — целые числа от 0 до 365.</p>}
      {errorMessage && <p className="text-xs text-red-600 mb-2">{errorMessage}</p>}

      <div className="flex justify-end gap-2">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          {canEdit ? 'Отмена' : 'Закрыть'}
        </button>
        {canEdit ? (
          <button
            onClick={handleSave}
            disabled={!form.isValid || !form.isChanged || isSaving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Сохранение…' : 'Сохранить и пересчитать'}
          </button>
        ) : (
          <span className="self-center text-xs text-gray-500">{DRAFT_MANAGE_FORBIDDEN_TITLE}</span>
        )}
      </div>
    </>
  );
}
