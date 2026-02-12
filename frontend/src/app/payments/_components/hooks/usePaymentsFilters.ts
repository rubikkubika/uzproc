import { useState, useRef, useEffect, useCallback } from 'react';
import { getBackendUrl } from '@/utils/api';
import { useDebouncedFiltersSync } from './useDebouncedFiltersSync';
import { useFocusRestore } from './useFocusRestore';

export const usePaymentsFilters = (setCurrentPage: (page: number) => void) => {
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({
    comment: '',
  });
  const [filters, setFilters] = useState<Record<string, string>>({
    comment: '',
  });
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [cfoFilter, setCfoFilter] = useState<Set<string>>(new Set());
  const [isCfoFilterOpen, setIsCfoFilterOpen] = useState(false);
  const [cfoSearchQuery, setCfoSearchQuery] = useState('');
  const [cfoFilterPosition, setCfoFilterPosition] = useState<{ top: number; left: number } | null>(null);
  const cfoFilterButtonRef = useRef<HTMLButtonElement>(null);
  /** Контейнер кнопки и выпадающей панели — для useClickOutside, чтобы клик по панели не закрывал её */
  const cfoFilterContainerRef = useRef<HTMLDivElement>(null);
  const [cfoOptions, setCfoOptions] = useState<string[]>([]);

  const fetchCfoOptions = useCallback(async () => {
    try {
      const url = `${getBackendUrl()}/api/cfos/names?for=payments`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Ошибка загрузки ЦФО: ${response.status}`);
      const names: string[] = await response.json();
      setCfoOptions(Array.isArray(names) ? names : []);
    } catch (err) {
      console.error('Error fetching CFO options:', err);
    }
  }, []);

  useEffect(() => {
    fetchCfoOptions();
  }, [fetchCfoOptions]);

  const getFilteredCfoOptions = cfoOptions.filter(cfo =>
    cfo.toLowerCase().includes(cfoSearchQuery.toLowerCase())
  );

  const calculateFilterPosition = useCallback((buttonRef: React.RefObject<HTMLButtonElement | null>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      return { top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX };
    }
    return null;
  }, []);

  useEffect(() => {
    if (isCfoFilterOpen && cfoFilterButtonRef.current) {
      setCfoFilterPosition(calculateFilterPosition(cfoFilterButtonRef));
    }
  }, [isCfoFilterOpen, calculateFilterPosition]);

  const handleCfoToggle = (cfo: string) => {
    setCfoFilter(prev => {
      const next = new Set(prev);
      if (next.has(cfo)) next.delete(cfo);
      else next.add(cfo);
      return next;
    });
    setCurrentPage(0);
  };

  const handleCfoSelectAll = () => {
    setCfoFilter(new Set(cfoOptions));
    setCurrentPage(0);
  };

  const handleCfoDeselectAll = () => {
    setCfoFilter(new Set());
    setCurrentPage(0);
  };

  useDebouncedFiltersSync({
    localFilters,
    filtersFromHook: filters,
    focusedField,
    setFilters,
    setCurrentPage,
  });

  useFocusRestore({ focusedField, localFilters });

  return {
    localFilters,
    setLocalFilters,
    filters,
    setFilters,
    focusedField,
    setFocusedField,
    cfoFilter,
    setCfoFilter,
    isCfoFilterOpen,
    setIsCfoFilterOpen,
    cfoSearchQuery,
    setCfoSearchQuery,
    cfoFilterPosition,
    cfoFilterButtonRef,
    cfoFilterContainerRef,
    cfoOptions,
    getFilteredCfoOptions,
    handleCfoToggle,
    handleCfoSelectAll,
    handleCfoDeselectAll,
  };
};
