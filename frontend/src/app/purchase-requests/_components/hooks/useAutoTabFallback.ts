import { useEffect } from 'react';
import type { TabType } from '../types/purchase-request.types';

interface UseAutoTabFallbackProps {
  tabCounts: Record<TabType, number | null>;
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  setStatusFilter: (filter: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setPurchaserFilter: (filter: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setCfoFilter: (filter: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setCurrentPage: (page: number) => void;
  setAllItems: (items: any[] | ((prev: any[]) => any[])) => void;
}

export function useAutoTabFallback({
  tabCounts,
  activeTab,
  setActiveTab,
  setStatusFilter,
  setPurchaserFilter,
  setCfoFilter,
  setCurrentPage,
  setAllItems,
}: UseAutoTabFallbackProps) {
  useEffect(() => {
    // Проверяем, что количество записей загружено для всех вкладок
    const allCountsLoaded = Object.values(tabCounts).every(count => count !== null);
    
    if (allCountsLoaded) {
      // Если активная вкладка имеет 0 записей, переключаемся на первую вкладку с записями
      if (tabCounts[activeTab] === 0) {
        // Приоритет переключения: in-work -> completed -> all -> project-rejected -> hidden
        const tabsOrder: TabType[] = ['in-work', 'completed', 'all', 'project-rejected', 'hidden'];
        const tabWithRecords = tabsOrder.find(tab => tabCounts[tab] !== null && tabCounts[tab]! > 0);
        
        if (tabWithRecords) {
          setActiveTab(tabWithRecords);
          setStatusFilter(new Set());
          setPurchaserFilter(new Set());
          setCfoFilter(new Set());
          setCurrentPage(0);
          setAllItems([]);
        }
      }
    }
  }, [tabCounts, activeTab, setActiveTab, setStatusFilter, setPurchaserFilter, setCfoFilter, setCurrentPage, setAllItems]);
}
