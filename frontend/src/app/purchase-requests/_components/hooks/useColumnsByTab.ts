import { useEffect, useRef } from 'react';
import type { TabType, RequestKindTab } from '../types/purchase-request.types';

interface UseColumnsByTabProps {
  activeTab: TabType;
  kindTab: RequestKindTab;
  setVisibleColumns: (columns: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
}

export function useColumnsByTab({
  activeTab,
  kindTab,
  setVisibleColumns,
}: UseColumnsByTabProps) {
  // Храним предыдущую вкладку для определения перехода
  const prevTabRef = useRef<TabType | null>(null);
  const prevKindTabRef = useRef<RequestKindTab | null>(null);

  useEffect(() => {
    const prevTab = prevTabRef.current;

    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (activeTab === 'completed') {
        // Для вкладки "Завершенные" добавляем колонку "rating" и убираем "track"
        newSet.add('rating');
        newSet.delete('track');
      } else {
        // Для других вкладок (in-work, all, project-rejected, hidden)
        // Если переходим с вкладки "Завершенные" на другую, восстанавливаем колонку "track"
        if (prevTab === 'completed') {
          newSet.add('track');
        }
        // rating остается, так как теперь она в DEFAULT_VISIBLE_COLUMNS
      }
      return newSet;
    });

    // Обновляем предыдущую вкладку
    prevTabRef.current = activeTab;
  }, [activeTab, setVisibleColumns]);

  // Управление видимостью колонки "План" в зависимости от kindTab
  useEffect(() => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (kindTab === 'purchase') {
        // Для вкладки "Закупки" колонка "hasLinkedPlanItem" доступна (пользователь может включить)
        // Не добавляем автоматически, пользователь сам решает
      } else {
        // Для вкладки "Заказы" убираем колонку "hasLinkedPlanItem"
        newSet.delete('hasLinkedPlanItem');
      }
      return newSet;
    });

    prevKindTabRef.current = kindTab;
  }, [kindTab, setVisibleColumns]);
}
