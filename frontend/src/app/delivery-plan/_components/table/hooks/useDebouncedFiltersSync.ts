import { useEffect } from 'react';
import { TEXT_FILTER_FIELDS, DEBOUNCE_DELAY } from '../constants/delivery-plan-table.constants';
import type { DeliveryPlanTableFilters } from '../types/delivery-plan-table.types';

interface UseDebouncedFiltersSyncProps {
  localFilters: DeliveryPlanTableFilters;
  filtersFromHook: DeliveryPlanTableFilters;
  focusedField: string | null;
  setFilters: (filters: DeliveryPlanTableFilters) => void;
  setCurrentPage: (page: number) => void;
}

/**
 * Хук для синхронизации локальных фильтров (UI) с примененными фильтрами (данные)
 * с debounce для предотвращения множественных запросов при вводе
 */
export function useDebouncedFiltersSync({
  localFilters,
  filtersFromHook,
  focusedField,
  setFilters,
  setCurrentPage,
}: UseDebouncedFiltersSyncProps) {
  useEffect(() => {
    // Проверяем, есть ли изменения в текстовых полях
    const hasTextChanges = TEXT_FILTER_FIELDS.some(
      field => localFilters[field as keyof DeliveryPlanTableFilters] !== filtersFromHook[field as keyof DeliveryPlanTableFilters]
    );

    if (hasTextChanges) {
      // Сохраняем текущий focused input и позицию курсора
      const input = focusedField
        ? (document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement)
        : null;
      const cursorPosition = input ? input.selectionStart || 0 : null;

      // Устанавливаем таймер debounce
      const timer = setTimeout(() => {
        // Применяем фильтры
        setFilters({ ...localFilters });
        setCurrentPage(0);

        // Восстанавливаем фокус и позицию курсора
        if (focusedField && cursorPosition !== null) {
          setTimeout(() => {
            const inputAfter = document.querySelector(
              `input[data-filter-field="${focusedField}"]`
            ) as HTMLInputElement;
            if (inputAfter) {
              inputAfter.focus();
              const pos = Math.min(cursorPosition, inputAfter.value.length);
              inputAfter.setSelectionRange(pos, pos);
            }
          }, 0);
        }
      }, DEBOUNCE_DELAY);

      return () => clearTimeout(timer);
    }
  }, [localFilters, filtersFromHook, focusedField, setFilters, setCurrentPage]);
}
