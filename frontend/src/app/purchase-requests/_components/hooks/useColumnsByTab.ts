import { useEffect } from 'react';
import type { TabType } from '../types/purchase-request.types';

interface UseColumnsByTabProps {
  activeTab: TabType;
  setVisibleColumns: (columns: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

export function useColumnsByTab({
  activeTab,
  setVisibleColumns,
}: UseColumnsByTabProps) {
  useEffect(() => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (activeTab === 'completed') {
        // Для вкладки "Завершенные" добавляем колонку "rating" и убираем "track" и "daysSinceCreation"
        newSet.add('rating');
        newSet.delete('track');
        newSet.delete('daysSinceCreation');
      } else {
        // Для других вкладок убираем колонку "rating"
        newSet.delete('rating');
      }
      return newSet;
    });
  }, [activeTab, setVisibleColumns]);
}
