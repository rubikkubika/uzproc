import { useEffect } from 'react';

interface UseFocusRestoreProps {
  focusedField: string | null;
  localFilters: Record<string, string>;
}

export function useFocusRestore({
  focusedField,
  localFilters,
}: UseFocusRestoreProps) {
  // Восстановление фокуса после обновления данных (но НЕ при каждом вводе)
  // Этот хук срабатывает только после загрузки данных с сервера
  useEffect(() => {
    if (focusedField) {
      const timer = setTimeout(() => {
        const input = document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement;
        if (input) {
          const val = localFilters[focusedField] || '';
          if (input.value === val && document.activeElement !== input) {
            // Восстанавливаем фокус только если он был потерян
            input.focus();
            input.setSelectionRange(val.length, val.length);
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [focusedField, localFilters]);
}
