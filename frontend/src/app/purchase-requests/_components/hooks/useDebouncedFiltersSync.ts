import { useEffect } from 'react';

interface UseDebouncedFiltersSyncProps {
  localFilters: Record<string, string>;
  filtersFromHook: Record<string, string>;
  focusedField: string | null;
  setFilters: (filters: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void;
  setCurrentPage: (page: number) => void;
}

export function useDebouncedFiltersSync({
  localFilters,
  filtersFromHook,
  focusedField,
  setFilters,
  setCurrentPage,
}: UseDebouncedFiltersSyncProps) {
  useEffect(() => {
    const textFields = [
      'idPurchaseRequest', 
      'name', 
      'contractDurationMonths',
      'guid',
      'purchaseRequestPlanYear',
      'company',
      'mcc',
      'purchaseRequestInitiator',
      'purchaseRequestCreationDate',
      'createdAt',
      'updatedAt',
      'title',
      'innerId',
      'budgetAmount'
    ];
    const hasTextChanges = textFields.some(f => localFilters[f] !== filtersFromHook[f]);
    if (hasTextChanges) {
      const input = focusedField ? document.querySelector(`input[data-filter-field="${focusedField}"]`) as HTMLInputElement : null;
      const cursorPosition = input ? input.selectionStart || 0 : null;

      const timer = setTimeout(() => {
        setFilters(prev => { 
          const updated = {...prev}; 
          textFields.forEach(f => updated[f] = localFilters[f] || ''); 
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
