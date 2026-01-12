'use client';

import React from 'react';
import MultiSelectFilterDropdown, { MultiSelectFilterDropdownProps } from './MultiSelectFilterDropdown';

/**
 * Пропсы для компонента PurchaserFilterDropdown
 */
export interface PurchaserFilterDropdownProps {
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
 * Компонент фильтра Закупщик
 * 
 * Отвечает только за UI, использует MultiSelectFilterDropdown внутри.
 * Вся бизнес-логика находится в usePurchasePlanItemsFilters.
 */
export default function PurchaserFilterDropdown({
  isOpen,
  position,
  searchQuery,
  options,
  selectedValues,
  onSearchChange,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onClose,
  buttonRef,
}: PurchaserFilterDropdownProps) {
  return (
    <MultiSelectFilterDropdown
      isOpen={isOpen}
      position={position}
      searchQuery={searchQuery}
      options={options}
      selectedValues={selectedValues}
      onSearchChange={onSearchChange}
      onToggle={onToggle}
      onSelectAll={onSelectAll}
      onDeselectAll={onDeselectAll}
      onClose={onClose}
      buttonRef={buttonRef}
    />
  );
}
