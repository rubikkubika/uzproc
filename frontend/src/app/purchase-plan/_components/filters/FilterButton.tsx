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
  /** Выбранные значения (для отображения одного значения) */
  selectedValues?: Set<string>;
  /** Открыт ли фильтр */
  isOpen?: boolean;
  /** Callback для открытия/закрытия фильтра */
  onToggle: () => void;
}

/**
 * Переиспользуемый компонент кнопки фильтра
 * 
 * Используется в заголовках таблицы для всех фильтров с множественным выбором.
 * Отображает количество выбранных значений или "Все", если ничего не выбрано.
 * Имеет стрелку вниз, которая поворачивается при открытии.
 */
export default function FilterButton({
  buttonRef,
  selectedCount,
  selectedValues,
  isOpen = false,
  onToggle,
}: FilterButtonProps) {
  const displayText = selectedCount === 0 
    ? 'Все' 
    : selectedCount === 1 && selectedValues
    ? (Array.from(selectedValues)[0] || 'Все')
    : `${selectedCount} выбрано`;

  return (
    <div className="relative flex-1">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="w-full text-xs border border-gray-300 rounded px-1 py-0.5 bg-white text-left focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 flex items-center gap-1 hover:bg-gray-50"
        style={{ height: '24px', minHeight: '24px', maxHeight: '24px', minWidth: 0, boxSizing: 'border-box' }}
      >
        <span className="text-gray-600 truncate flex-1 min-w-0 text-left">
          {displayText}
        </span>
        <svg 
          className={`w-3 h-3 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>
  );
}
