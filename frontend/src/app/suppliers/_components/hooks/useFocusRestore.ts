import { useEffect } from 'react';

interface UseFocusRestoreProps {
  focusedField: string | null;
  localFilters: Record<string, string>;
}

export function useFocusRestore({
  focusedField,
  localFilters,
}: UseFocusRestoreProps) {
  useEffect(() => {
    if (focusedField) {
      const timer = setTimeout(() => {
        const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
        if (input) {
          const val = localFilters[focusedField] || '';
          if (input.value === val && document.activeElement !== input) {
            input.focus();
            input.setSelectionRange(val.length, val.length);
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [focusedField, localFilters]);
}
