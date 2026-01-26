import { useState, useRef, useCallback, useEffect } from 'react';
import { getBackendUrl } from '@/utils/api';
import { Contract } from '../types/contracts.types';
import { useDebouncedFiltersSync } from './useDebouncedFiltersSync';
import { useFocusRestore } from './useFocusRestore';

export const useContractsFilters = (setCurrentPage: (page: number) => void) => {
  // ДВА состояния: localFilters (UI) и filters (данные)
  const [localFilters, setLocalFilters] = useState<Record<string, string>>({
    innerId: '',
    cfo: '',
    name: '',
    documentForm: '',
    costType: '',
    contractType: '',
  });

  const [filters, setFilters] = useState<Record<string, string>>({
    innerId: '',
    cfo: '',
    name: '',
    documentForm: '',
    costType: '',
    contractType: '',
  });

  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Множественные фильтры (чекбоксы)
  const [cfoFilter, setCfoFilter] = useState<Set<string>>(new Set());

  // Состояние для открытия/закрытия выпадающих списков
  const [isCfoFilterOpen, setIsCfoFilterOpen] = useState(false);

  // Поиск внутри фильтров
  const [cfoSearchQuery, setCfoSearchQuery] = useState('');

  // Позиции для выпадающих списков
  const [cfoFilterPosition, setCfoFilterPosition] = useState<{ top: number; left: number } | null>(null);

  const cfoFilterButtonRef = useRef<HTMLButtonElement>(null);

  // Получение уникальных значений ЦФО
  const [cfoOptions, setCfoOptions] = useState<string[]>([]);

  const fetchCfoOptions = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.append('page', '0');
      params.append('size', '10000');

      const fetchUrl = `${getBackendUrl()}/api/contracts?${params.toString()}`;
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Ошибка загрузки данных: ${response.status} ${response.statusText}`);
      }
      const result = await response.json();

      const uniqueCfo = new Set<string>();
      if (result.content) {
        result.content.forEach((contract: Contract) => {
          if (contract.cfo && contract.cfo.trim() !== '') {
            uniqueCfo.add(contract.cfo.trim());
          }
        });
      }
      setCfoOptions(Array.from(uniqueCfo).sort());
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

  // Функция для расчета позиции выпадающего списка
  const calculateFilterPosition = useCallback((buttonRef: React.RefObject<HTMLButtonElement | null>) => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      return {
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      };
    }
    return null;
  }, []);

  // Обновляем позицию при открытии фильтра ЦФО
  useEffect(() => {
    if (isCfoFilterOpen && cfoFilterButtonRef.current) {
      const position = calculateFilterPosition(cfoFilterButtonRef);
      setCfoFilterPosition(position);
    }
  }, [isCfoFilterOpen, calculateFilterPosition]);

  const handleCfoToggle = (cfo: string) => {
    setCfoFilter(prev => {
      const newSet = new Set(prev);
      if (newSet.has(cfo)) {
        newSet.delete(cfo);
      } else {
        newSet.add(cfo);
      }
      return newSet;
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

  // Debounce хук
  useDebouncedFiltersSync({
    localFilters,
    filtersFromHook: filters,
    focusedField,
    setFilters,
    setCurrentPage,
  });

  // Восстановление фокуса
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
    cfoOptions,
    getFilteredCfoOptions,
    handleCfoToggle,
    handleCfoSelectAll,
    handleCfoDeselectAll,
  };
};
