'use client';

import React from 'react';
import { EyeOff } from 'lucide-react';

interface PurchasePlanExcludedFilterButtonProps {
  /** В таблице сейчас только исключённые позиции */
  active: boolean;
  onClick: () => void;
}

/**
 * Кнопка-фильтр «Скрытые»: показывает позиции, исключённые из планирования (статус «Исключена»),
 * повторное нажатие возвращает статусы по умолчанию.
 */
export default function PurchasePlanExcludedFilterButton({ active, onClick }: PurchasePlanExcludedFilterButtonProps) {
  return (
    <button
      data-tour="excluded-filter"
      onClick={onClick}
      aria-pressed={active}
      className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1 ${
        active
          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
          : 'text-gray-900 bg-white border-gray-300 hover:bg-gray-50'
      }`}
      title={active
        ? 'Показаны только скрытые позиции. Нажмите, чтобы вернуть обычный фильтр статуса'
        : 'Показать только позиции, исключённые из планирования (статус «Исключена»)'}
    >
      <EyeOff className="w-3 h-3" />
      Скрытые
    </button>
  );
}
