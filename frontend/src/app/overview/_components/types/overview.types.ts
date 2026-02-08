/**
 * Типы для компонентов страницы обзор
 */

export type OverviewTab = 'sla' | 'purchase-plan' | 'csi';

export interface OverviewTabItem {
  id: OverviewTab;
  label: string;
}
