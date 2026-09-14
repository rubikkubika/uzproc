'use client';

import { useCallback, useState } from 'react';
import { EK_DEFAULT_SORT } from '../constants/ek.constants';
import type { EkSortKey, EkSortState } from '../types/ek.types';

/**
 * Сортировка таблицы ЕК: клик по активной колонке инвертирует направление,
 * по новой — числа по убыванию, ЦФО по возрастанию.
 */
export function useEkSort() {
  const [sort, setSort] = useState<EkSortState>(EK_DEFAULT_SORT);

  const toggleSort = useCallback((key: EkSortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, dir: current.dir === 1 ? -1 : 1 }
        : { key, dir: key === 'cfo' ? 1 : -1 }
    );
  }, []);

  return { sort, toggleSort };
}
