/**
 * Типы для компонентов страницы обзор
 */

export type OverviewTopTab = 'dashboards' | 'management-reporting';

export type OverviewTab = 'sla' | 'purchase-plan' | 'csi' | 'ek' | 'approvals' | 'timelines' | 'savings';

export interface OverviewTabItem {
  id: OverviewTab;
  label: string;
}

export interface OverviewTopTabItem {
  id: OverviewTopTab;
  label: string;
}
