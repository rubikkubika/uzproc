'use client';

import { useState } from 'react';
import { OverviewTab, OverviewTopTab } from '../types/overview.types';

const OVERVIEW_TAB_KEY = 'overviewActiveTab';
const OVERVIEW_TOP_TAB_KEY = 'overviewTopTab';
const DEFAULT_TAB: OverviewTab = 'purchase-plan';
const DEFAULT_TOP_TAB: OverviewTopTab = 'dashboards';

const VALID_TABS: OverviewTab[] = ['sla', 'purchase-plan', 'csi', 'ek', 'approvals', 'timelines', 'savings'];
const VALID_TOP_TABS: OverviewTopTab[] = ['dashboards', 'management-reporting'];

function getInitialTab(): OverviewTab {
  if (typeof window === 'undefined') return DEFAULT_TAB;
  const saved = localStorage.getItem(OVERVIEW_TAB_KEY);
  if (saved && VALID_TABS.includes(saved as OverviewTab)) return saved as OverviewTab;
  return DEFAULT_TAB;
}

function getInitialTopTab(): OverviewTopTab {
  if (typeof window === 'undefined') return DEFAULT_TOP_TAB;
  const saved = localStorage.getItem(OVERVIEW_TOP_TAB_KEY);
  if (saved && VALID_TOP_TABS.includes(saved as OverviewTopTab)) return saved as OverviewTopTab;
  return DEFAULT_TOP_TAB;
}

/**
 * Хук для управления состоянием вкладок страницы обзор.
 * Начальная вкладка читается из localStorage сразу при инициализации, чтобы при открытии вкладки SLA не отправлялись запросы плана закупок.
 */
export function useOverview() {
  const [activeTopTab, setActiveTopTabState] = useState<OverviewTopTab>(getInitialTopTab);
  const [activeTab, setActiveTabState] = useState<OverviewTab>(getInitialTab);

  const setActiveTopTab = (tab: OverviewTopTab) => {
    setActiveTopTabState(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem(OVERVIEW_TOP_TAB_KEY, tab);
    }
  };

  const setActiveTab = (tab: OverviewTab) => {
    setActiveTabState(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem(OVERVIEW_TAB_KEY, tab);
    }
  };

  return {
    activeTopTab,
    setActiveTopTab,
    activeTab,
    setActiveTab,
  };
}
