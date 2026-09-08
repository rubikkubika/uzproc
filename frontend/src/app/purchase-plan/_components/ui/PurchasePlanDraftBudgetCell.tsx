'use client';

import React, { useState } from 'react';

interface PurchasePlanDraftBudgetCellProps {
  /** Текущее значение бюджета */
  value: number | null;
  /** Форматирование суммы для режима просмотра */
  formatBudget: (amount: number | null) => string;
  /** Строка редактируется прямо сейчас */
  isEditing: boolean;
  /** Редактирование доступно (драфт, есть права, не архивная версия) */
  canEdit: boolean;
  /** Включить режим редактирования / выйти из него */
  onStartEdit: () => void;
  onCancelEdit: () => void;
  /** Сохранить новое значение */
  onSave: (value: string) => void;
}

/**
 * Ячейка «Бюджет» в драфте плана закупок: клик открывает поле ввода,
 * Enter сохраняет, Escape отменяет. В действующем плане — только просмотр.
 */
export default function PurchasePlanDraftBudgetCell({
  value,
  formatBudget,
  isEditing,
  canEdit,
  onStartEdit,
  onCancelEdit,
  onSave,
}: PurchasePlanDraftBudgetCellProps) {
  const [inputValue, setInputValue] = useState<string>(value != null ? String(value) : '');

  if (!isEditing) {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (canEdit) {
            setInputValue(value != null ? String(value) : '');
            onStartEdit();
          }
        }}
        className={canEdit ? 'cursor-pointer hover:bg-blue-50 rounded px-1 py-0.5 transition-colors' : ''}
        title={canEdit ? 'Нажмите для редактирования' : ''}
      >
        {formatBudget(value)}
      </div>
    );
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={inputValue}
      autoFocus
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => setInputValue(e.target.value)}
      onBlur={() => onSave(inputValue)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onSave(inputValue);
        } else if (e.key === 'Escape') {
          onCancelEdit();
        }
      }}
      className="w-full text-right text-gray-900 bg-white border border-blue-500 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
      style={{ fontSize: '13.44px' }}
    />
  );
}
