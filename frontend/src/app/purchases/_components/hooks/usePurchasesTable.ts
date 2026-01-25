import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getBackendUrl } from '@/utils/api';
import { PageResponse, SortField, SortDirection } from '../types/purchases.types';
import { PAGE_SIZE } from '../constants/purchases.constants';
import { usePurchasesFilters } from './usePurchasesFilters';
import { usePurchasesColumns } from './usePurchasesColumns';
import { usePurchasesData } from './usePurchasesData';

export const usePurchasesTable = () => {
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>('purchaseRequestId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Используем все хуки
  const filtersHook = usePurchasesFilters(setCurrentPage);
  const columnsHook = usePurchasesColumns();
  const dataHook = usePurchasesData();

  // Ref для хранения актуальных значений фильтров (чтобы избежать пересоздания fetchData)
  const filtersRef = useRef(filtersHook);
  filtersRef.current = filtersHook;

  // Функция для загрузки данных
  const fetchData = useCallback(async (
    page: number,
    size: number,
    year: number | null = null,
    sortFieldParam: SortField = null,
    sortDirectionParam: SortDirection = null,
    textFilters: Record<string, string> = {}
  ) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('size', String(size));

      if (year !== null) {
        params.append('year', String(year));
      }

      if (sortFieldParam && sortDirectionParam) {
        params.append('sortBy', sortFieldParam);
        params.append('sortDir', sortDirectionParam);
      }

      // Фильтр по внутреннему ID
      if (textFilters.innerId && textFilters.innerId.trim() !== '') {
        params.append('innerId', textFilters.innerId.trim());
      }

      // Фильтр по бюджету (обрабатываем отдельно)
      // Используем оператор и значение из localFilters, если они есть, иначе из filters
      const currentFilters = filtersRef.current;
      const budgetOperator = currentFilters.localFilters.budgetAmountOperator || textFilters.budgetAmountOperator;
      const budgetAmount = currentFilters.localFilters.budgetAmount || textFilters.budgetAmount;
      if (budgetOperator && budgetOperator.trim() !== '' && budgetAmount && budgetAmount.trim() !== '') {
        const budgetValue = parseFloat(budgetAmount.replace(/\s/g, '').replace(/,/g, ''));
        if (!isNaN(budgetValue) && budgetValue >= 0) {
          params.append('budgetAmountOperator', budgetOperator.trim());
          params.append('budgetAmount', String(budgetValue));
        }
      }

      // Фильтр по ЦФО - передаем все выбранные значения на бэкенд
      if (currentFilters.cfoFilter.size > 0) {
        currentFilters.cfoFilter.forEach(cfo => {
          params.append('cfo', cfo);
        });
      }

      // Фильтр по закупщику - множественный выбор (как ЦФО)
      if (currentFilters.purchaserFilter.size > 0) {
        currentFilters.purchaserFilter.forEach(p => {
          params.append('purchaser', p);
        });
      }

      // Фильтр по статусу - передаем все выбранные значения на бэкенд
      // Если фильтр пустой, не передаем параметр status, чтобы показать все закупки (включая без статуса)
      if (currentFilters.statusFilter.size > 0) {
        currentFilters.statusFilter.forEach(status => {
          params.append('status', status);
        });
      }

      // Фильтр по номеру заявки
      // Если пусто - не передаем параметр (по умолчанию на бэкенде исключаются закупки без заявки)
      // Если указано число - передаем это число
      // Если указано "null" или "-" - передаем -1 (специальное значение для показа закупок без заявки)
      if (textFilters.purchaseRequestId && textFilters.purchaseRequestId.trim() !== '') {
        const requestIdValue = textFilters.purchaseRequestId.trim();
        if (requestIdValue.toLowerCase() === 'null' || requestIdValue === '-') {
          // Специальное значение для показа закупок без заявки
          params.append('purchaseRequestId', '-1');
        } else {
          const requestIdNumber = parseInt(requestIdValue, 10);
          if (!isNaN(requestIdNumber) && requestIdNumber > 0) {
            params.append('purchaseRequestId', String(requestIdNumber));
          }
        }
      }

      // Фильтр по способу закупки
      if (textFilters.purchaseMethod && textFilters.purchaseMethod.trim() !== '') {
        params.append('mcc', textFilters.purchaseMethod.trim());
      }

      const url = `${getBackendUrl()}/api/purchases?${params.toString()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Ошибка загрузки данных');
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  // Синхронизация localFilters.budgetAmount с filters после загрузки данных
  // НО только если поле не в фокусе, чтобы сохранить форматирование
  useEffect(() => {
    if (!loading && data && filtersHook.focusedField !== 'budgetAmount') {
      // Синхронизируем значение бюджета из filters в localFilters после загрузки данных
      // Это нужно для сохранения значения после поиска
      filtersHook.setLocalFilters(prev => {
        // Если в filters есть значение бюджета, и оно отличается от localFilters, обновляем
        if (filtersHook.filters.budgetAmount !== undefined && filtersHook.filters.budgetAmount !== prev.budgetAmount) {
          return { ...prev, budgetAmount: filtersHook.filters.budgetAmount };
        }
        return prev;
      });
    }
  }, [loading, data, filtersHook.focusedField, filtersHook.filters.budgetAmount]);

  // Восстановление фокуса после обновления localFilters
  useEffect(() => {
    if (filtersHook.focusedField) {
      const input = document.querySelector(`input[data-filter-field="${filtersHook.focusedField}"]`) as HTMLInputElement;
      if (input) {
        // Сохраняем позицию курсора (только для текстовых полей)
        const cursorPosition = input.type === 'number' ? null : (input.selectionStart || 0);
        const currentValue = input.value;

        // Восстанавливаем фокус в следующем тике, чтобы не мешать текущему вводу
        requestAnimationFrame(() => {
          const inputAfterRender = document.querySelector(`input[data-filter-field="${filtersHook.focusedField}"]`) as HTMLInputElement;
          if (inputAfterRender) {
            // Для фильтра бюджета проверяем, что неотформатированное значение совпадает
            if (filtersHook.focusedField === 'budgetAmount') {
              const currentRawValue = currentValue.replace(/\s/g, '').replace(/,/g, '');
              const afterRenderRawValue = inputAfterRender.value.replace(/\s/g, '').replace(/,/g, '');
              if (currentRawValue === afterRenderRawValue) {
                inputAfterRender.focus();
                // Для бюджета устанавливаем курсор в конец
                const length = inputAfterRender.value.length;
                inputAfterRender.setSelectionRange(length, length);
              }
            } else if (inputAfterRender.value === currentValue) {
              inputAfterRender.focus();
              // Восстанавливаем позицию курсора только для текстовых полей
              if (inputAfterRender.type !== 'number' && cursorPosition !== null) {
                const newPosition = Math.min(cursorPosition, inputAfterRender.value.length);
                inputAfterRender.setSelectionRange(newPosition, newPosition);
              }
            }
          }
        });
      }
    }
  }, [filtersHook.localFilters, filtersHook.focusedField]);

  // Восстановление фокуса после завершения загрузки данных с сервера
  useEffect(() => {
    if (filtersHook.focusedField && !loading && data) {
      const focusedFieldValue = filtersHook.focusedField; // Сохраняем значение для TypeScript
      // Небольшая задержка, чтобы дать React время отрендерить обновленные данные
      const timer = setTimeout(() => {
        const input = document.querySelector(`input[data-filter-field="${focusedFieldValue}"]`) as HTMLInputElement;
        if (input) {
          const currentValue = filtersHook.localFilters[focusedFieldValue] || '';
          // Для фильтра бюджета проверяем неотформатированное значение
          if (focusedFieldValue === 'budgetAmount') {
            const inputRawValue = input.value.replace(/\s/g, '').replace(/,/g, '');
            if (inputRawValue === currentValue) {
              input.focus();
              // Устанавливаем курсор в конец текста
              const length = input.value.length;
              input.setSelectionRange(length, length);
            }
          } else if (input.value === currentValue) {
            input.focus();
            // Устанавливаем курсор в конец текста
            const length = input.value.length;
            input.setSelectionRange(length, length);
          }
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [data, loading, filtersHook.focusedField, filtersHook.localFilters]);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(0);
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(0);
  }, [sortField, sortDirection]);

  // Закрываем выпадающие списки при клике вне их
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (filtersHook.isCfoFilterOpen && !target.closest('.cfo-filter-container')) {
        filtersHook.setIsCfoFilterOpen(false);
      }
      if (filtersHook.isStatusFilterOpen && !target.closest('.status-filter-container')) {
        filtersHook.setIsStatusFilterOpen(false);
      }
      if (filtersHook.isPurchaserFilterOpen && !target.closest('.purchaser-filter-container')) {
        filtersHook.setIsPurchaserFilterOpen(false);
      }
    };

    if (filtersHook.isCfoFilterOpen || filtersHook.isStatusFilterOpen || filtersHook.isPurchaserFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [filtersHook.isCfoFilterOpen, filtersHook.isStatusFilterOpen, filtersHook.isPurchaserFilterOpen]);

  // Стабилизируем строковые представления фильтров через useMemo, чтобы избежать лишних обновлений
  const cfoFilterStr = useMemo(() => Array.from(filtersHook.cfoFilter).sort().join(','), [filtersHook.cfoFilter]);
  const statusFilterStr = useMemo(() => Array.from(filtersHook.statusFilter).sort().join(','), [filtersHook.statusFilter]);
  const purchaserFilterStr = useMemo(() => Array.from(filtersHook.purchaserFilter).sort().join(','), [filtersHook.purchaserFilter]);

  // Загружаем данные при изменении фильтров, сортировки, года
  useEffect(() => {
    fetchData(currentPage, pageSize, selectedYear, sortField, sortDirection, filtersHook.filters);
  }, [
    currentPage,
    pageSize,
    selectedYear,
    sortField,
    sortDirection,
    filtersHook.filters,
    filtersHook.cfoFilter.size,
    cfoFilterStr,
    filtersHook.statusFilter.size,
    statusFilterStr,
    filtersHook.purchaserFilter.size,
    purchaserFilterStr,
    fetchData,
  ]);

  // Обновляем uniqueValues в filtersHook при загрузке данных
  useEffect(() => {
    filtersHook.setUniqueValues(dataHook.uniqueValues);
  }, [dataHook.uniqueValues]);

  return {
    // Данные
    data,
    setData,
    loading,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    handlePageSizeChange,
    selectedYear,
    setSelectedYear,
    sortField,
    sortDirection,
    handleSort,
    fetchData,
    // Хуки
    filters: filtersHook,
    columns: columnsHook,
    metadata: dataHook,
  };
};
