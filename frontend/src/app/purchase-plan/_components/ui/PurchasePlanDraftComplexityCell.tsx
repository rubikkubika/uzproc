'use client';

import React from 'react';
import { COMPLEXITY_OPTIONS } from '../constants/purchase-plan-items.constants';

interface PurchasePlanDraftComplexityCellProps {
  /** Текущий уровень сложности */
  value: string | null;
  /** Строка редактируется прямо сейчас */
  isEditing: boolean;
  /** Редактирование доступно (драфт, есть права, не архивная версия) */
  canEdit: boolean;
  /** Включить режим редактирования / выйти из него */
  onStartEdit: () => void;
  onCancelEdit: () => void;
  /** Сохранить выбранный уровень */
  onSave: (value: string) => void;
}

/**
 * Ячейка «Сложность» в драфте плана закупок: выбор уровня 1–4 из списка.
 * От сложности зависит длительность процедуры, поэтому бэкенд пересчитывает
 * дату завершения закупки. В действующем плане — только просмотр.
 */
export default function PurchasePlanDraftComplexityCell({
  value,
  isEditing,
  canEdit,
  onStartEdit,
  onCancelEdit,
  onSave,
}: PurchasePlanDraftComplexityCellProps) {
  if (!isEditing) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (canEdit) onStartEdit();
        }}
        className={canEdit ? 'cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors' : ''}
        title={canEdit ? 'Нажмите для редактирования' : ''}
      >
        {value || '-'}
      </div>
    );
  }

  return (
    <select
      value={value || ''}
      autoFocus
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onSave(e.target.value)}
      onBlur={onCancelEdit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onCancelEdit();
      }}
      className="w-full text-gray-900 bg-white border border-blue-500 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
      style={{ fontSize: '13.44px' }}
    >
      <option value="">-</option>
      {COMPLEXITY_OPTIONS.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
