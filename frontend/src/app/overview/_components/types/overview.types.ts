/**
 * Типы для компонентов страницы обзор
 */

export type OverviewTopTab = 'dashboards' | 'management-reporting';

export type OverviewDashboardCategory = 'purchases' | 'contracts' | 'other';

export type OverviewTab = 'sla' | 'purchase-plan' | 'csi' | 'ek' | 'approvals' | 'timelines' | 'savings' | 'contract-remarks' | 'contract-documents-count' | 'contract-approvals' | 'purchases-by-cfo' | 'purchaser-distribution' | 'contract-states-in-work' | 'kpi';

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
  purchases: ['sla', 'purchase-plan', 'csi', 'ek', 'savings', 'kpi'],
  contracts: ['contract-remarks', 'contract-documents-count', 'contract-approvals'],
  other: ['approvals', 'timelines', 'purchases-by-cfo', 'purchaser-distribution', 'contract-states-in-work'],
};
