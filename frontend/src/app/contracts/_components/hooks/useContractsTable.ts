import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageResponse, SortField, SortDirection, Contract } from '../types/contracts.types';
import { PAGE_SIZE } from '../constants/contracts.constants';
import { useContractsFilters } from './useContractsFilters';
import { useContractsData } from './useContractsData';
import { useClickOutside } from './useClickOutside';

export const useContractsTable = () => {
  const [data, setData] = useState<PageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [allYears, setAllYears] = useState<number[]>([]);

  // Состояние для сортировки
  const [sortField, setSortField] = useState<SortField>('innerId');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Используем хуки
  const filtersHook = useContractsFilters(setCurrentPage);
  const dataHook = useContractsData();

  // Закрытие выпадающего списка ЦФО при клике вне него
  useClickOutside({
    isOpen: filtersHook.isCfoFilterOpen,
    ref: filtersHook.cfoFilterButtonRef,
    onClose: () => filtersHook.setIsCfoFilterOpen(false),
  });

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(0);
  }, [sortField, sortDirection]);

  // Загружаем список уникальных годов из базы данных
  useEffect(() => {
    const loadYears = async () => {
      const years = await dataHook.fetchYears();
      setAllYears(years);
    };
    loadYears();
  }, [dataHook.fetchYears]);

  const handleResetFilters = useCallback(() => {
    filtersHook.setFilters({
      innerId: '',
      cfo: '',
      name: '',
      documentForm: '',
      costType: '',
      contractType: '',
    });
    filtersHook.setLocalFilters({
      innerId: '',
      cfo: '',
      name: '',
      documentForm: '',
      costType: '',
      contractType: '',
    });
    filtersHook.setCfoFilter(new Set());
    setSelectedYear(currentYear);
    setCurrentPage(0);
  }, [filtersHook, currentYear]);

  // Стабилизируем cfoFilter и filters через JSON.stringify
  const cfoFilterStr = useMemo(() => JSON.stringify(Array.from(filtersHook.cfoFilter)), [filtersHook.cfoFilter]);
  const filtersStr = useMemo(() => JSON.stringify(filtersHook.filters), [filtersHook.filters]);

  // Загружаем данные при изменении фильтров, сортировки, года
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await dataHook.fetchData(
          currentPage,
          pageSize,
          selectedYear,
          sortField,
          sortDirection,
          filtersHook.filters,
          filtersHook.cfoFilter
        );
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [
    currentPage,
    pageSize,
    selectedYear,
    sortField,
    sortDirection,
    filtersStr,
    cfoFilterStr,
    dataHook.fetchData,
  ]);

  return {
    data,
    loading,
    error,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    selectedYear,
    setSelectedYear,
    currentYear,
    allYears,
    sortField,
    sortDirection,
    handleSort,
    handleResetFilters,
    filters: filtersHook,
  };
};
