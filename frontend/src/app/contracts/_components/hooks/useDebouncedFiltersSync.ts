import { useEffect } from 'react';

interface UseDebouncedFiltersSyncProps {
  localFilters: Record<string, string>;
  filtersFromHook: Record<string, string>;
  focusedField: string | null;
  setFilters: (filters: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setCurrentPage: (page: number) => void;
}

const TEXT_FIELDS = [
  'innerId',
  'name',
  'documentForm',
  'costType',
  'contractType',
];

export function useDebouncedFiltersSync({
  localFilters,
  filtersFromHook,
  focusedField,
  setFilters,
  setCurrentPage,
}: UseDebouncedFiltersSyncProps) {
  useEffect(() => {
    const hasTextChanges = TEXT_FIELDS.some(f => localFilters[f] !== filtersFromHook[f]);
    if (hasTextChanges) {
      const input = focusedField ? document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement : null;
      const cursorPosition = input ? input.selectionStart || 0 : null;

      const timer = setTimeout(() => {
        setFilters(prev => {
          const updated = {...prev};
          TEXT_FIELDS.forEach(f => updated[f] = localFilters[f] || '');
          return updated;
        });
        setCurrentPage(0);

        if (focusedField && cursorPosition !== null) {
          setTimeout(() => {
            const inputAfter = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
            if (inputAfter) {
              inputAfter.focus();
              const pos = Math.min(cursorPosition, inputAfter.value.length);
              inputAfter.setSelectionRange(pos, pos);
            }
          }, 0);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [localFilters, filtersFromHook, focusedField, setFilters, setCurrentPage]);
}
