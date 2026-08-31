import type { LucideIcon } from 'lucide-react';

/** Пункт бокового меню. Может содержать вложенные подпункты (subItems). */
export interface SidebarMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  isExternal?: boolean;
  route?: string;
  /** Вложенные подпункты — показываются под родителем, когда сайдбар развёрнут */
  subItems?: SidebarMenuItem[];
  /**
   * Пункт-группа: своей вкладки нет, клик только раскрывает список подпунктов.
   * В свёрнутом сайдбаре заголовок группы не показывается — там видны сразу подпункты.
   */
  isGroupOnly?: boolean;
}
