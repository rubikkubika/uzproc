'use client';

import React, { useRef, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';

/**
 * Пропсы для компонента MultiSelectFilterDropdown
 */
export interface MultiSelectFilterDropdownProps {
  /** Открыт ли выпадающий список */
  isOpen: boolean;
  /** Позиция выпадающего списка (top, left) */
  position: { top: number; left: number } | null;
  /** Текущий поисковый запрос */
  searchQuery: string;
  /** Опции для выбора */
  options: string[];
  /** Выбранные значения */
  selectedValues: Set<string>;
  /** Callback для изменения поискового запроса */
  onSearchChange: (query: string) => void;
  /** Callback для переключения выбора опции */
  onToggle: (value: string) => void;
  /** Callback для выбора всех опций */
  onSelectAll: () => void;
  /** Callback для снятия выбора всех опций */
  onDeselectAll: () => void;
  /** Callback для закрытия выпадающего списка */
  onClose: () => void;
  /** Ref на кнопку, которая открывает выпадающий список */
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Общий UI-компонент для выпадающего списка с множественным выбором
 * 
 * Этот компонент полностью контролируемый через props и не содержит бизнес-логики.
 * Используется всеми фильтрами таблицы (ЦФО, Компания, Закупщик и т.д.)
 */
export default function MultiSelectFilterDropdown({
  isOpen,
  position,
  searchQuery,
  onSearchChange,
  options,
  selectedValues,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onClose,
  buttonRef,
}: MultiSelectFilterDropdownProps) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Если позиция не установлена, пытаемся вычислить её из buttonRef
  // Используем useMemo для вычисления позиции, чтобы она вычислялась синхронно
  // ВАЖНО: useMemo должен вызываться до любого условного return
  const finalPosition = useMemo(() => {
    if (position) {
      return position;
    }
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const calculatedPosition = {
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      };
      return calculatedPosition;
    }
    return { top: 0, left: 0 };
  }, [position, buttonRef]);

  // Закрываем при клике вне компонента
  useEffect(() => {
    if (!isOpen) return;

    // Добавляем задержку перед установкой обработчика, чтобы дать время для рендеринга и обработки кликов
    const timeoutId = setTimeout(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node;
        // Проверяем, не является ли цель клика checkbox или label
        const isCheckbox = (target as HTMLElement).tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox';
        const isLabel = (target as HTMLElement).tagName === 'LABEL';
        const isInsideDropdown = dropdownRef.current && dropdownRef.current.contains(target);
        const isButton = buttonRef.current && buttonRef.current.contains(target);
        
        // Не закрываем, если клик был на элементах внутри выпадающего списка
        if (!isInsideDropdown && !isButton && !isCheckbox && !isLabel) {
          // Добавляем задержку, чтобы дать возможность обработать клик на checkbox
          setTimeout(() => {
            onClose();
          }, 200);
        }
      };

      // Используем capture фазу, чтобы перехватить событие раньше
      document.addEventListener('mousedown', handleClickOutside, true);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true);
      };
    }, 200); // Увеличиваем задержку до 200мс

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isOpen, onClose, buttonRef]);

  if (!isOpen) return null;

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allSelected = filteredOptions.length > 0 && filteredOptions.every(opt => selectedValues.has(opt));
  const someSelected = filteredOptions.some(opt => selectedValues.has(opt));

  return (
    <div
      ref={dropdownRef}
      className="fixed z-50 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-hidden flex flex-col"
      style={{
        top: `${finalPosition.top}px`,
        left: `${finalPosition.left}px`,
        minWidth: '200px',
        maxWidth: '300px',
      }}
    >
      {/* Поиск */}
      <div className="p-2 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Поиск..."
            className="w-full pl-8 pr-8 py-1.5 text-sm text-gray-900 border border-gray-300 rounded bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Кнопки выбора всех/снятия выбора */}
      <div className="px-2 py-1 border-b border-gray-200 flex gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelectAll();
          }}
          className="text-xs text-blue-600 hover:text-blue-700"
          disabled={allSelected}
        >
          Выбрать все
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeselectAll();
          }}
          className="text-xs text-blue-600 hover:text-blue-700"
          disabled={!someSelected}
        >
          Снять все
        </button>
      </div>

      {/* Список опций */}
      <div className="flex-1 overflow-y-auto">
        {filteredOptions.length === 0 ? (
          <div className="p-2 text-sm text-gray-500 text-center">Нет результатов</div>
        ) : (
          <div className="p-1">
            {filteredOptions.map((option) => (
              <label
                key={option}
                className="flex items-center px-2 py-1.5 hover:bg-gray-50 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={selectedValues.has(option)}
                  onChange={(e) => {
                    e.stopPropagation();
                    if (onToggle) {
                      onToggle(option);
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Счетчик выбранных */}
      <div className="px-2 py-1 border-t border-gray-200 text-xs text-gray-500">
        Выбрано: {selectedValues.size}
      </div>
    </div>
  );
}
