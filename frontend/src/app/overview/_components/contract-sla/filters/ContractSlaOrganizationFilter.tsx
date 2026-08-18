'use client';

import { useEffect, useRef, useState } from 'react';
import { CONTRACT_SLA_ORGANIZATIONS } from '../constants/contract-sla.constants';

export interface ContractSlaOrganizationFilterProps {
  /** Выбранные организации (имена enum CustomerOrganization). */
  selected: Set<string>;
  /** Переключение одной организации. */
  onToggle: (value: string) => void;
  /** Выбрать все организации. */
  onSelectAll: () => void;
  /** Снять выбор со всех организаций (фильтр не применяется). */
  onDeselectAll: () => void;
}

/** Подпись на кнопке: одна организация — её название, несколько — счётчик, ноль — «Все». */
function buildLabel(selected: Set<string>): string {
  if (selected.size === 0 || selected.size === CONTRACT_SLA_ORGANIZATIONS.length) return 'Все';
  if (selected.size === 1) {
    const value = Array.from(selected)[0];
    return CONTRACT_SLA_ORGANIZATIONS.find((o) => o.value === value)?.label ?? value;
  }
  return `Выбрано: ${selected.size}`;
}

/** Выпадающий список с множественным выбором организации заказчика для дашборда «SLA договоров». */
export function ContractSlaOrganizationFilter({
  selected,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: ContractSlaOrganizationFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Закрытие по клику вне фильтра
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-1 px-1.5 py-1 text-xs border border-gray-300 rounded bg-white text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 whitespace-nowrap"
      >
        <span>{buildLabel(selected)}</span>
        <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 left-0 min-w-[180px] bg-white border border-gray-300 rounded shadow-lg py-1">
          <div className="flex items-center gap-2 px-2 pb-1 border-b border-gray-200">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
            >
              Все
            </button>
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-xs text-gray-500 hover:text-gray-700 hover:underline"
            >
              Снять
            </button>
          </div>
          {CONTRACT_SLA_ORGANIZATIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-900 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selected.has(option.value)}
                onChange={() => onToggle(option.value)}
                className="w-3 h-3 accent-blue-600 cursor-pointer"
              />
              <span className="whitespace-nowrap">{option.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
