'use client';

import { useState, useEffect } from 'react';
import { OverviewTab } from '../types/overview.types';

const OVERVIEW_TAB_KEY = 'overviewActiveTab';
const DEFAULT_TAB: OverviewTab = 'purchase-plan';

/**
 * Хук для управления состоянием вкладок страницы обзор
 */
export function useOverview() {
  const [activeTab, setActiveTabState] = useState<OverviewTab>(DEFAULT_TAB);

  // Загружаем сохраненную вкладку из localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem(OVERVIEW_TAB_KEY);
      if (savedTab) {
        setActiveTabState(savedTab);
      }
    }
  }, []);

  // Сохраняем выбранную вкладку в localStorage
  const setActiveTab = (tab: OverviewTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem(OVERVIEW_TAB_KEY, tab);
    }
  };

  return {
    activeTab,
    setActiveTab,
  };
}
