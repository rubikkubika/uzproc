/**
 * Типы для компонентов страницы обзор
 */

export type OverviewTab = 'sla' | 'purchase-plan' | 'csi' | 'ek' | 'approvals';

export interface OverviewTabItem {
  id: OverviewTab;
  label: string;
}
