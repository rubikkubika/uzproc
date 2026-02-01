/**
 * Типы для компонентов страницы обзор
 */

export type OverviewTab = 'purchase-plan' | 'csi';

export interface OverviewTabItem {
  id: OverviewTab;
  label: string;
}
