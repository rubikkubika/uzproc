'use client';

import { useState } from 'react';
import { OverviewTab, OverviewTopTab, OverviewDashboardCategory, DASHBOARD_CATEGORY_TABS } from '../types/overview.types';

const OVERVIEW_TAB_KEY = 'overviewActiveTab';
const OVERVIEW_TOP_TAB_KEY = 'overviewTopTab';
const OVERVIEW_DASHBOARD_CATEGORY_KEY = 'overviewDashboardCategory';
const DEFAULT_TAB: OverviewTab = 'purchase-plan';
const DEFAULT_TOP_TAB: OverviewTopTab = 'dashboards';
const DEFAULT_CATEGORY: OverviewDashboardCategory = 'purchases';

const VALID_TABS: OverviewTab[] = ['sla', 'purchase-plan', 'csi', 'ek', 'approvals', 'timelines', 'savings', 'contract-remarks'];
const VALID_TOP_TABS: OverviewTopTab[] = ['dashboards', 'management-reporting'];
const VALID_CATEGORIES: OverviewDashboardCategory[] = ['purchases', 'contracts', 'other'];

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

function getInitialCategory(): OverviewDashboardCategory {
  if (typeof window === 'undefined') return DEFAULT_CATEGORY;
  const saved = localStorage.getItem(OVERVIEW_DASHBOARD_CATEGORY_KEY);
  if (saved && VALID_CATEGORIES.includes(saved as OverviewDashboardCategory)) return saved as OverviewDashboardCategory;
  return DEFAULT_CATEGORY;
}

/**
 * Хук для управления состоянием вкладок страницы обзор.
 * Начальная вкладка читается из localStorage сразу при инициализации, чтобы при открытии вкладки SLA не отправлялись запросы плана закупок.
 */
export function useOverview() {
  const [activeTopTab, setActiveTopTabState] = useState<OverviewTopTab>(getInitialTopTab);
  const [activeDashboardCategory, setActiveDashboardCategoryState] = useState<OverviewDashboardCategory>(getInitialCategory);
  const [activeTab, setActiveTabState] = useState<OverviewTab>(getInitialTab);

  const setActiveTopTab = (tab: OverviewTopTab) => {
    setActiveTopTabState(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem(OVERVIEW_TOP_TAB_KEY, tab);
    }
  };

  const setActiveDashboardCategory = (category: OverviewDashboardCategory) => {
    setActiveDashboardCategoryState(category);
    if (typeof window !== 'undefined') {
      localStorage.setItem(OVERVIEW_DASHBOARD_CATEGORY_KEY, category);
    }
    // Автоматически переключаем на первую вкладку категории
    const tabs = DASHBOARD_CATEGORY_TABS[category];
    if (tabs.length > 0) {
      setActiveTabState(tabs[0]);
      if (typeof window !== 'undefined') {
        localStorage.setItem(OVERVIEW_TAB_KEY, tabs[0]);
      }
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
    activeDashboardCategory,
    setActiveDashboardCategory,
    activeTab,
    setActiveTab,
  };
}
