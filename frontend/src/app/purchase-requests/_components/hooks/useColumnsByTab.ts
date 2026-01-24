import { useEffect, useRef } from 'react';
import type { TabType } from '../types/purchase-request.types';

interface UseColumnsByTabProps {
  activeTab: TabType;
  setVisibleColumns: (columns: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

export function useColumnsByTab({
  activeTab,
  setVisibleColumns,
}: UseColumnsByTabProps) {
  // Храним предыдущую вкладку для определения перехода
  const prevTabRef = useRef<TabType | null>(null);

  useEffect(() => {
    const prevTab = prevTabRef.current;
    
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (activeTab === 'completed') {
        // Для вкладки "Завершенные" добавляем колонку "rating" и убираем "track" и "daysSinceCreation"
        newSet.add('rating');
        newSet.delete('track');
        newSet.delete('daysSinceCreation');
      } else if (activeTab === 'in-work') {
        // Для вкладки "В работе" добавляем колонку "rating"
        newSet.add('rating');
      } else {
        // Для других вкладок убираем колонку "rating"
        newSet.delete('rating');
        
        // Если переходим с вкладки "Завершенные" на другую, восстанавливаем колонки "track" и "daysSinceCreation"
        if (prevTab === 'completed') {
          newSet.add('track');
          newSet.add('daysSinceCreation');
        }
      }
      return newSet;
    });
    
    // Обновляем предыдущую вкладку
    prevTabRef.current = activeTab;
  }, [activeTab, setVisibleColumns]);
}
