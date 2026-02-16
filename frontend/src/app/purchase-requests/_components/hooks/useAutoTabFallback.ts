import { useEffect } from 'react';
import type { TabType } from '../types/purchase-request.types';

const FALLBACK_DELAY_MS = 600;

interface UseAutoTabFallbackProps {
  tabCounts: Record<TabType, number | null>;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  setStatusFilter: (filter: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setCurrentPage: (page: number) => void;
  setAllItems: (items: any[] | ((prev: any[]) => any[])) => void;
  /** При смене закупщика tabCounts обновляются асинхронно; задержка даёт время подгрузить новые счётчики, чтобы не переключать с «В работе» по старым данным */
  purchaserFilter: Set<string>;
}

export function useAutoTabFallback({
  tabCounts,
  activeTab,
  setActiveTab,
  setStatusFilter,
  setCurrentPage,
  setAllItems,
  purchaserFilter,
}: UseAutoTabFallbackProps) {
  const purchaserFilterStr = Array.from(purchaserFilter).sort().join(',');

  useEffect(() => {
    const allCountsLoaded = Object.values(tabCounts).every(count => count !== null);
    if (!allCountsLoaded || tabCounts[activeTab] !== 0) return;

    const tabsOrder: TabType[] = ['in-work', 'completed', 'all', 'project-rejected', 'hidden'];
    const tabWithRecords = tabsOrder.find(tab => tabCounts[tab] !== null && tabCounts[tab]! > 0);
    if (!tabWithRecords) return;

    // Задержка перед переключением: при смене закупщика tabCounts ещё от старого фильтра;
    // даём время подгрузить счётчики для нового закупщика, чтобы «В работе» не сбрасывалась ошибочно
    const t = setTimeout(() => {
      setActiveTab(tabWithRecords);
      setStatusFilter(new Set());
      setCurrentPage(0);
      setAllItems([]);
    }, FALLBACK_DELAY_MS);

    return () => clearTimeout(t);
  }, [tabCounts, activeTab, purchaserFilterStr, setActiveTab, setStatusFilter, setCurrentPage, setAllItems]);
}
