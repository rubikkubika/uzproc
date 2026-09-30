/**
 * Типы для компонентов страницы обзор
 */

export type OverviewTopTab = 'dashboards' | 'management-reporting';

export type OverviewDashboardCategory = 'purchases' | 'contracts' | 'deliveries' | 'other';

export type OverviewTab = 'sla' | 'purchase-plan' | 'csi' | 'ek' | 'approvals' | 'timelines' | 'savings' | 'contract-sla' | 'contract-remarks' | 'contract-documents-count' | 'contract-approvals' | 'purchases-by-cfo' | 'purchaser-distribution' | 'contract-states-in-work' | 'kpi' | 'kpi2' | 'delivery-pulse' | 'delivery-responsible' | 'delivery-discipline' | 'delivery-finance';

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
  purchases: ['sla', 'purchase-plan', 'csi', 'ek', 'savings', 'kpi', 'kpi2'],
  contracts: ['contract-sla', 'contract-remarks', 'contract-documents-count', 'contract-approvals'],
  deliveries: ['delivery-pulse', 'delivery-responsible', 'delivery-discipline', 'delivery-finance'],
  other: ['approvals', 'timelines', 'purchases-by-cfo', 'purchaser-distribution', 'contract-states-in-work'],
};

/** Вкладки, доступные только пользователю с логином admin. */
export const ADMIN_LOGIN_ONLY_TABS: OverviewTab[] = ['kpi2'];
