'use client';

import React from 'react';

/**
 * Пропсы для компонента FilterButton
 */
export interface FilterButtonProps {
  /** Ref на кнопку */
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  /** Количество выбранных значений */
  selectedCount: number;
  /** Callback для открытия/закрытия фильтра */
  onToggle: () => void;
}

/**
 * Переиспользуемый компонент кнопки фильтра
 * 
 * Используется в заголовках таблицы для всех фильтров с множественным выбором.
 * Отображает количество выбранных значений или "Все", если ничего не выбрано.
 */
export default function FilterButton({
  buttonRef,
  selectedCount,
  onToggle,
}: FilterButtonProps) {
  return (
    <button
      ref={buttonRef}
      onClick={onToggle}
      className="flex-1 text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
      style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
    >
      {selectedCount > 0 
        ? `${selectedCount} выбрано`
        : 'Все'}
    </button>
  );
}
