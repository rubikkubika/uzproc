import { useCallback } from 'react';
import { DEFAULT_STATUSES, EXCLUDED_STATUS, IN_PLAN_STATUS } from '../constants/purchase-plan-items.constants';

interface UsePurchasePlanStatusPresetsProps {
  statusFilter: Set<string>;
  setStatusFilter: (statuses: Set<string>) => void;
  setCurrentPage: (page: number) => void;
}

/**
 * Быстрые фильтры по статусу над таблицей: «Только в Плане» и «Скрытые»
 * (позиции, исключённые из планирования, — по умолчанию фильтр статуса их скрывает).
 */
export function usePurchasePlanStatusPresets({
  statusFilter,
  setStatusFilter,
  setCurrentPage,
}: UsePurchasePlanStatusPresetsProps) {
  const isShowingExcluded = statusFilter.size === 1 && statusFilter.has(EXCLUDED_STATUS);

  // Установить фильтр «только статус В плане»
  const handleOnlyInPlan = useCallback(() => {
    setStatusFilter(new Set([IN_PLAN_STATUS]));
    setCurrentPage(0);
  }, [setStatusFilter, setCurrentPage]);

  // «Скрытые»: только исключённые позиции; повторное нажатие возвращает статусы по умолчанию
  const handleToggleExcluded = useCallback(() => {
    setStatusFilter(new Set(isShowingExcluded ? DEFAULT_STATUSES : [EXCLUDED_STATUS]));
    setCurrentPage(0);
  }, [isShowingExcluded, setStatusFilter, setCurrentPage]);

  return {
    isShowingExcluded,
    handleOnlyInPlan,
    handleToggleExcluded,
  };
}
