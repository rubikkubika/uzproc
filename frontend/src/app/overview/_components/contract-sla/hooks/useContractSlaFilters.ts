'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  CONTRACT_SLA_ORGANIZATIONS,
  DEFAULT_CONTRACT_SLA_ORGANIZATIONS,
} from '../constants/contract-sla.constants';

const YEAR_STORAGE_KEY = 'overview_contractSlaYear';
const PREPARER_STORAGE_KEY = 'overview_contractSlaPreparer';
const EXCLUDE_1P_STORAGE_KEY = 'overview_contractSlaExclude1p';
const MONTH_STORAGE_KEY = 'overview_contractSlaMonth';
const ORGANIZATIONS_STORAGE_KEY = 'overview_contractSlaOrganizations';

/**
 * Фильтры дашборда «SLA договоров»: год подписания, организация заказчика,
 * договорной специалист и переключатель «без 1P».
 * Значения сохраняются в sessionStorage, как на вкладке SLA закупок.
 */
export function useContractSlaFilters() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const [year, setYearState] = useState<number>(() => {
    if (typeof window === 'undefined') return currentYear;
    const saved = sessionStorage.getItem(YEAR_STORAGE_KEY);
    return saved ? Number(saved) : currentYear;
  });

  const [preparedBy, setPreparedByState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return sessionStorage.getItem(PREPARER_STORAGE_KEY) || null;
  });

  // «без 1P»: по умолчанию включён — документы ЦФО «M - Commerce 1Р» исключены (как в таблице договоров)
  const [exclude1p, setExclude1pState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const saved = sessionStorage.getItem(EXCLUDE_1P_STORAGE_KEY);
    return saved == null ? true : saved === 'true';
  });

  // Организация заказчика: по умолчанию выбран только «Uzum Market»; пустой выбор — без фильтра
  const [organizations, setOrganizationsState] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set(DEFAULT_CONTRACT_SLA_ORGANIZATIONS);
    const saved = sessionStorage.getItem(ORGANIZATIONS_STORAGE_KEY);
    if (saved == null) return new Set(DEFAULT_CONTRACT_SLA_ORGANIZATIONS);
    try {
      const parsed = JSON.parse(saved) as string[];
      return new Set(Array.isArray(parsed) ? parsed : DEFAULT_CONTRACT_SLA_ORGANIZATIONS);
    } catch {
      return new Set(DEFAULT_CONTRACT_SLA_ORGANIZATIONS);
    }
  });

  // Месяц, выбранный кликом по диаграмме; null — месяц по умолчанию (текущий, для прошлых лет декабрь)
  const [selectedMonth, setSelectedMonthState] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = sessionStorage.getItem(MONTH_STORAGE_KEY);
    return saved ? Number(saved) : null;
  });

  const setSelectedMonth = useCallback((value: number | null) => {
    setSelectedMonthState(value);
    if (typeof window === 'undefined') return;
    if (value != null) sessionStorage.setItem(MONTH_STORAGE_KEY, String(value));
    else sessionStorage.removeItem(MONTH_STORAGE_KEY);
  }, []);

  const setYear = useCallback((value: number) => {
    setYearState(value);
    if (typeof window !== 'undefined') sessionStorage.setItem(YEAR_STORAGE_KEY, String(value));
  }, []);

  const setPreparedBy = useCallback((value: string | null) => {
    setPreparedByState(value);
    if (typeof window === 'undefined') return;
    if (value) sessionStorage.setItem(PREPARER_STORAGE_KEY, value);
    else sessionStorage.removeItem(PREPARER_STORAGE_KEY);
  }, []);

  const setExclude1p = useCallback((value: boolean) => {
    setExclude1pState(value);
    if (typeof window !== 'undefined') sessionStorage.setItem(EXCLUDE_1P_STORAGE_KEY, String(value));
  }, []);

  const setOrganizations = useCallback((value: Set<string>) => {
    setOrganizationsState(value);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(ORGANIZATIONS_STORAGE_KEY, JSON.stringify(Array.from(value)));
    }
  }, []);

  /** Клик по организации в выпадающем списке: снимает или добавляет её в выбор. */
  const toggleOrganization = useCallback(
    (value: string) => {
      const next = new Set(organizations);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      setOrganizations(next);
    },
    [organizations, setOrganizations]
  );

  const selectAllOrganizations = useCallback(() => {
    setOrganizations(new Set(CONTRACT_SLA_ORGANIZATIONS.map((o) => o.value)));
  }, [setOrganizations]);

  const deselectAllOrganizations = useCallback(() => {
    setOrganizations(new Set());
  }, [setOrganizations]);

  /** Клик по строке специалиста: повторный клик по выбранному снимает фильтр. */
  const togglePreparedBy = useCallback(
    (value: string) => {
      setPreparedBy(value === (preparedBy ?? '') ? null : value || null);
    },
    [preparedBy, setPreparedBy]
  );

  /** Клик по столбцу месяца на диаграмме: повторный клик по выбранному месяцу снимает выбор. */
  const toggleMonth = useCallback(
    (value: number) => {
      setSelectedMonth(value === selectedMonth ? null : value);
    },
    [selectedMonth, setSelectedMonth]
  );

  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let i = currentYear - 2; i <= currentYear + 5; i++) years.push(i);
    return years;
  }, [currentYear]);

  /**
   * Сброс: фильтр по специалисту и выбранный месяц снимаются,
   * «без 1P» возвращается в состояние по умолчанию — включён,
   * организация — только «Uzum Market».
   */
  const resetFilters = useCallback(() => {
    setPreparedBy(null);
    setExclude1p(true);
    setSelectedMonth(null);
    setOrganizations(new Set(DEFAULT_CONTRACT_SLA_ORGANIZATIONS));
  }, [setPreparedBy, setExclude1p, setSelectedMonth, setOrganizations]);

  return {
    year,
    setYear,
    availableYears,
    preparedBy,
    setPreparedBy,
    togglePreparedBy,
    exclude1p,
    setExclude1p,
    organizations,
    setOrganizations,
    toggleOrganization,
    selectAllOrganizations,
    deselectAllOrganizations,
    selectedMonth,
    setSelectedMonth,
    toggleMonth,
    resetFilters,
  };
}
