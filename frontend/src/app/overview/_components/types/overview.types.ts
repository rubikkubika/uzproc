/**
 * Типы для компонентов страницы обзор
 */

export type OverviewTopTab = 'dashboards' | 'management-reporting';

export type OverviewDashboardCategory = 'purchases' | 'contracts' | 'other';

export type OverviewTab = 'sla' | 'purchase-plan' | 'csi' | 'ek' | 'approvals' | 'timelines' | 'savings' | 'contract-remarks';

export interface OverviewTabItem {
  id: OverviewTab;
  label: string;
}

export interface OverviewTopTabItem {
  id: OverviewTopTab;
  label: string;
}

export interface OverviewDashboardCategoryItem {
  id: OverviewDashboardCategory;
  label: string;
}

export const DASHBOARD_CATEGORY_TABS: Record<OverviewDashboardCategory, OverviewTab[]> = {
  purchases: ['sla', 'purchase-plan', 'csi', 'ek', 'savings'],
  contracts: ['contract-remarks'],
  other: ['approvals', 'timelines'],
};
