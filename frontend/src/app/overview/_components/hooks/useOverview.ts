'use client';

import { useState } from 'react';
import { OverviewTab } from '../types/overview.types';

const OVERVIEW_TAB_KEY = 'overviewActiveTab';
const DEFAULT_TAB: OverviewTab = 'purchase-plan';

function getInitialTab(): OverviewTab {
  if (typeof window === 'undefined') return DEFAULT_TAB;
  const saved = localStorage.getItem(OVERVIEW_TAB_KEY);
  if (saved === 'sla' || saved === 'purchase-plan' || saved === 'csi') return saved;
  return DEFAULT_TAB;
}

/**
 * Хук для управления состоянием вкладок страницы обзор.
 * Начальная вкладка читается из localStorage сразу при инициализации, чтобы при открытии вкладки SLA не отправлялись запросы плана закупок.
 */
export function useOverview() {
  const [activeTab, setActiveTabState] = useState<OverviewTab>(getInitialTab);

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
